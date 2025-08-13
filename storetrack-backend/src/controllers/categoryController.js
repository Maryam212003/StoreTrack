import prisma from '../prisma/prismaClient.js';

async function getCategoryWithChildren(id) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { children: true },
  });

  if (!category) return null;

  // Recursively fetch each child's children
  const childrenWithNested = [];
  for (const child of category.children) {
    const nestedChild = await getCategoryWithChildren(child.id);
    if (nestedChild) childrenWithNested.push(nestedChild);
  }

  return { ...category, children: childrenWithNested };
}

// Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const topCategories = await prisma.category.findMany({
      where: { parentId: null },
    });

    const fullTree = [];
    for (const cat of topCategories) {
      const nestedCat = await getCategoryWithChildren(cat.id);
      if (nestedCat) fullTree.push(nestedCat);
    }

    res.json(fullTree);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// GET category by ID (with children)
export const getCategoryById = async (req, res) => {
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
};
