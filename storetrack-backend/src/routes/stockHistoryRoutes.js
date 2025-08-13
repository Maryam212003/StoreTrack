import express from 'express';
import {
  createStockHistory,
  getStockHistoryByProductId,
  searchStockHistory
} from '../controllers/stockHistoryController.js';

const router = express.Router();

router.post('/newHistory', createStockHistory);
router.get('/getByProductId/:productId', getStockHistoryByProductId);
router.post('/search', searchStockHistory);

export default router;
