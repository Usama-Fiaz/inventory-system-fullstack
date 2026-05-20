# Abdullah Store Management System (Inventory)

Abdullah Store Management System is a simple inventory and sales web app for small businesses.

It helps you:

- **Track stock** (what you have, what is low, what to reorder)
- **Record sales** (what was sold and when)
- **See reports** (top items, least selling items, trends)
- **Export to Excel** (keep records or share with your accountant)

---

## Pages (Simple Guide)

The app is designed for non-technical users. Each page focuses on one job, so you can work fast without confusion.

### Sign In

Key features:

- **Admin login** using your Admin ID and Password.
- Keeps you signed in securely until you log out.

How it helps you:

- Protects your store data.
- Prevents anyone else from changing items, sales, or reports.

---

### Dashboard

Key features:

- **Quick overview cards** (your stock and sales summary).
- **Low stock alerts** (items that are at/below reorder level).
- **Sales trend chart** so you can see performance at a glance.
- **Export Low Stock to Excel** for quick ordering or sharing.

How it helps you:

- You immediately know what needs attention today.
- Helps you reorder on time and avoid losing sales.

---

### Items

Key features:

- **Add new items** (name, SKU, category, supplier, purchase price, quantity, reorder level).
- **Edit items** when prices/stock details change.
- **Delete items** (only when it is safe for data integrity).
- **Search and filter** items (including low-stock-only view).
- **Restock** items (updates quantity and keeps purchase cost accurate).
- **Export Items to Excel**.
- **Export Restocks to Excel**.

How it helps you:

- Keeps your stock accurate.
- Reduces out-of-stock situations.
- Gives you clean item records for auditing and planning.

---

### Sales

Key features:

- Record a sale with:
  - **Item**
  - **Quantity**
  - **Unit price**
  - **Date/time**
- **Automatic stock deduction** (no manual stock updates needed).
- View **recent sales history**.
- **Export Sales to Excel**.

How it helps you:

- Prevents manual mistakes.
- Keeps all sales history in one place.
- Ensures inventory is always updated after a sale.

---

### Reports

Key features:

- Choose a **date range** (From / To).
- Switch metric:
  - **Revenue** (money earned)
  - **Units** (quantity sold)
- View charts for:
  - **Trending / Top performers**
  - **Least trending / Lowest performers**

How it helps you:

- Helps you understand what to buy more of.
- Helps you identify items that are not selling (so you can discount, bundle, or stop ordering).

---

### Insights

Key features:

- Restock suggestions based on **recent sales behavior**.
- Helps estimate what to restock so you can cover upcoming days.

How it helps you:

- Helps you plan inventory.
- Reduces the risk of running out of fast-moving items.

---

### Settings

Key features:

- **Currency selection**:
  - Dollar (USD)
  - Euro (EUR)
  - Pound (GBP)
  - PKR (PKR)
  - DHS (AED)
- **Backup & Restore (Advanced)**:
  - Export DB (download a backup)
  - Restore DB (upload a backup file) with safety confirmation

How it helps you:

- Your totals and prices show in your preferred currency.
- Backups protect your data if you change computers or need to recover.

---

## Typical Daily Workflow

- **Dashboard**: Check low stock.
- **Items**: Restock items that are low.
- **Sales**: Record sales during the day.
- **Reports**: Review weekly/monthly performance.

## Exporting to Excel

You can export:

- Items
- Restocks
- Sales
- Low stock list

This is useful for:

- Sharing with accountant
- Offline backup
- Quick analysis in Excel

---

## Running Locally (Developer)

This project has two parts:

- **Backend:** `inventory-be` (Node + SQLite)
- **Frontend:** `Untitled` (Vite + React)

### 1) Start backend

From `inventory-be`:

```bash
npm install
npm run dev
```

Backend runs on:

- `http://localhost:4000`

### 2) Start frontend

From `Untitled`:

```bash
npm install
npm run dev
```

Frontend runs on:

- `http://localhost:8001`