import logger from '#config/logger.js';
import { db } from '#config/database.js';
import { products, productVariants } from '#models/product.model.js';
import { categories } from '#models/category.model.js';
import { brands } from '#models/brand.model.js';
import { eq, and, gte, lte, gt, ilike, or, desc, asc, sql } from 'drizzle-orm';
import { slugify } from '#utils/slug.js';
import { getCategoryById } from '#services/category.service.js';
import { getBrandById } from '#services/brand.service.js';

export const createProduct = async data => {
  try {
    const category = await getCategoryById(data.categoryId);
    if (!category) {
      throw new Error(`Category with ID ${data.categoryId} not found`);
    }

    if (data.brandId) {
      const brand = await getBrandById(data.brandId);
      if (!brand) {
        throw new Error(`Brand with ID ${data.brandId} not found`);
      }
    }

    const slug = data.slug ? slugify(data.slug) : slugify(data.title);

    const [newProduct] = await db
      .insert(products)
      .values({
        title: data.title,
        slug,
        description: data.description,
        categoryId: data.categoryId,
        brandId: data.brandId || null,
        basePrice: data.basePrice.toString(),
        salePrice:
          data.salePrice !== undefined && data.salePrice !== null
            ? data.salePrice.toString()
            : null,
        sku: data.sku,
        stockQuantity: data.stockQuantity ?? 0,
        images: data.images || [],
        isActive: data.isActive !== undefined ? data.isActive : true,
      })
      .returning();

    logger.info(
      `Product created: ${newProduct.title} (SKU: ${newProduct.sku})`
    );
    return newProduct;
  } catch (error) {
    logger.error('Error creating product', { error, data });
    throw error;
  }
};

export const getProducts = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      inStock,
      search,
      sortBy = 'newest',
    } = filters;

    const conditions = [];

    // Always only show active products by default unless specified
    conditions.push(eq(products.isActive, true));

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    if (brandId) {
      conditions.push(eq(products.brandId, brandId));
    }

    if (minPrice !== undefined) {
      conditions.push(gte(products.basePrice, minPrice.toString()));
    }

    if (maxPrice !== undefined) {
      conditions.push(lte(products.basePrice, maxPrice.toString()));
    }

    if (inStock === true) {
      conditions.push(gt(products.stockQuantity, 0));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(products.title, searchPattern),
          ilike(products.description, searchPattern),
          ilike(products.sku, searchPattern)
        )
      );
    }

    const whereClause = and(...conditions);

    // Sorting
    let orderByClause;
    switch (sortBy) {
      case 'price_asc':
        orderByClause = asc(products.basePrice);
        break;
      case 'price_desc':
        orderByClause = desc(products.basePrice);
        break;
      case 'rating':
        orderByClause = desc(products.averageRating);
        break;
      case 'newest':
      default:
        orderByClause = desc(products.createdAt);
        break;
    }

    // Total count for pagination
    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(products)
      .where(whereClause);

    const totalCount = parseInt(countResult?.count || 0, 10);
    const offset = (page - 1) * limit;

    const items = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        description: products.description,
        basePrice: products.basePrice,
        salePrice: products.salePrice,
        sku: products.sku,
        stockQuantity: products.stockQuantity,
        images: products.images,
        isActive: products.isActive,
        averageRating: products.averageRating,
        reviewCount: products.reviewCount,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        brandId: products.brandId,
        brandName: brands.name,
        brandSlug: brands.slug,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return {
      products: items,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  } catch (error) {
    logger.error('Error querying products', { error, filters });
    throw error;
  }
};

export const getProductById = async (id, { includeVariants = true } = {}) => {
  try {
    const [product] = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        description: products.description,
        basePrice: products.basePrice,
        salePrice: products.salePrice,
        sku: products.sku,
        stockQuantity: products.stockQuantity,
        images: products.images,
        isActive: products.isActive,
        averageRating: products.averageRating,
        reviewCount: products.reviewCount,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        brandId: products.brandId,
        brandName: brands.name,
        brandSlug: brands.slug,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(products.id, id))
      .limit(1);

    if (!product) return null;

    if (includeVariants) {
      const variants = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, id));

      product.variants = variants;
    }

    return product;
  } catch (error) {
    logger.error('Error fetching product by id', { error, id });
    throw error;
  }
};

