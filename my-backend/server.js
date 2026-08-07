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

// Get products
app.get('/api/products', async(req,res)=>{
  try{
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
        IFNULL(Status, 'Active') AS badge_status,
        IFNULL(image, '') AS image_url,
        IFNULL(ProductLink, '') AS product_link
      FROM \`${PRODUCTS_TABLE}\`
      ORDER BY LastUpdate DESC`;

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
        IFNULL(Status, 'Active') AS badge_status,
        IFNULL(image, '') AS image_url
      FROM \`${PRODUCTS_TABLE}\`
      ORDER BY LastUpdate DESC`;

    let rows;
    try {
      [rows] = await pool.query(selectWithLink);
    } catch (e) {
      if (!isUnknownColumn(e)) throw e;
      [rows] = await pool.query(selectLegacy);
      rows = rows.map((row) => ({ ...row, product_link: '' }));
    }
    res.json(rows);
  }catch(e){
    console.error('Products Error:', e.message || e);
    res.status(500).json({ error:'Failed to fetch products: ' + (e.message || 'Unknown error') });
  }
});

// Get categories (distinct categories with counts)
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT Category AS id, Category AS name, COUNT(*) AS count FROM \`${PRODUCTS_TABLE}\` GROUP BY Category ORDER BY count DESC`
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
      badge_status = null,
      image_url = null,
      product_link = null,
    } = body;

    if (!id || !name) return res.status(400).json({ error: 'Missing id or name' });

    const sqlWithLink = `INSERT INTO \`${PRODUCTS_TABLE}\` (Productcode, Name, details, color, size, Stock, Category, Location, Status, image, ProductLink, LastUpdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
    const sqlLegacy = `INSERT INTO \`${PRODUCTS_TABLE}\` (Productcode, Name, details, color, size, Stock, Category, Location, Status, image, LastUpdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
    const paramsWithLink = [id, name, details || '', color, size || '', Number(stock) || 0, category, location_text, badge_status, image_url, product_link];
    const paramsLegacy = [id, name, details || '', color, size || '', Number(stock) || 0, category, location_text, badge_status, image_url];

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
      badge_status = null,
      image_url = null,
      product_link = null,
    } = body;

    if (!name) return res.status(400).json({ error: 'Missing name' });

    const sqlWithLink = `UPDATE \`${PRODUCTS_TABLE}\` SET Name = ?, details = ?, color = ?, size = ?, Stock = ?, Category = ?, Location = ?, Status = ?, image = ?, ProductLink = ?, LastUpdate = NOW() WHERE Productcode = ?`;
    const sqlLegacy = `UPDATE \`${PRODUCTS_TABLE}\` SET Name = ?, details = ?, color = ?, size = ?, Stock = ?, Category = ?, Location = ?, Status = ?, image = ?, LastUpdate = NOW() WHERE Productcode = ?`;
    const paramsWithLink = [name, details || '', color, size || '', Number(stock) || 0, category, location_text, badge_status, image_url, product_link, id];
    const paramsLegacy = [name, details || '', color, size || '', Number(stock) || 0, category, location_text, badge_status, image_url, id];

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

app.listen(port,'0.0.0.0',()=>{
  console.log(`🚀 API running on port ${port}`);
});
app.get("/api", (req, res) => {
  res.send("API is running");
});