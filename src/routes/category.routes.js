import express from 'express';
import {
  createCategoryHandler,
  getAllCategoriesHandler,
  getCategoryByIdOrSlugHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from '#controllers/category.controller.js';
import { authenticate } from '#middleware/auth.middleware.js';
import { requireAdmin } from '#middleware/role.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllCategoriesHandler);
router.get('/:identifier', getCategoryByIdOrSlugHandler);

// Admin-only management routes
router.post('/', authenticate, requireAdmin, createCategoryHandler);
router.put('/:id', authenticate, requireAdmin, updateCategoryHandler);
router.delete('/:id', authenticate, requireAdmin, deleteCategoryHandler);

export default router;
