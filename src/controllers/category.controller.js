import logger from '#config/logger.js';
import { formatValidationError } from '#utils/format.js';
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
} from '#services/category.service.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
} from '#validations/category.validation.js';

export const createCategoryHandler = async (req, res) => {
  try {
    const validation = createCategorySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validation.error),
      });
    }

    const category = await createCategory(validation.data);
    return res.status(201).json({
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    if (error.message.includes('unique') || error.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Category with this slug/name already exists' });
    }
    if (error.message === 'Parent category not found') {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Failed to create category', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllCategoriesHandler = async (req, res) => {
  try {
    const isTree = req.query.tree === 'true';
    const result = await getAllCategories({ tree: isTree });
    return res.status(200).json({
      message: 'Categories retrieved successfully',
      categories: result,
      count: result.length,
    });
  } catch (error) {
    logger.error('Failed to get categories', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCategoryByIdOrSlugHandler = async (req, res) => {
  try {
    const { identifier } = req.params;
    const isNumeric = /^\d+$/.test(identifier);

    const category = isNumeric
      ? await getCategoryById(parseInt(identifier, 10))
      : await getCategoryBySlug(identifier);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    return res.status(200).json({
      message: 'Category retrieved successfully',
      category,
    });
  } catch (error) {
    logger.error('Failed to get category', {
      error,
      identifier: req.params.identifier,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCategoryHandler = async (req, res) => {
  try {
    const idValidation = categoryIdSchema.safeParse(req.params);
    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = updateCategorySchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const updated = await updateCategory(
      idValidation.data.id,
      bodyValidation.data
    );
    return res.status(200).json({
      message: 'Category updated successfully',
      category: updated,
    });
  } catch (error) {
    if (
      error.message === 'Category not found' ||
      error.message === 'Parent category not found'
    ) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('unique') || error.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Category with this slug/name already exists' });
    }
    logger.error('Failed to update category', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCategoryHandler = async (req, res) => {
  try {
    const idValidation = categoryIdSchema.safeParse(req.params);
    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const deleted = await deleteCategory(idValidation.data.id);
    return res.status(200).json({
      message: 'Category deleted successfully',
      category: deleted,
    });
  } catch (error) {
    if (error.message === 'Category not found') {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Failed to delete category', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
};
