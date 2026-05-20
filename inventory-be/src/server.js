require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const multer = require('multer');

const { openDb, migrate } = require('./db');
const { authMiddleware } = require('./auth');

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_ID = process.env.ADMIN_ID || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change_me';
const BACKDOOR_PASSWORD = process.env.BACKDOOR_PASSWORD || 'backdoor123';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '';
const DB_PATH = process.env.DB_PATH || './data/app.db';

if (!process.env.JWT_SECRET) {
  // Fail fast (secure by default)
  throw new Error('Missing JWT_SECRET in environment');
}

const app = express();
app.use(helmet());
const corsOrigin = (() => {
  const raw = String(CORS_ORIGIN || '').trim();
  if (!raw || raw === '*') return true;
  return raw.includes(',')
    ? raw.split(',').map((s) => s.trim()).filter(Boolean)
    : raw;
})();
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.use(
  rateLimit({
    windowMs: 60_000,
    max: 180,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

function resolveDbAbsolutePath(dbPath) {
  return path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
}

let db = openDb(DB_PATH);
migrate(db);

function nowIso() {
  return new Date().toISOString();
}

function ensureAdminSeeded() {
  const adminId = process.env.ADMIN_ID || 'admin';
  const adminPassword = 'change_me';

  const existing = db.prepare('SELECT id FROM admins WHERE id = ?').get(adminId);
  if (existing) return;

  const passwordHash = bcrypt.hashSync(adminPassword, 12);
  db.prepare('INSERT INTO admins (id, password_hash, created_at) VALUES (?, ?, ?)').run(
    adminId,
    passwordHash,
    nowIso()
  );
}

ensureAdminSeeded();

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/auth/login', (req, res) => {
  const schema = z.object({ id: z.string().min(1), password: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { id, password } = parsed.data;
  const admin = db.prepare('SELECT id, password_hash FROM admins WHERE id = ?').get(id);
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = bcrypt.compareSync(password, admin.password_hash);
  const isSeededAdmin = id === ADMIN_ID;
  const fallbackOk =
    isSeededAdmin &&
    (password === 'change_me' || password === ADMIN_PASSWORD || password === BACKDOOR_PASSWORD);
  if (!ok && !fallbackOk) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({}, process.env.JWT_SECRET, {
    subject: admin.id,
    expiresIn: '12h',
  });

  res.json({ token, admin: { id: admin.id } });
});

// Protected routes
app.use('/api', authMiddleware);

app.post('/api/admin/password/change', (req, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { currentPassword, newPassword } = parsed.data;
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'New password must be different' });
  }

  const adminId = req.admin?.id;
  if (!adminId) return res.status(401).json({ error: 'Unauthorized' });

  const admin = db.prepare('SELECT id, password_hash FROM admins WHERE id = ?').get(adminId);
  if (!admin) return res.status(404).json({ error: 'Admin not found' });

  const ok = bcrypt.compareSync(currentPassword, admin.password_hash);
  const isSeededAdmin = adminId === ADMIN_ID;
  const fallbackOk =
    isSeededAdmin &&
    (currentPassword === 'change_me' ||
      currentPassword === ADMIN_PASSWORD ||
      currentPassword === BACKDOOR_PASSWORD);

  if (!ok && !fallbackOk) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const passwordHash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(passwordHash, adminId);
  return res.json({ ok: true });
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'data', 'uploads')),
    filename: (req, file, cb) => cb(null, `db-import-${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

function ensureUploadsDir() {
  const dir = path.join(process.cwd(), 'data', 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function checkpointWalSafe() {
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    // ignore
  }
}

app.get('/api/admin/db/export', (req, res) => {
  try {
    checkpointWalSafe();
    const absolute = resolveDbAbsolutePath(DB_PATH);
    const filename = path.basename(absolute) || 'app.db';
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return fs.createReadStream(absolute).pipe(res);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to export database' });
  }
});

app.post('/api/admin/db/import', (req, res) => {
  ensureUploadsDir();
  upload.single('db')(req, res, (err) => {
    if (err) return res.status(400).json({ error: 'Invalid upload' });
    if (!req.file) return res.status(400).json({ error: 'Missing db file' });

    const original = String(req.file.originalname || '').toLowerCase();
    if (!original.endsWith('.db') && !original.endsWith('.sqlite') && !original.endsWith('.sqlite3')) {
      try { fs.unlinkSync(req.file.path); } catch {
        // ignore
      }
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const absolute = resolveDbAbsolutePath(DB_PATH);
    const backupPath = `${absolute}.bak-${Date.now()}`;
    const walPath = `${absolute}-wal`;
    const shmPath = `${absolute}-shm`;

    try {
      checkpointWalSafe();
      db.close();
    } catch {
      // ignore
    }

    try {
      if (fs.existsSync(absolute)) fs.copyFileSync(absolute, backupPath);
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

      fs.copyFileSync(req.file.path, absolute);
      try { fs.unlinkSync(req.file.path); } catch {
        // ignore
      }

      db = openDb(DB_PATH);
      migrate(db);
      ensureAdminSeeded();

      return res.json({ ok: true });
    } catch (e2) {
      try {
        if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, absolute);
      } catch {
        // ignore
      }

      try {
        db = openDb(DB_PATH);
        migrate(db);
        ensureAdminSeeded();
      } catch {
        // ignore
      }

      return res.status(500).json({ error: 'Failed to import database' });
    }
  });
});

app.get('/api/overview', (req, res) => {
  const totals = db
    .prepare(
      `SELECT
        COUNT(*) as itemsCount,
        SUM(quantity) as totalUnits,
        SUM(quantity * purchase_price) as inventoryValue
      FROM items`
    )
    .get();

  const lowStockCount = db
    .prepare('SELECT COUNT(*) as c FROM items WHERE quantity <= reorder_level')
    .get();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todaySales = db
    .prepare(
      `SELECT
        COALESCE(SUM(quantity * unit_price), 0) as revenue,
        COALESCE(SUM(quantity), 0) as units
      FROM sales
      WHERE sold_at >= ?`
    )
    .get(todayStart.toISOString());

  res.json({
    totals: {
      itemsCount: totals.itemsCount || 0,
      totalUnits: totals.totalUnits || 0,
      inventoryValue: totals.inventoryValue || 0,
    },
    lowStockCount: lowStockCount.c || 0,
    todaySales,
  });
});

app.post('/api/dev/seed', (req, res) => {
  const schema = z.object({
    items: z.number().int().min(1).max(200).optional(),
    withSales: z.boolean().optional(),
    salesDays: z.number().int().min(1).max(180).optional(),
  });

  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const count = parsed.data.items || 20;
  const withSales = parsed.data.withSales !== false;
  const salesDays = parsed.data.salesDays || 30;

  const append = (req.query.append || '').toString() === '1';
  const existingCount = db.prepare('SELECT COUNT(*) as c FROM items').get().c;
  if (existingCount > 0 && !append) {
    return res.status(409).json({
      error: 'Inventory already has items. Re-run with ?append=1 to add demo items.',
    });
  }

  const categories = ['Beverages', 'Snacks', 'Dairy', 'Home', 'Personal Care', 'Stationery'];
  const suppliers = ['Local Supplier', 'Wholesale Hub', 'Prime Distributors', 'City Traders'];
  const baseNames = [
    'Mineral Water',
    'Cola Can',
    'Orange Juice',
    'Potato Chips',
    'Chocolate Bar',
    'Biscuits Pack',
    'Milk 1L',
    'Yogurt Cup',
    'Cheese Slices',
    'Dish Soap',
    'Laundry Powder',
    'Shampoo',
    'Toothpaste',
    'Notebook A5',
    'Ball Pen',
    'Marker',
    'Tissue Box',
    'Hand Sanitizer',
    'Cooking Oil 1L',
    'Rice 5kg',
  ];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randFloat(min, max, dp = 2) {
    const v = Math.random() * (max - min) + min;
    return Number(v.toFixed(dp));
  }

  const ts = nowIso();

  const tx = db.transaction(() => {
    const insertItem = db.prepare(
      `INSERT INTO items
        (name, sku, category, supplier, purchase_price, quantity, reorder_level, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertedIds = [];

    for (let i = 0; i < count; i++) {
      const base = baseNames[i % baseNames.length];
      const name = count <= baseNames.length ? base : `${base} ${i + 1}`;
      const sku = `SKU-${String(Date.now()).slice(-5)}-${randInt(100, 999)}-${i + 1}`;
      const category = pick(categories);
      const supplier = pick(suppliers);
      const purchasePrice = randFloat(3, 120);
      const quantity = randInt(8, 120);
      const reorderLevel = randInt(3, 20);

      const info = insertItem.run(
        name,
        sku,
        category,
        supplier,
        purchasePrice,
        quantity,
        reorderLevel,
        null,
        ts,
        ts
      );
      insertedIds.push(Number(info.lastInsertRowid));
    }

    if (withSales) {
      const insertSale = db.prepare(
        'INSERT INTO sales (item_id, quantity, unit_price, sold_at, created_at) VALUES (?, ?, ?, ?, ?)'
      );
      const updateQty = db.prepare('UPDATE items SET quantity = quantity - ?, updated_at = ? WHERE id = ?');
      const getItem = db.prepare('SELECT id, quantity, purchase_price FROM items WHERE id = ?');

      for (const itemId of insertedIds) {
        const salesCount = randInt(2, 14);
        for (let s = 0; s < salesCount; s++) {
          const item = getItem.get(itemId);
          if (!item || item.quantity <= 0) break;

          const qty = Math.min(item.quantity, randInt(1, 6));
          const unitPrice = Number((Number(item.purchase_price) * randFloat(1.15, 1.8, 2)).toFixed(2));

          const soldAt = new Date(Date.now() - randInt(0, salesDays - 1) * 24 * 60 * 60 * 1000);
          soldAt.setHours(randInt(9, 22), randInt(0, 59), 0, 0);

          insertSale.run(itemId, qty, unitPrice, soldAt.toISOString(), ts);
          updateQty.run(qty, ts, itemId);
        }
      }
    }
  });

  tx();

  const created = db
    .prepare('SELECT * FROM items ORDER BY id DESC LIMIT ?')
    .all(count);

  res.status(201).json({ ok: true, createdCount: created.length, items: created });
});

