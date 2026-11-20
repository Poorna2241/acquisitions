import express from 'express';
import {
  createBrandHandler,
  getAllBrandsHandler,
  getBrandByIdOrSlugHandler,
  updateBrandHandler,
  deleteBrandHandler,
} from '#controllers/brand.controller.js';
import { authenticate } from '#middleware/auth.middleware.js';
import { requireAdmin } from '#middleware/role.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllBrandsHandler);
router.get('/:identifier', getBrandByIdOrSlugHandler);

// Admin-only management routes
router.post('/', authenticate, requireAdmin, createBrandHandler);
router.put('/:id', authenticate, requireAdmin, updateBrandHandler);
router.delete('/:id', authenticate, requireAdmin, deleteBrandHandler);

export default router;
