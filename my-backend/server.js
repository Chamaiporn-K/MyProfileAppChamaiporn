require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3012;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

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
    const [rows] = await pool.query(
      `SELECT
        Productcode AS id,
        Name AS name,
        Category AS category,
        Stock AS stock,
        CONCAT(Stock, ' in stock') AS stock_text,
        1 AS location_count,
        IFNULL(Location, '') AS location_text,
        IFNULL(Status, 'Active') AS badge_status,
        IFNULL(image, '') AS image_url
      FROM \`${PRODUCTS_TABLE}\`
      ORDER BY LastUpdate DESC`
    );
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
      stock = 0,
      category = null,
      location_text = null,
      badge_status = null,
      image_url = null,
    } = body;

    if (!id || !name) return res.status(400).json({ error: 'Missing id or name' });

    const sql = `INSERT INTO \`${PRODUCTS_TABLE}\` (Productcode, Name, Stock, Category, Location, Status, image, LastUpdate) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;
    await pool.query(sql, [id, name, Number(stock) || 0, category, location_text, badge_status, image_url]);

    res.json({ success: true });
  } catch (err) {
    console.error('Add Product Error:', err.message || err);
    res.status(500).json({ error: 'Failed to add product: ' + (err.message || 'Unknown error') });
  }
});

app.listen(port,'0.0.0.0',()=>{
  console.log(`🚀 API running on port ${port}`);
});
app.get("/api", (req, res) => {
  res.send("API is running");
});