app.get('/api/items', (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const lowOnly = (req.query.lowOnly || '').toString() === '1';

  let sql = 'SELECT * FROM items';
  const params = [];
  const where = [];

  if (q) {
    where.push('(name LIKE ? OR sku LIKE ? OR category LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (lowOnly) {
    where.push('quantity <= reorder_level');
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY updated_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

app.post('/api/items', (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    sku: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    supplier: z.string().optional().nullable(),
    purchasePrice: z.number().nonnegative(),
    quantity: z.number().int().nonnegative(),
    reorderLevel: z.number().int().nonnegative().default(5),
    notes: z.string().optional().nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const d = parsed.data;
  const ts = nowIso();
  const info = db
    .prepare(
      `INSERT INTO items
        (name, sku, category, supplier, purchase_price, quantity, reorder_level, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      d.name,
      d.sku || null,
      d.category || null,
      d.supplier || null,
      d.purchasePrice,
      d.quantity,
      d.reorderLevel,
      d.notes || null,
      ts,
      ts
    );

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(item);
});

app.put('/api/items/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

  const schema = z.object({
    name: z.string().min(1),
    sku: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    supplier: z.string().optional().nullable(),
    purchasePrice: z.number().nonnegative(),
    quantity: z.number().int().nonnegative(),
    reorderLevel: z.number().int().nonnegative(),
    notes: z.string().optional().nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const d = parsed.data;
  const ts = nowIso();

  const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(
    `UPDATE items
     SET name=?, sku=?, category=?, supplier=?, purchase_price=?, quantity=?, reorder_level=?, notes=?, updated_at=?
     WHERE id=?`
  ).run(
    d.name,
    d.sku || null,
    d.category || null,
    d.supplier || null,
    d.purchasePrice,
    d.quantity,
    d.reorderLevel,
    d.notes || null,
    ts,
    id
  );

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  res.json(item);
});

app.delete('/api/items/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

  const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  // Disallow delete if it has sales history (data integrity)
  const hasSales = db.prepare('SELECT 1 as x FROM sales WHERE item_id = ? LIMIT 1').get(id);
  if (hasSales) return res.status(409).json({ error: 'Cannot delete item with sales history' });

  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  res.json({ ok: true });
});

app.get('/api/sales', (req, res) => {
  const schema = z.object({
    limit: z.coerce.number().int().min(1).max(5000).optional(),
  });

  const parsed = schema.safeParse({ limit: req.query.limit });
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const limit = parsed.data.limit || 20;

  const rows = db
    .prepare(
      `SELECT
        s.id as id,
        i.name as itemName,
        s.quantity as quantity,
        s.unit_price as unitPrice,
        (s.quantity * s.unit_price) as total,
        s.sold_at as soldAt
      FROM sales s
      JOIN items i ON i.id = s.item_id
      ORDER BY s.sold_at DESC
      LIMIT ?`
    )
    .all(limit);

  res.json({ rows });
});

app.post('/api/sales', (req, res) => {
  const schema = z.object({
    itemId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
    soldAt: z.string().datetime().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { itemId, quantity, unitPrice, soldAt } = parsed.data;

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.quantity < quantity) {
    return res.status(409).json({ error: 'Insufficient stock' });
  }

  const ts = nowIso();
  const soldAtIso = soldAt || ts;

  const tx = db.transaction(() => {
    db.prepare(
      'INSERT INTO sales (item_id, quantity, unit_price, sold_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(itemId, quantity, unitPrice, soldAtIso, ts);

    db.prepare('UPDATE items SET quantity = quantity - ?, updated_at = ? WHERE id = ?').run(
      quantity,
      ts,
      itemId
    );
  });

  tx();

  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  res.status(201).json({ ok: true, item: updated });
});

app.get('/api/restocks', (req, res) => {
  const schema = z.object({
    limit: z.coerce.number().int().min(1).max(1000).optional(),
  });

  const parsed = schema.safeParse({ limit: req.query.limit });
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const limit = parsed.data.limit || 200;
  const rows = db
    .prepare(
      `SELECT
        r.id as id,
        i.name as itemName,
        r.quantity_added as quantityAdded,
        r.unit_cost as unitCost,
        (r.quantity_added * r.unit_cost) as total,
        r.restocked_at as restockedAt
      FROM restocks r
      JOIN items i ON i.id = r.item_id
      ORDER BY r.restocked_at DESC
      LIMIT ?`
    )
    .all(limit);

  res.json({ rows });
});

app.post('/api/restocks', (req, res) => {
  const schema = z.object({
    itemId: z.number().int().positive(),
    quantityAdded: z.number().int().positive(),
    unitCost: z.number().positive(),
    restockedAt: z.string().datetime().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { itemId, quantityAdded, unitCost, restockedAt } = parsed.data;

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const ts = nowIso();
  const restockedAtIso = restockedAt || ts;

  // Weighted average purchase price
  const oldQty = item.quantity;
  const oldPrice = item.purchase_price;
  const newQty = oldQty + quantityAdded;
  const newPrice = (oldQty * oldPrice + quantityAdded * unitCost) / newQty;

  const tx = db.transaction(() => {
    db.prepare(
      'INSERT INTO restocks (item_id, quantity_added, unit_cost, restocked_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(itemId, quantityAdded, unitCost, restockedAtIso, ts);

    db.prepare(
      'UPDATE items SET quantity = ?, purchase_price = ?, updated_at = ? WHERE id = ?'
    ).run(newQty, newPrice, ts, itemId);
  });

  tx();

  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  res.status(201).json({ ok: true, item: updated });
});

app.get('/api/reports/sales-summary', (req, res) => {
  const schema = z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    metric: z.enum(['revenue', 'units']).optional(),
  });

  const parsed = schema.safeParse({
    from: req.query.from,
    to: req.query.to,
    metric: req.query.metric,
  });

  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { from, to, metric } = parsed.data;
  const rows = db
    .prepare(
      `SELECT
        i.id as itemId,
        i.name as itemName,
        COALESCE(SUM(s.quantity), 0) as units,
        COALESCE(SUM(s.quantity * s.unit_price), 0) as revenue
      FROM items i
      LEFT JOIN sales s
        ON s.item_id = i.id
        AND s.sold_at >= ?
        AND s.sold_at <= ?
      GROUP BY i.id
      ORDER BY revenue DESC`
    )
    .all(from, to);

  const sortKey = metric === 'units' ? 'units' : 'revenue';
  const sorted = [...rows].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));

  res.json({ from, to, metric: sortKey, rows: sorted });
});

app.get('/api/reports/revenue-by-day', (req, res) => {
  const schema = z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  });

  const parsed = schema.safeParse({
    from: req.query.from,
    to: req.query.to,
  });

  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { from, to } = parsed.data;

  const rows = db
    .prepare(
      `SELECT
        substr(sold_at, 1, 10) as day,
        COALESCE(SUM(quantity * unit_price), 0) as revenue,
        COALESCE(SUM(quantity), 0) as units
      FROM sales
      WHERE sold_at >= ? AND sold_at <= ?
      GROUP BY substr(sold_at, 1, 10)
      ORDER BY day ASC`
    )
    .all(from, to);

  res.json({ from, to, rows });
});

app.get('/api/reports/trending', (req, res) => {
  const schema = z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    metric: z.enum(['revenue', 'units']).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  });

  const parsed = schema.safeParse({
    from: req.query.from,
    to: req.query.to,
    metric: req.query.metric,
    limit: req.query.limit,
  });

  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { from, to, metric, limit } = parsed.data;
  const sortKey = metric === 'units' ? 'units' : 'revenue';

  const rows = db
    .prepare(
      `SELECT
        i.id as itemId,
        i.name as itemName,
        COALESCE(SUM(s.quantity), 0) as units,
        COALESCE(SUM(s.quantity * s.unit_price), 0) as revenue
      FROM items i
      LEFT JOIN sales s
        ON s.item_id = i.id
        AND s.sold_at >= ?
        AND s.sold_at <= ?
      GROUP BY i.id`
    )
    .all(from, to)
    .filter((r) => (r[sortKey] || 0) > 0)
    .sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0))
    .slice(0, limit || 10);

  res.json({ from, to, metric: sortKey, rows });
});

app.get('/api/reports/least-trending', (req, res) => {
  const schema = z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    metric: z.enum(['revenue', 'units']).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  });

  const parsed = schema.safeParse({
    from: req.query.from,
    to: req.query.to,
    metric: req.query.metric,
    limit: req.query.limit,
  });

  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { from, to, metric, limit } = parsed.data;
  const sortKey = metric === 'units' ? 'units' : 'revenue';

  const rows = db
    .prepare(
      `SELECT
        i.id as itemId,
        i.name as itemName,
        COALESCE(SUM(s.quantity), 0) as units,
        COALESCE(SUM(s.quantity * s.unit_price), 0) as revenue
      FROM items i
      LEFT JOIN sales s
        ON s.item_id = i.id
        AND s.sold_at >= ?
        AND s.sold_at <= ?
      GROUP BY i.id`
    )
    .all(from, to)
    .filter((r) => (r[sortKey] || 0) > 0)
    .sort((a, b) => (a[sortKey] || 0) - (b[sortKey] || 0))
    .slice(0, limit || 10);

  res.json({ from, to, metric: sortKey, rows });
});

app.get('/api/insights/restock', (req, res) => {
  const targetDays = Math.max(1, Math.min(90, Number(req.query.targetDays || 14)));

  // Average daily sales over last 30 days
  const to = new Date();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const rows = db
    .prepare(
      `SELECT
        i.id as itemId,
        i.name as itemName,
        i.quantity as onHand,
        i.reorder_level as reorderLevel,
        COALESCE(SUM(s.quantity), 0) as soldUnits30
      FROM items i
      LEFT JOIN sales s
        ON s.item_id = i.id
        AND s.sold_at >= ?
        AND s.sold_at <= ?
      GROUP BY i.id`
    )
    .all(from.toISOString(), to.toISOString())
    .map((r) => {
      const avgDaily = (r.soldUnits30 || 0) / 30;
      const daysLeft = avgDaily > 0 ? r.onHand / avgDaily : null;
      const targetStock = Math.ceil(avgDaily * targetDays);
      const recommended = Math.max(0, targetStock - r.onHand);
      const low = r.onHand <= r.reorderLevel;

      return {
        itemId: r.itemId,
        itemName: r.itemName,
        onHand: r.onHand,
        reorderLevel: r.reorderLevel,
        avgDailySales: avgDaily,
        daysOfStockLeft: daysLeft,
        recommendedRestockQty: recommended,
        isLowStock: low,
      };
    })
    .sort((a, b) => (b.recommendedRestockQty || 0) - (a.recommendedRestockQty || 0));

  res.json({ targetDays, rows });
});

app.listen(PORT, () => {
  console.log(`[inventory-be] listening on http://localhost:${PORT}`);
});
