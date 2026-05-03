const express = require('express');
const router = express.Router();
const {
  getAllProducts, getProductById, createProduct, updateProduct, deleteProduct
} = require('../controllers/productController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', authenticate, authorizeAdmin, createProduct);
router.put('/:id', authenticate, authorizeAdmin, updateProduct);
router.delete('/:id', authenticate, authorizeAdmin, deleteProduct);

module.exports = router;
