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

let productsTableName = null;

async function discoverProductsTable() {
  if (productsTableName) return productsTableName;

  const schema = process.env.DB_NAME;
  const candidateNames = ['Products', 'products', 'Product', 'product'];

  try {
    const [rows] = await pool.query(
      `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND LOWER(TABLE_NAME) IN (?, ?, ?, ?)`,
      [schema, ...candidateNames.map((name) => name.toLowerCase())]
    );

    if (rows.length > 0) {
      productsTableName = rows[0].TABLE_NAME;
      console.log('Detected products table:', productsTableName);
      return productsTableName;
    }

    const [fallbackRows] = await pool.query(
      `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND TABLE_NAME LIKE ? LIMIT 1`,
      [schema, '%product%']
    );

    if (fallbackRows.length > 0) {
      productsTableName = fallbackRows[0].TABLE_NAME;
      console.log('Detected products-like table:', productsTableName);
      return productsTableName;
    }
  } catch (err) {
    console.error('Products table discovery failed:', err.message || err);
  }

  return null;
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
    const table = await discoverProductsTable();
    if (!table) {
      return res.status(500).json({ error: 'Products table not found in database.' });
    }

    const [rows] = await pool.query(`SELECT * FROM \`${table}\` ORDER BY LastUpdate DESC`);
    res.json(rows);
  }catch(e){
    console.error('Products Error:', e.message || e);
    res.status(500).json({ error:'Failed to fetch products: ' + (e.message || 'Unknown error') });
  }
});

// Get categories (distinct categories with counts)
app.get('/api/categories', async (req, res) => {
  try {
    const table = await discoverProductsTable();
    if (!table) {
      return res.status(500).json({ error: 'Products table not found in database.' });
    }

    const [rows] = await pool.query(
      `SELECT Category AS id, Category AS name, COUNT(*) AS count FROM \`${table}\` GROUP BY Category ORDER BY count DESC`
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

    const table = await discoverProductsTable();
    if (!table) {
      return res.status(500).json({ error: 'Products table not found in database.' });
    }

    // Map frontend field names to DB columns
    const Productcode = id;
    const Name = name;
    const Stock = Number(stock) || 0;
    const Category = category;
    const Location = location_text;
    const Status = badge_status;
    const image = image_url;

    const sql = `INSERT INTO \`${table}\` (Productcode, Name, Stock, Category, Location, Status, image, LastUpdate) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;
    await pool.query(sql, [Productcode, Name, Stock, Category, Location, Status, image]);

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