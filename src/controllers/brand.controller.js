import logger from '#config/logger.js';
import { formatValidationError } from '#utils/format.js';
import {
  createBrand,
  getAllBrands,
  getBrandById,
  getBrandBySlug,
  updateBrand,
  deleteBrand,
} from '#services/brand.service.js';
import {
  createBrandSchema,
  updateBrandSchema,
  brandIdSchema,
} from '#validations/brand.validation.js';

export const createBrandHandler = async (req, res) => {
  try {
    const validation = createBrandSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validation.error),
      });
    }

    const brand = await createBrand(validation.data);
    return res.status(201).json({
      message: 'Brand created successfully',
      brand,
    });
  } catch (error) {
    if (error.message.includes('unique') || error.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Brand with this slug/name already exists' });
    }
    logger.error('Failed to create brand', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllBrandsHandler = async (req, res) => {
  try {
    const brandsList = await getAllBrands();
    return res.status(200).json({
      message: 'Brands retrieved successfully',
      brands: brandsList,
      count: brandsList.length,
    });
  } catch (error) {
    logger.error('Failed to get brands', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBrandByIdOrSlugHandler = async (req, res) => {
  try {
    const { identifier } = req.params;
    const isNumeric = /^\d+$/.test(identifier);

    const brand = isNumeric
      ? await getBrandById(parseInt(identifier, 10))
      : await getBrandBySlug(identifier);

    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    return res.status(200).json({
      message: 'Brand retrieved successfully',
      brand,
    });
  } catch (error) {
    logger.error('Failed to get brand', {
      error,
      identifier: req.params.identifier,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBrandHandler = async (req, res) => {
  try {
    const idValidation = brandIdSchema.safeParse(req.params);
    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const bodyValidation = updateBrandSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(bodyValidation.error),
      });
    }

    const updated = await updateBrand(
      idValidation.data.id,
      bodyValidation.data
    );
    return res.status(200).json({
      message: 'Brand updated successfully',
      brand: updated,
    });
  } catch (error) {
    if (error.message === 'Brand not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('unique') || error.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Brand with this slug/name already exists' });
    }
    logger.error('Failed to update brand', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteBrandHandler = async (req, res) => {
  try {
    const idValidation = brandIdSchema.safeParse(req.params);
    if (!idValidation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidation.error),
      });
    }

    const deleted = await deleteBrand(idValidation.data.id);
    return res.status(200).json({
      message: 'Brand deleted successfully',
      brand: deleted,
    });
  } catch (error) {
    if (error.message === 'Brand not found') {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Failed to delete brand', { error, id: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
};
