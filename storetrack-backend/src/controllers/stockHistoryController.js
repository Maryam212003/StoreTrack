import prisma from '../prisma/prismaClient.js';

// Add new stock history record + update product stock
export const createStockHistory = async (req, res) => {
  try {
    const { productId, type, date, quantity } = req.body;

    if (!productId || !type || !quantity) {
      return res.status(400).json({ error: 'productId, type, and quantity are required' });
    }

    // Validate product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Create history record
    const history = await prisma.stockHistory.create({
      data: {
        productId,
        type,
        quantity,
        date: date ? new Date(date) : undefined
      }
    });

    // Update product stock
    let newStock = product.stock;
    if (type === 'IN') {
      newStock += quantity;
    } else if (type === 'OUT') {
      if (product.stock < quantity) {
        return res.status(400).json({ error: 'Not enough stock' });
      }
      newStock -= quantity;
    }

    await prisma.product.update({
      where: { id: productId },
      data: { stock: newStock }
    });

    res.status(201).json({ history, updatedStock: newStock });
  } catch (error) {
    console.error('Error creating stock history:', error);
    res.status(500).json({ error: 'Failed to create stock history' });
  }
};

// Get stock history for a product
export const getStockHistoryByProductId = async (req, res) => {
  try {
    const { productId } = req.params;

    const history = await prisma.stockHistory.findMany({
      where: { productId: parseInt(productId) },
      orderBy: { date: 'desc' },
    });

    res.json(history);
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ error: 'Failed to fetch stock history' });
  }
};

// Filter stock history
export const searchStockHistory = async (req, res) => {
  try {
    const { productId, type, startDate, endDate } = req.body;

    const filters = {};
    if (productId) filters.productId = productId;
    if (type) filters.type = type;
    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.gte = new Date(startDate);
      if (endDate) filters.date.lte = new Date(endDate);
    }

    const history = await prisma.stockHistory.findMany({
      where: filters,
      orderBy: { date: 'desc' },
    });

    res.json(history);
  } catch (error) {
    console.error('Error filtering stock history:', error);
    res.status(500).json({ error: 'Failed to filter stock history' });
  }
};
