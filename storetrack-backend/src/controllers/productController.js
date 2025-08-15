import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create Product
export const createProduct = async (req, res) => {
  try {
    const { name, stock, price, categoryId } = req.body;
    if (!name || stock == null || !price || !categoryId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name,
          stock,
          price,
          categoryId,
          thruDate: null
        }
      });

      await tx.stockHistory.create({
        data: {
          productId: newProduct.id,
          quantity: stock,          
          type: 'IN',            
          date: new Date()
        }
      });

      return newProduct;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Get all active products
export const getAllProducts = async (req, res) => {
  try {
    const now = new Date();
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { thruDate: null },
          { thruDate: { gt: now } }
        ]
      },
      include: { category: true },
      orderBy: {price:"asc"}
    });

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get product by ID
export const getProductById = async (req, res) => {
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
};

export const updateProduct = async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, stock, price, categoryId, thruDate } = req.body;

  try {
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { name, stock, price, categoryId, thruDate },
    });

    if (stock !== undefined && stock !== existingProduct.stock) {
      const quantityChange = stock - existingProduct.stock;
      await prisma.stockHistory.create({
        data: {
          productId: id,
          type: quantityChange > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(quantityChange),
          date: new Date()
        }
      });
    }

    res.json(updatedProduct);

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Search product (including child categories)
export const searchProducts = async (req, res) => {
  try {
    const { name, categoryId, minPrice, maxPrice, isAvailable } = req.body;
    const filters = { AND: [{ thruDate: null }] };

    if (name) {
      filters.AND.push({ name: { contains: name, mode: 'insensitive' } });
    }

    // Handle category + children
    let categoryIds = [];
    if (categoryId) {
      const getAllChildCategoryIds = async (parentId) => {
        const children = await prisma.category.findMany({
          where: { parentId },
          select: { id: true }
        });
        let ids = children.map(c => c.id);
        for (let child of children) {
          ids = ids.concat(await getAllChildCategoryIds(child.id));
        }
        return ids;
      };

      categoryIds = [Number(categoryId), ...(await getAllChildCategoryIds(Number(categoryId)))];
      filters.AND.push({ categoryId: { in: categoryIds } });
    }

    // Price filters
    if (minPrice && maxPrice) {
      filters.AND.push({ price: { gte: Number(minPrice), lte: Number(maxPrice) } });
    } else if (minPrice) {
      filters.AND.push({ price: { gte: Number(minPrice) } });
    } else if (maxPrice) {
      filters.AND.push({ price: { lte: Number(maxPrice) } });
    }

    // Stock availability
    if (isAvailable === 'true') {
      filters.AND.push({ stock: { gt: 0 } });
    } else if (isAvailable === 'false') {
      filters.AND.push({ stock: { lte: 0 } });
    }

    const products = await prisma.product.findMany({
      where: filters,
      include: { category: true },
    });

    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Update stock
export const updateStock = async (req, res) => {
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
};

// Soft delete product
export const expireProduct = async (req, res) => {
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
};

// Get all low stock products (under 100)
export const getLowStockProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        stock: { lt: 100 },
        thruDate: null // only active products
      },
      include: {
        category: true
      }
    });

    res.json(products);
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({ error: 'Failed to fetch low stock products' });
  }
};
