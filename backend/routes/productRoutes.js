import express from 'express';
import {
  getProductByBarcode,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  scanProduct,
} from '../controllers/productController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/scan', protect, scanProduct);

router
  .route('/')
  .get(protect, getProducts)
  .post(protect, admin, createProduct);

router.get('/barcode/:barcode', protect, getProductByBarcode);

router
  .route('/:id')
  .put(protect, admin, updateProduct)
  .delete(protect, admin, deleteProduct);

export default router;
