import express from 'express';
import { getAllCategories, getCategoryById } from '../controllers/categoryController.js';

const router = express.Router();

router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

export default router;
