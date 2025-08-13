import express from 'express';
import {
  addItemToOrder,
  updateOrderItemQuantity,
  removeItemFromOrder,
  getOrderItems
} from '../controllers/orderItemController.js';

const router = express.Router();

router.post('/addItem', addItemToOrder);
router.put('/updateQuantity/:id', updateOrderItemQuantity);
router.delete('/removeItem/:id', removeItemFromOrder);
router.get('/order/:orderId', getOrderItems);

export default router;
