import { z } from 'zod';

export const productIdSchema = z.object({
  id: z.coerce.number().int().positive('Product ID must be a positive integer'),
});

export const variantIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Product ID must be a positive integer'),
  variantId: z.coerce
    .number()
    .int()
    .positive('Variant ID must be a positive integer'),
});

export const createProductSchema = z.object({
  title: z.string().min(1, 'Product title is required').max(255).trim(),
  slug: z.string().max(280).trim().optional(),
  description: z.string().min(1, 'Product description is required'),
  categoryId: z.coerce
    .number()
    .int()
    .positive('Category ID is required and must be positive'),
  brandId: z.coerce
    .number()
    .int()
    .positive('Brand ID must be positive')
    .nullable()
    .optional(),
  basePrice: z.coerce.number().positive('Base price must be a positive number'),
  salePrice: z.coerce
    .number()
    .positive('Sale price must be a positive number')
    .nullable()
    .optional(),
  sku: z.string().min(1, 'SKU is required').max(100).trim(),
  stockQuantity: z.coerce
    .number()
    .int()
    .nonnegative('Stock quantity must be zero or positive')
    .default(0),
  images: z.array(z.string().url('Image must be a valid URL')).default([]),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = z
  .object({
    title: z.string().min(1).max(255).trim().optional(),
    slug: z.string().max(280).trim().optional(),
    description: z.string().min(1).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    brandId: z.coerce.number().int().positive().nullable().optional(),
    basePrice: z.coerce.number().positive().optional(),
    salePrice: z.coerce.number().positive().nullable().optional(),
    sku: z.string().min(1).max(100).trim().optional(),
    stockQuantity: z.coerce.number().int().nonnegative().optional(),
    images: z.array(z.string().url()).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required to update product',
  });

export const createVariantSchema = z.object({
  sku: z.string().min(1, 'Variant SKU is required').max(100).trim(),
  title: z.string().min(1, 'Variant title is required').max(150).trim(),
  attributes: z
    .record(z.string(), z.any())
    .refine(attrs => Object.keys(attrs).length > 0, {
      message:
        'Variant attributes must not be empty (e.g. { size: "XL", color: "Blue" })',
    }),
  priceAdjustment: z.coerce.number().default(0),
  stockQuantity: z.coerce
    .number()
    .int()
    .nonnegative('Stock quantity cannot be negative')
    .default(0),
});

export const updateVariantSchema = z
  .object({
    sku: z.string().min(1).max(100).trim().optional(),
    title: z.string().min(1).max(150).trim().optional(),
    attributes: z.record(z.string(), z.any()).optional(),
    priceAdjustment: z.coerce.number().optional(),
    stockQuantity: z.coerce.number().int().nonnegative().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required to update variant',
  });

export const queryProductsSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    categoryId: z.coerce.number().int().positive().optional(),
    categorySlug: z.string().trim().optional(),
    brandId: z.coerce.number().int().positive().optional(),
    brandSlug: z.string().trim().optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    priceBracket: z.string().trim().optional(),
    bracket: z.string().trim().optional(),
    inStock: z
      .union([z.string().transform(val => val === 'true'), z.boolean()])
      .optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    includeFacets: z
      .union([z.string().transform(val => val === 'true'), z.boolean()])
      .optional(),
    search: z.string().trim().optional(),
    q: z.string().trim().optional(),
    sortBy: z
      .enum([
        'price',
        'price_asc',
        'price_desc',
        'popularity',
        'popular',
        'popularity_desc',
        'popularity_asc',
        'date',
        'date_asc',
        'date_desc',
        'newest',
        'oldest',
        'rating',
        'rating_desc',
        'rating_asc',
        'relevance',
        'name_asc',
        'name_desc',
      ])
      .default('newest'),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
  .transform(data => ({
    ...data,
    search: data.search ?? data.q,
    priceBracket: data.priceBracket ?? data.bracket,
  }))
  .refine(
    data =>
      data.minPrice === undefined ||
      data.maxPrice === undefined ||
      data.minPrice <= data.maxPrice,
    { message: 'minPrice cannot be greater than maxPrice', path: ['minPrice'] }
  );
