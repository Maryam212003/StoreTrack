import express from 'express';
import prisma from '../prisma/prismaClient.js';

const router = express.Router();

/**
 * Create Order
 */
router.post('/newOredr/', async (req, res) => {
  const { items, status } = req.body;

  try {
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Calculate totals
    let totalValue = 0;
    let totalItems = 0;

    const orderItemsData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });

      if (!product) return res.status(404).json({ error: `Product ${item.productId} not found` });

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Not enough stock for ${product.name}` });
      }

      const price = product.price;
      totalValue += price * item.quantity;
      totalItems += item.quantity;

      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        price
      });
    }

    // Create order & order items
    const order = await prisma.order.create({
      data: {
        status: status || 'PENDING',
        totalValue,
        totalItems,
        items: { create: orderItemsData }
      },
      include: { items: true }
    });

    // Update stock & create stock history
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } }
      });

      await prisma.stockHistory.create({
        data: {
          productId: item.productId,
          date: new Date(),
          type: 'OUT',
          quantity: item.quantity
        }
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * Get All Orders
 */
router.get('/getAll/', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: { include: { product: true } } }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * Get Single Order
 */
router.get('/getById/:id', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { items: { include: { product: true } } }
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

/**
 * Update Order Status
 */
router.patch('/:id/updateStatus', async (req, res) => {
  const { status } = req.body;
  try {
    const updated = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

/**
 * Search Orders
 */
router.post('/search', async (req, res) => {
  const { startDate, endDate, status, minValue, maxValue } = req.body;

  try {
    const orders = await prisma.order.findMany({
      where: {
        date: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined
        },
        status: status || undefined,
        totalValue: {
          gte: minValue || undefined,
          lte: maxValue || undefined
        }
      },
      include: { items: { include: { product: true } } }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search orders' });
  }
});

/**
 * Cancel Order (return stock)
 */
router.patch('/:id/cancelOrder', async (req, res) => {
  try {
    // Find order with items
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { items: true }
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status === 'CANCELED') {
      return res.status(400).json({ error: 'Order already canceled' });
    }
    

    // Return stock for each product
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } }
      });

      // Add stock history
      await prisma.stockHistory.create({
        data: {
          productId: item.productId,
          date: new Date(),
          type: 'IN',
          quantity: item.quantity
        }
      });
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELED' },
      include: { items: { include: { product: true } } }
    });

    res.json({
      message: 'Order canceled and stock returned',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error canceling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

export default router;
