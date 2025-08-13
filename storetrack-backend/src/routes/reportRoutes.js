import express from 'express';
import {
    salesByDate,
    salesByProduct
} from '../controllers/reportController.js';

const router = express.Router();



//Sales Report by Product
router.get('/salesByProduct', salesByProduct);

//Sales Report by Date
router.get('/salesByDate', salesByDate);

export default router;
