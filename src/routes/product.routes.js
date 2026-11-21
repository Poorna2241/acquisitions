import express from 'express';
import {
  createProductHandler,
  getProductsHandler,
  getProductByIdOrSlugHandler,
  updateProductHandler,
  deleteProductHandler,
  createVariantHandler,
  updateVariantHandler,
  deleteVariantHandler,
} from '#controllers/product.controller.js';
import { authenticate } from '#middleware/auth.middleware.js';
import { requireAdmin } from '#middleware/role.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getProductsHandler);
router.get('/search', getProductsHandler);
router.get('/:identifier', getProductByIdOrSlugHandler);

// Admin-only product routes
router.post('/', authenticate, requireAdmin, createProductHandler);
router.put('/:id', authenticate, requireAdmin, updateProductHandler);
router.delete('/:id', authenticate, requireAdmin, deleteProductHandler);

// Admin-only product variant routes
router.post('/:id/variants', authenticate, requireAdmin, createVariantHandler);
router.put(
  '/:id/variants/:variantId',
  authenticate,
  requireAdmin,
  updateVariantHandler
);
router.delete(
  '/:id/variants/:variantId',
  authenticate,
  requireAdmin,
  deleteVariantHandler
);

export default router;
