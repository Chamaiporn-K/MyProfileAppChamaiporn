require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3012;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// MySQL Connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+07:00"
});

// Linux MySQL is case-sensitive — actual table name is `Products`
const PRODUCTS_TABLE = 'Products';

function getComputedStatus(stock) {
  const numericStock = Number(stock ?? 0);
  if (numericStock <= 0) return 'Out of Stock';
  if (numericStock < 20) return 'Low Stock';
  return 'In Stock';
}

function isUnknownColumn(err) {
  return err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054);
}

(async function testMySQL(){
  try{
    const conn = await pool.getConnection();
    console.log('Connected to MySQL:', process.env.DB_NAME);
    conn.release();
  }catch(err){
    console.error('MySQL Failed:', err);
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
})();

// Get products (optionally searched and paginated).
app.get('/api/products', async(req,res)=>{
  try{
    const query = String(req.query.q ?? '').trim();
    const parsedPage = Number.parseInt(String(req.query.page ?? '1'), 10);
    const parsedLimit = Number.parseInt(String(req.query.limit ?? '50'), 10);
    const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
    const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 50;
    const offset = (page - 1) * limit;
    const searchableColumns = ['Productcode', 'Name', 'Category', 'details', 'color', 'size', 'Location'];
    const whereClause = query
      ? `WHERE ${searchableColumns.map((column) => `COALESCE(\`${column}\`, '') LIKE ?`).join(' OR ')}`
      : '';
    const searchParams = query ? searchableColumns.map(() => `%${query}%`) : [];

    const selectWithLink = `SELECT
        Productcode AS id,
        Name AS name,
        IFNULL(details, '') AS details,
        IFNULL(color, '') AS color,
        IFNULL(size, '') AS size,
        Category AS category,
        Stock AS stock,
        CONCAT(Stock, ' in stock') AS stock_text,
        1 AS location_count,
        IFNULL(Location, '') AS location_text,
        IFNULL(image, '') AS image_url,
        IFNULL(ProductLink, '') AS product_link
      FROM \`${PRODUCTS_TABLE}\`
      ${whereClause}
      ORDER BY LastUpdate DESC
      LIMIT ? OFFSET ?`;

    const selectLegacy = `SELECT
        Productcode AS id,
        Name AS name,
        IFNULL(details, '') AS details,
        IFNULL(color, '') AS color,
        IFNULL(size, '') AS size,
        Category AS category,
        Stock AS stock,
        CONCAT(Stock, ' in stock') AS stock_text,
        1 AS location_count,
        IFNULL(Location, '') AS location_text,
        IFNULL(image, '') AS image_url
      FROM \`${PRODUCTS_TABLE}\`
      ${whereClause}
      ORDER BY LastUpdate DESC
      LIMIT ? OFFSET ?`;

    let rows;
    try {
      [rows] = await pool.query(selectWithLink, [...searchParams, limit, offset]);
    } catch (e) {
      if (!isUnknownColumn(e)) throw e;
      [rows] = await pool.query(selectLegacy, [...searchParams, limit, offset]);
      rows = rows.map((row) => ({ ...row, product_link: '' }));
    }

    const [totalRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM \`${PRODUCTS_TABLE}\` ${whereClause}`,
      searchParams
    );

    const mappedRows = (rows || []).map((row) => ({
      ...row,
      badge_status: getComputedStatus(row.stock ?? row.Stock ?? 0),
      stock_text: row.stock_text ?? `${Number(row.stock ?? row.Stock ?? 0)} in stock`,
      product_link: row.product_link ?? '',
    }));

    res.json({ items: mappedRows, total: Number(totalRows[0]?.total ?? 0), page, limit });
  } catch (e) {
    console.error('Products Error:', e.message || e);
    res.status(500).json({ error: 'Failed to fetch products: ' + (e.message || 'Unknown error') });
  }
});

// Get categories from the Products table with product and stock totals.
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        COALESCE(NULLIF(TRIM(Category), ''), 'Uncategorized') AS id,
        COALESCE(NULLIF(TRIM(Category), ''), 'Uncategorized') AS name,
        COUNT(*) AS count,
        COALESCE(SUM(Stock), 0) AS stock_total
      FROM \`${PRODUCTS_TABLE}\`
      GROUP BY COALESCE(NULLIF(TRIM(Category), ''), 'Uncategorized')
      ORDER BY count DESC, name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Categories Error:', err.message || err);
    res.status(500).json({ error: 'Failed to fetch categories: ' + (err.message || 'Unknown error') });
  }
});

// Add product
app.post('/api/products', async (req, res) => {
  try {
    const body = req.body || {};
    const {
      id,
      name,
      details = '',
      color = null,
      size = '',
      stock = 0,
      category = null,
      location_text = null,
      image_url = null,
      product_link = null,
    } = body;

    if (!id || !name) return res.status(400).json({ error: 'Missing id or name' });

    const sqlWithLink = `INSERT INTO \`${PRODUCTS_TABLE}\` (Productcode, Name, details, color, size, Stock, Category, Location, image, ProductLink, LastUpdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
    const sqlLegacy = `INSERT INTO \`${PRODUCTS_TABLE}\` (Productcode, Name, details, color, size, Stock, Category, Location, image, LastUpdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
    const paramsWithLink = [id, name, details || '', color, size || '', Number(stock) || 0, category, location_text, image_url, product_link];
    const paramsLegacy = [id, name, details || '', color, size || '', Number(stock) || 0, category, location_text, image_url];

    try {
      await pool.query(sqlWithLink, paramsWithLink);
    } catch (insertErr) {
      if (!isUnknownColumn(insertErr)) throw insertErr;
      await pool.query(sqlLegacy, paramsLegacy);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Add Product Error:', err.message || err);
    res.status(500).json({ error: 'Failed to add product: ' + (err.message || 'Unknown error') });
  }
});

// Edit product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const {
      name,
      details = '',
      color = null,
      size = '',
      stock = 0,
      category = null,
      location_text = null,
      image_url = null,
      product_link = null,
    } = body;

    if (!name) return res.status(400).json({ error: 'Missing name' });

    const sqlWithLink = `UPDATE \`${PRODUCTS_TABLE}\` SET Name = ?, details = ?, color = ?, size = ?, Stock = ?, Category = ?, Location = ?, image = ?, ProductLink = ?, LastUpdate = NOW() WHERE Productcode = ?`;
    const sqlLegacy = `UPDATE \`${PRODUCTS_TABLE}\` SET Name = ?, details = ?, color = ?, size = ?, Stock = ?, Category = ?, Location = ?, image = ?, LastUpdate = NOW() WHERE Productcode = ?`;
    const paramsWithLink = [name, details || '', color, size || '', Number(stock) || 0, category, location_text, image_url, product_link, id];
    const paramsLegacy = [name, details || '', color, size || '', Number(stock) || 0, category, location_text, image_url, id];

    let result;
    try {
      [result] = await pool.query(sqlWithLink, paramsWithLink);
    } catch (updateErr) {
      if (!isUnknownColumn(updateErr)) throw updateErr;
      [result] = await pool.query(sqlLegacy, paramsLegacy);
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update Product Error:', err.message || err);
    res.status(500).json({ error: 'Failed to update product: ' + (err.message || 'Unknown error') });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      `DELETE FROM \`${PRODUCTS_TABLE}\` WHERE Productcode = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete Product Error:', err.message || err);
    res.status(500).json({ error: 'Failed to delete product: ' + (err.message || 'Unknown error') });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 API running on port ${port}`);
});
app.get("/api", (req, res) => {
  res.send("API is running");
});
