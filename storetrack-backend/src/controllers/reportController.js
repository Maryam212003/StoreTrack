import prisma from '../prisma/prismaClient.js';


export const salesByProduct = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          AND: [
            startDate && { date: { gte: new Date(startDate) } },
            endDate && { date: { lte: new Date(endDate) } }
          ].filter(Boolean)
        }
      },
      include: { product: true, order: true }
    });


    const productSalesMap = {};
    orderItems.forEach(item => {
      const productId = item.product.id;
      if (!productSalesMap[productId]) {
        productSalesMap[productId] = {
          productId,
          productName: item.product.name,
          totalQuantity: 0,
          totalRevenue: 0
        };
      }
      productSalesMap[productId].totalQuantity += item.quantity;
      productSalesMap[productId].totalRevenue += item.price * item.quantity;
    });

    res.json(Object.values(productSalesMap));
  } catch (error) {
    console.error('Error generating sales by product:', error);
    res.status(500).json({ error: 'Failed to generate sales report by product' });
  }
};

export const salesByDate = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!['day', 'month', 'year'].includes(groupBy)) {
      return res.status(400).json({ error: 'groupBy must be day, month, or year' });
    }

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: dateFilter.gte || dateFilter.lte ? { date: dateFilter } : undefined
      },
      include: {
        product: true,
        order: true  // include order to access order.date
      }
    });

    const salesMap = {};
    orderItems.forEach(item => {
      const dateObj = new Date(item.order.date);
      let key;
      if (groupBy === 'day') {
        key = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === 'month') {
        key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      } else {
        key = `${dateObj.getFullYear()}`; // YYYY
      }

      if (!salesMap[key]) {
        salesMap[key] = { totalQuantity: 0, totalRevenue: 0 };
      }

      salesMap[key].totalQuantity += item.quantity;
      salesMap[key].totalRevenue += item.price * item.quantity;
    });

    const salesReport = Object.entries(salesMap).map(([date, data]) => ({
      date,
      totalQuantity: data.totalQuantity,
      totalRevenue: data.totalRevenue
    }));

    // Sort chronologically
    salesReport.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(salesReport);

  } catch (error) {
    console.error('Error generating sales by date:', error);
    res.status(500).json({ error: 'Failed to generate sales report by date' });
  }
};
