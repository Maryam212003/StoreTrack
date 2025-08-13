import express from 'express';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  searchOrders,
  cancelOrder
} from '../controllers/orderController.js';

const router = express.Router();

router.post('/newOrder', createOrder);
router.get('/getAll', getAllOrders);
router.get('/getById/:id', getOrderById);
router.patch('/:id/updateStatus', updateOrderStatus);
router.post('/search', searchOrders);
router.patch('/:id/cancelOrder', cancelOrder);

export default router;
