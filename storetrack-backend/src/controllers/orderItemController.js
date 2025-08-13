import prisma from '../prisma/prismaClient.js';

// Helper function to recalculate order totals
async function recalcOrder(orderId) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: { product: true }
  });

  const totalValue = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  await prisma.order.update({
    where: { id: orderId },
    data: { totalValue, totalItems }
  });
}

// Add item to order
export const addItemToOrder = async (req, res) => {
  try {
    const { orderId, productId, quantity } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'PENDING') return res.status(400).json({ error: 'Order is not editable' });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (!product.isAvailable || product.stock < quantity) {
      return res.status(400).json({ error: 'Not enough stock' });
    }

    const orderItem = await prisma.orderItem.create({
      data: { orderId, productId, quantity }
    });

    await prisma.product.update({
      where: { id: productId },
      data: { stock: product.stock - quantity }
    });

    await recalcOrder(orderId);

    res.json(orderItem);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
};

// Update quantity
export const updateOrderItemQuantity = async (req, res) => {
  try {
    const { quantity } = req.body;
    const itemId = parseInt(req.params.itemId);

    const orderItem = await prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!orderItem) return res.status(404).json({ error: 'Order item not found' });

    const order = await prisma.order.findUnique({ where: { id: orderItem.orderId } });
    if (order.status !== 'PENDING') return res.status(400).json({ error: 'Order is not editable' });

    const product = await prisma.product.findUnique({ where: { id: orderItem.productId } });

    await prisma.product.update({
      where: { id: product.id },
      data: { stock: product.stock + orderItem.quantity }
    });

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    if (!updatedProduct.isAvailable || updatedProduct.stock < quantity) {
      return res.status(400).json({ error: 'Not enough stock' });
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: { quantity }
    });

    await prisma.product.update({
      where: { id: product.id },
      data: { stock: updatedProduct.stock - quantity }
    });

    await recalcOrder(orderItem.orderId);

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
};

// Remove item
export const removeItemFromOrder = async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const orderItem = await prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!orderItem) return res.status(404).json({ error: 'Order item not found' });

    const order = await prisma.order.findUnique({ where: { id: orderItem.orderId } });
    if (order.status !== 'PENDING') return res.status(400).json({ error: 'Order is not editable' });

    await prisma.product.update({
      where: { id: orderItem.productId },
      data: { stock: { increment: orderItem.quantity } }
    });

    await prisma.orderItem.delete({ where: { id: itemId } });

    await recalcOrder(orderItem.orderId);

    res.json({ message: 'Item removed from order' });
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
};

// Get items by order
export const getOrderItems = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const items = await prisma.orderItem.findMany({
      where: { orderId },
      include: { product: true }
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching order items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};
