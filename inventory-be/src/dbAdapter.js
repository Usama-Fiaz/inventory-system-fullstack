const path = require('path');

const { openDb: openSqliteDb, migrate: migrateSqlite } = require('./db');

function countPlaceholders(sql) {
  let count = 0;
  for (let i = 0; i < sql.length; i++) {
    if (sql[i] === '?') count++;
  }
  return count;
}

function toPgSql(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => {
    idx += 1;
    return `$${idx}`;
  });
}

function isReturnableInsert(sql) {
  return /^\s*insert\s+into\s+/i.test(sql) && !/\breturning\b/i.test(sql);
}

function normalizeParams(params) {
  if (!params) return [];
  if (Array.isArray(params)) return params;
  return [params];
}

function createPostgresAdapter(databaseUrl) {
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  async function migrate() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT,
        category TEXT,
        supplier TEXT,
        purchase_price DOUBLE PRECISION NOT NULL,
        quantity INTEGER NOT NULL,
        reorder_level INTEGER NOT NULL DEFAULT 5,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES items(id),
        quantity INTEGER NOT NULL,
        unit_price DOUBLE PRECISION NOT NULL,
        sold_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS restocks (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL REFERENCES items(id),
        quantity_added INTEGER NOT NULL,
        unit_cost DOUBLE PRECISION NOT NULL,
        restocked_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);
      CREATE INDEX IF NOT EXISTS idx_sales_item_id ON sales(item_id);
      CREATE INDEX IF NOT EXISTS idx_items_qty ON items(quantity);
    `);
  }

  async function query(sql, params) {
    const p = normalizeParams(params);
    const out = await pool.query(toPgSql(sql), p);
    return out.rows;
  }

  async function queryOne(sql, params) {
    const rows = await query(sql, params);
    return rows[0] || null;
  }

  async function execute(sql, params) {
    const p = normalizeParams(params);
    const out = await pool.query(toPgSql(sql), p);
    return { rowCount: out.rowCount };
  }

  async function insertAndGetId(sql, params) {
    const p = normalizeParams(params);
    const finalSql = isReturnableInsert(sql) ? `${sql} RETURNING id` : sql;
    const out = await pool.query(toPgSql(finalSql), p);
    const id = out.rows?.[0]?.id;
    return typeof id === 'number' ? id : Number(id);
  }

  async function transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tx = {
        query: async (sql, params) => {
          const p = normalizeParams(params);
          const out = await client.query(toPgSql(sql), p);
          return out.rows;
        },
        queryOne: async (sql, params) => {
          const rows = await tx.query(sql, params);
          return rows[0] || null;
        },
        execute: async (sql, params) => {
          const p = normalizeParams(params);
          const out = await client.query(toPgSql(sql), p);
          return { rowCount: out.rowCount };
        },
        insertAndGetId: async (sql, params) => {
          const p = normalizeParams(params);
          const finalSql = isReturnableInsert(sql) ? `${sql} RETURNING id` : sql;
          const out = await client.query(toPgSql(finalSql), p);
          const id = out.rows?.[0]?.id;
          return typeof id === 'number' ? id : Number(id);
        },
      };

      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore
      }
      throw e;
    } finally {
      client.release();
    }
  }

  return {
    type: 'postgres',
    migrate,
    query,
    queryOne,
    execute,
    insertAndGetId,
    transaction,
    checkpointWalSafe: async () => {},
    close: async () => {
      await pool.end();
    },
  };
}

function createSqliteAdapter(dbPath) {
  const sqliteDb = openSqliteDb(dbPath);

  async function migrate() {
    migrateSqlite(sqliteDb);
  }

  async function query(sql, params) {
    const p = normalizeParams(params);
    return sqliteDb.prepare(sql).all(...p);
  }

  async function queryOne(sql, params) {
    const p = normalizeParams(params);
    return sqliteDb.prepare(sql).get(...p) || null;
  }

  async function execute(sql, params) {
    const p = normalizeParams(params);
    const info = sqliteDb.prepare(sql).run(...p);
    return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  }

  async function insertAndGetId(sql, params) {
    const res = await execute(sql, params);
    return Number(res.lastInsertRowid);
  }

  async function transaction(fn) {
    sqliteDb.exec('BEGIN');
    const tx = {
      query,
      queryOne,
      execute,
      insertAndGetId,
    };

    try {
      const result = await fn(tx);
      sqliteDb.exec('COMMIT');
      return result;
    } catch (e) {
      try {
        sqliteDb.exec('ROLLBACK');
      } catch {
        // ignore
      }
      throw e;
    }
  }

  async function checkpointWalSafe() {
    try {
      sqliteDb.pragma('wal_checkpoint(TRUNCATE)');
    } catch {
      // ignore
    }
  }

  return {
    type: 'sqlite',
    dbPath: path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath),
    migrate,
    query,
    queryOne,
    execute,
    insertAndGetId,
    transaction,
    checkpointWalSafe,
    close: async () => {
      try {
        sqliteDb.close();
      } catch {
        // ignore
      }
    },
  };
}

function createDbAdapter({ dbPath, databaseUrl }) {
  const url = String(databaseUrl || '').trim();
  if (url) {
    return createPostgresAdapter(url);
  }
  return createSqliteAdapter(dbPath);
}

module.exports = {
  createDbAdapter,
  countPlaceholders,
};
