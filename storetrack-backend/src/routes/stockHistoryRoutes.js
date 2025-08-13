import express from 'express';
import {
  createStockHistory,
  getStockHistoryByProductId,
  searchStockHistory
} from '../controllers/stockHistoryController.js';

const router = express.Router();

router.post('/newHistory', createStockHistory); //not used
router.get('/getByProductId/:productId', getStockHistoryByProductId); //not used
router.post('/search', searchStockHistory);

export default router;
