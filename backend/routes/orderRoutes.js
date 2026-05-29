import express from 'express';
import { getMyOrders, getOrderById, getOrders } from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, admin, getOrders);
router.get('/me', protect, getMyOrders);
router.get('/:id', protect, getOrderById);

export default router;