export const getProductBySlug = async (
  slug,
  { includeVariants = true } = {}
) => {
  try {
    const [product] = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        description: products.description,
        basePrice: products.basePrice,
        salePrice: products.salePrice,
        sku: products.sku,
        stockQuantity: products.stockQuantity,
        images: products.images,
        isActive: products.isActive,
        averageRating: products.averageRating,
        reviewCount: products.reviewCount,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        brandId: products.brandId,
        brandName: brands.name,
        brandSlug: brands.slug,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(products.slug, slug))
      .limit(1);

    if (!product) return null;

    if (includeVariants) {
      const variants = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, product.id));

      product.variants = variants;
    }

    return product;
  } catch (error) {
    logger.error('Error fetching product by slug', { error, slug });
    throw error;
  }
};

export const updateProduct = async (id, updates) => {
  try {
    const existing = await getProductById(id, { includeVariants: false });
    if (!existing) {
      throw new Error('Product not found');
    }

    if (updates.categoryId) {
      const category = await getCategoryById(updates.categoryId);
      if (!category) {
        throw new Error(`Category with ID ${updates.categoryId} not found`);
      }
    }

    if (updates.brandId) {
      const brand = await getBrandById(updates.brandId);
      if (!brand) {
        throw new Error(`Brand with ID ${updates.brandId} not found`);
      }
    }

    const values = { ...updates, updatedAt: new Date() };

    if (values.title && !values.slug) {
      values.slug = slugify(values.title);
    } else if (values.slug) {
      values.slug = slugify(values.slug);
    }

    if (values.basePrice !== undefined) {
      values.basePrice = values.basePrice.toString();
    }

    if (values.salePrice !== undefined) {
      values.salePrice =
        values.salePrice !== null ? values.salePrice.toString() : null;
    }

    const [updated] = await db
      .update(products)
      .set(values)
      .where(eq(products.id, id))
      .returning();

    logger.info(`Product updated: ${id}`);
    return updated;
  } catch (error) {
    logger.error('Error updating product', { error, id });
    throw error;
  }
};

export const deleteProduct = async id => {
  try {
    const existing = await getProductById(id, { includeVariants: false });
    if (!existing) {
      throw new Error('Product not found');
    }

    const [deleted] = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();

    logger.info(`Product deleted: ${id}`);
    return deleted;
  } catch (error) {
    logger.error('Error deleting product', { error, id });
    throw error;
  }
};

export const createProductVariant = async (productId, data) => {
  try {
    const product = await getProductById(productId, { includeVariants: false });
    if (!product) {
      throw new Error('Product not found');
    }

    const [newVariant] = await db
      .insert(productVariants)
      .values({
        productId,
        sku: data.sku,
        title: data.title,
        attributes: data.attributes,
        priceAdjustment:
          data.priceAdjustment !== undefined
            ? data.priceAdjustment.toString()
            : '0.00',
        stockQuantity: data.stockQuantity ?? 0,
      })
      .returning();

    logger.info(
      `Variant created: ${newVariant.title} (SKU: ${newVariant.sku}) for Product ${productId}`
    );
    return newVariant;
  } catch (error) {
    logger.error('Error creating product variant', { error, productId, data });
    throw error;
  }
};

export const updateProductVariant = async (productId, variantId, updates) => {
  try {
    const [existing] = await db
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, variantId),
          eq(productVariants.productId, productId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error('Product variant not found');
    }

    const values = { ...updates, updatedAt: new Date() };
    if (values.priceAdjustment !== undefined) {
      values.priceAdjustment = values.priceAdjustment.toString();
    }

    const [updated] = await db
      .update(productVariants)
      .set(values)
      .where(eq(productVariants.id, variantId))
      .returning();

    logger.info(`Variant updated: ${variantId} for Product ${productId}`);
    return updated;
  } catch (error) {
    logger.error('Error updating product variant', {
      error,
      productId,
      variantId,
    });
    throw error;
  }
};

export const deleteProductVariant = async (productId, variantId) => {
  try {
    const [existing] = await db
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.id, variantId),
          eq(productVariants.productId, productId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error('Product variant not found');
    }

    const [deleted] = await db
      .delete(productVariants)
      .where(eq(productVariants.id, variantId))
      .returning();

    logger.info(`Variant deleted: ${variantId} for Product ${productId}`);
    return deleted;
  } catch (error) {
    logger.error('Error deleting product variant', {
      error,
      productId,
      variantId,
    });
    throw error;
  }
};
