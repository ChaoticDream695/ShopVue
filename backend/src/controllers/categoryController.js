const pool = require('../config/database');

const getAllCategories = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM product_categories ORDER BY category_name'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM product_categories WHERE category_id = $1', [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Category not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const createCategory = async (req, res, next) => {
  const { category_name, category_description } = req.body;
  if (!category_name) {
    return res.status(400).json({ error: 'category_name is required' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO product_categories(category_name, category_description) VALUES($1,$2) RETURNING *',
      [category_name, category_description || 'No description']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateCategory = async (req, res, next) => {
  const { category_name, category_description } = req.body;
  try {
    const { rows: existing } = await pool.query(
      'SELECT * FROM product_categories WHERE category_id = $1', [req.params.id]
    );
    if (!existing[0]) return res.status(404).json({ error: 'Category not found' });

    const { rows } = await pool.query(
      `UPDATE product_categories SET category_name=$1, category_description=$2
       WHERE category_id=$3 RETURNING *`,
      [
        category_name || existing[0].category_name,
        category_description !== undefined ? category_description : existing[0].category_description,
        req.params.id
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM product_categories WHERE category_id=$1 RETURNING category_id', [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted', category_id: rows[0].category_id });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory };
