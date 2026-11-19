import logger from '#config/logger.js';
import { db } from '#config/database.js';
import { categories } from '#models/category.model.js';
import { eq } from 'drizzle-orm';
import { slugify } from '#utils/slug.js';

export const buildCategoryTree = flatCategories => {
  const map = new Map();
  const roots = [];

  flatCategories.forEach(cat => {
    map.set(cat.id, { ...cat, children: [] });
  });

  flatCategories.forEach(cat => {
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId).children.push(map.get(cat.id));
    } else {
      roots.push(map.get(cat.id));
    }
  });

  return roots;
};

export const createCategory = async data => {
  try {
    const slug = data.slug ? slugify(data.slug) : slugify(data.name);

    // If parentId is specified, check that parent category exists
    if (data.parentId) {
      const parent = await getCategoryById(data.parentId);
      if (!parent) {
        throw new Error('Parent category not found');
      }
    }

    const [newCategory] = await db
      .insert(categories)
      .values({
        name: data.name,
        slug,
        description: data.description || null,
        parentId: data.parentId || null,
        image: data.image || null,
      })
      .returning();

    logger.info(
      `Category created: ${newCategory.name} (id: ${newCategory.id})`
    );
    return newCategory;
  } catch (error) {
    logger.error('Error creating category', { error, data });
    throw error;
  }
};

export const getAllCategories = async ({ tree = false } = {}) => {
  try {
    const allCategories = await db.select().from(categories);
    if (tree) {
      return buildCategoryTree(allCategories);
    }
    return allCategories;
  } catch (error) {
    logger.error('Error fetching categories', { error });
    throw error;
  }
};

export const getCategoryById = async id => {
  try {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    return category || null;
  } catch (error) {
    logger.error('Error fetching category by id', { error, id });
    throw error;
  }
};

export const getCategoryBySlug = async slug => {
  try {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    return category || null;
  } catch (error) {
    logger.error('Error fetching category by slug', { error, slug });
    throw error;
  }
};

export const updateCategory = async (id, updates) => {
  try {
    const existing = await getCategoryById(id);
    if (!existing) {
      throw new Error('Category not found');
    }

    const values = { ...updates, updatedAt: new Date() };
    if (values.name && !values.slug) {
      values.slug = slugify(values.name);
    } else if (values.slug) {
      values.slug = slugify(values.slug);
    }

    if (values.parentId) {
      if (values.parentId === id) {
        throw new Error('Category cannot be its own parent');
      }
      const parent = await getCategoryById(values.parentId);
      if (!parent) {
        throw new Error('Parent category not found');
      }
    }

    const [updated] = await db
      .update(categories)
      .set(values)
      .where(eq(categories.id, id))
      .returning();

    logger.info(`Category updated: ${id}`);
    return updated;
  } catch (error) {
    logger.error('Error updating category', { error, id });
    throw error;
  }
};

export const deleteCategory = async id => {
  try {
    const existing = await getCategoryById(id);
    if (!existing) {
      throw new Error('Category not found');
    }

    const [deleted] = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning();

    logger.info(`Category deleted: ${id}`);
    return deleted;
  } catch (error) {
    logger.error('Error deleting category', { error, id });
    throw error;
  }
};
