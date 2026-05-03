const express = require('express');
const router = express.Router();
const { createOrder, getOrders, getOrderById, updateOrderStatus } = require('../controllers/orderController');
const { authenticate, authorizeAdmin, authorizeCustomer } = require('../middleware/auth');

router.post('/', authenticate, authorizeCustomer, createOrder);
router.get('/', authenticate, getOrders);
router.get('/:id', authenticate, getOrderById);
router.patch('/:id/status', authenticate, authorizeAdmin, updateOrderStatus);

module.exports = router;
