import logger from '#config/logger.js';
import { formatValidationError } from '#utils/format.js';
import {
  createProduct,
  getProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
} from '#services/product.service.js';
import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  createVariantSchema,
  updateVariantSchema,
  variantIdParamSchema,
  queryProductsSchema,
} from '#validations/product.validation.js';

export const createProductHandler = async (req, res) => {
  try {
    const validation = createProductSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validation.error),
      });
    }

    const product = await createProduct(validation.data);
    return res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    if (error.message.includes('unique') || error.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Product with this SKU or slug already exists' });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Failed to create product', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProductsHandler = async (req, res) => {
  try {
    const validation = queryProductsSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validation.error),
      });
    }

    const result = await getProducts(validation.data);
    return res.status(200).json({
      message: 'Products retrieved successfully',
      ...result,
    });
  } catch (error) {
    logger.error('Failed to query products', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProductByIdOrSlugHandler = async (req, res) => {
  try {
    const { identifier } = req.params;
    const isNumeric = /^\d+$/.test(identifier);

    const product = isNumeric
      ? await getProductById(parseInt(identifier, 10))
      : await getProductBySlug(identifier);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json({
      message: 'Product retrieved successfully',
      product,
    });
  } catch (error) {
    logger.error('Failed to get product', {
      error,
      identifier: req.params.identifier,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProductHandler = async (req, res) => {
  try {
    const idValidation = productIdSchema.safeParse(req.params);
    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = updateProductSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const updated = await updateProduct(
      idValidation.data.id,
      bodyValidation.data
    );
    return res.status(200).json({
      message: 'Product updated successfully',
      product: updated,
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('unique') || error.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Product with this SKU or slug already exists' });
    }
    logger.error('Failed to update product', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProductHandler = async (req, res) => {
  try {
    const idValidation = productIdSchema.safeParse(req.params);
    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const deleted = await deleteProduct(idValidation.data.id);
    return res.status(200).json({
      message: 'Product deleted successfully',
      product: deleted,
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Failed to delete product', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createVariantHandler = async (req, res) => {
  try {
    const idValidation = productIdSchema.safeParse(req.params);
    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = createVariantSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const variant = await createProductVariant(
      idValidation.data.id,
      bodyValidation.data
    );
    return res.status(201).json({
      message: 'Product variant created successfully',
      variant,
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('unique') || error.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Variant with this SKU already exists' });
    }
    logger.error('Failed to create variant', {
      error,
      productId: req.params.id,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateVariantHandler = async (req, res) => {
  try {
    const paramValidation = variantIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(paramValidation.error),
      });
    }

    const bodyValidation = updateVariantSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const updated = await updateProductVariant(
      paramValidation.data.id,
      paramValidation.data.variantId,
      bodyValidation.data
    );

    return res.status(200).json({
      message: 'Product variant updated successfully',
      variant: updated,
    });
  } catch (error) {
    if (error.message === 'Product variant not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('unique') || error.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Variant with this SKU already exists' });
    }
    logger.error('Failed to update variant', { error, params: req.params });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteVariantHandler = async (req, res) => {
  try {
    const paramValidation = variantIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(paramValidation.error),
      });
    }

    const deleted = await deleteProductVariant(
      paramValidation.data.id,
      paramValidation.data.variantId
    );

    return res.status(200).json({
      message: 'Product variant deleted successfully',
      variant: deleted,
    });
  } catch (error) {
    if (error.message === 'Product variant not found') {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Failed to delete variant', { error, params: req.params });
    return res.status(500).json({ error: 'Internal server error' });
  }
};
