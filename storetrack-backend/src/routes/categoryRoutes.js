import express from 'express';
import prisma from '../prisma/prismaClient.js';

const router = express.Router();

// GET all categories (with children)
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        children: true
      }
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET category by ID (with children)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: { children: true }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
