import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

/**
 * POST /products
 * Create a new product
 */
router.post('/addNewProduct', async (req, res) => {
  try {
    const { name, stock, price, categoryId } = req.body;

    if (!name || stock == null || !price || !categoryId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        stock,
        price,
        categoryId,
        thruDate: null
      }
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /products
 * Get all active products (thruDate is null or in the future)
 */
router.get('/allProducts', async (req, res) => {
  try {
    const now = new Date();

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { thruDate: null },
          { thruDate: { gt: now } }
        ]
      },
      include: {
        category: true 
      }
    });

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//get product by id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product || (product.thruDate && new Date(product.thruDate) <= new Date())) {
      return res.status(404).json({ error: 'Product not found or expired' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//update product
router.put('/update/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, stock, price, categoryId, thruDate } = req.body;

  try {
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { name, stock, price, categoryId, thruDate },
    });
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//get by filter
router.post('/searchProduct', async (req, res) => {
  try {
    const {name, categoryId, minPrice, maxPrice, isAvailable, } = req.body;

    const filters = {
      AND: [
        { thruDate: null },  // only active products
      ],
    };

    if (name) {
      filters.AND.push({
        name: {
          contains: name,
          mode: 'insensitive', // case insensitive search
        },
      });
    }

    if (categoryId) {
      filters.AND.push({
        categoryId: Number(categoryId),
      });
    }

    if (minPrice && maxPrice) {
      filters.AND.push({
        price: {
          gte: Number(minPrice),
          lte: Number(maxPrice),
        },
      });
    } else if (minPrice) {
      filters.AND.push({
        price: {
          gte: Number(minPrice),
        },
      });
    } else if (maxPrice) {
      filters.AND.push({
        price: {
          lte: Number(maxPrice),
        },
      });
    }

    if (isAvailable === 'true') {
      filters.AND.push({
        stock: {
          gt: 0,
        },
      });
    } else if (isAvailable === 'false') {
      // If explicitly false, show products with zero or less stock
      filters.AND.push({
        stock: {
          lte: 0,
        },
      });
    }

    const products = await prisma.product.findMany({
      where: filters,
      include: {
        category: true, // Include category info if you want
      },
    });

    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//update stock

router.patch('/:id/stock', async (req, res) => {
  const id = Number(req.params.id);
  const { stock } = req.body;

  if (stock === undefined) return res.status(400).json({ error: 'Stock is required' });

  try {
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { stock },
    });
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//soft delete by thruDate
router.post('/:id/expire', async (req, res) => {
  const id = Number(req.params.id);

  try {
    const expiredProduct = await prisma.product.update({
      where: { id },
      data: { thruDate: new Date() },
    });
    res.json({ message: 'Product expired successfully', product: expiredProduct });
  } catch (error) {
    console.error('Error expiring product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router;
