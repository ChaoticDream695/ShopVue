const pool = require('../config/database');

// GET /products — public
const getAllProducts = async (req, res, next) => {
  try {
    const { category_id, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];

    if (category_id) {
      params.push(parseInt(category_id));
      conditions.push(`p.category_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`p.product_name ILIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit));
    params.push(offset);

    const query = `
      SELECT p.*, pc.category_name
      FROM products p
      JOIN product_categories pc ON p.category_id = pc.category_id
      ${where}
      ORDER BY p.created_on DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const countQuery = `SELECT COUNT(*) FROM products p ${where}`;
    const countParams = params.slice(0, params.length - 2);

    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    res.json({
      products: rows,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    next(err);
  }
};

// GET /products/:id
const getProductById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, pc.category_name FROM products p
       JOIN product_categories pc ON p.category_id = pc.category_id
       WHERE p.product_id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /products — admin only
const createProduct = async (req, res, next) => {
  const { product_name, price, stock_quantity, category_id } = req.body;
  if (!product_name || price === undefined || stock_quantity === undefined || !category_id) {
    return res.status(400).json({ error: 'product_name, price, stock_quantity, category_id required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO products(product_name, price, stock_quantity, category_id)
       VALUES($1,$2,$3,$4) RETURNING *`,
      [product_name, price, stock_quantity, category_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /products/:id — admin only
const updateProduct = async (req, res, next) => {
  const { product_name, price, stock_quantity, category_id } = req.body;
  try {
    const { rows: existing } = await pool.query(
      'SELECT * FROM products WHERE product_id = $1', [req.params.id]
    );
    if (!existing[0]) return res.status(404).json({ error: 'Product not found' });

    const updated = {
      product_name: product_name || existing[0].product_name,
      price: price !== undefined ? price : existing[0].price,
      stock_quantity: stock_quantity !== undefined ? stock_quantity : existing[0].stock_quantity,
      category_id: category_id || existing[0].category_id,
    };

    const { rows } = await pool.query(
      `UPDATE products SET product_name=$1, price=$2, stock_quantity=$3, category_id=$4
       WHERE product_id=$5 RETURNING *`,
      [updated.product_name, updated.price, updated.stock_quantity, updated.category_id, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /products/:id — admin only
const deleteProduct = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM products WHERE product_id=$1 RETURNING product_id', [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted', product_id: rows[0].product_id });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct };
