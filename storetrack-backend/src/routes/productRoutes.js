import express from 'express';
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  searchProducts,
  updateStock,
  expireProduct
} from '../controllers/productController.js';

const router = express.Router();

router.post('/addNewProduct', createProduct);
router.get('/allProducts', getAllProducts);
router.get('/:id', getProductById);
router.put('/update/:id', updateProduct);
router.post('/searchProduct', searchProducts);
router.patch('/:id/stock', updateStock);
router.post('/:id/expire', expireProduct);

export default router;
