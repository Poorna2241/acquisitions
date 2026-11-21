import logger from '#config/logger.js';
import { db } from '#config/database.js';
import { products, productVariants } from '#models/product.model.js';
import { categories } from '#models/category.model.js';
import { brands } from '#models/brand.model.js';
import { eq, and, gte, lte, gt, ilike, or, desc, asc, sql } from 'drizzle-orm';
import { slugify } from '#utils/slug.js';
import { parsePriceBracket } from '#utils/price.js';
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
      categorySlug,
      brandId,
      brandSlug,
      minPrice,
      maxPrice,
      priceBracket,
      inStock,
      minRating,
      search,
      sortBy = 'newest',
      sortOrder,
      includeFacets = false,
    } = filters;

    // Resolve price bracket into minPrice and maxPrice if provided
    let effectiveMinPrice = minPrice;
    let effectiveMaxPrice = maxPrice;

    if (priceBracket) {
      const parsedBracket = parsePriceBracket(priceBracket);
      if (parsedBracket) {
        if (
          effectiveMinPrice === undefined &&
          parsedBracket.minPrice !== null &&
          parsedBracket.minPrice !== undefined
        ) {
          effectiveMinPrice = parsedBracket.minPrice;
        }
        if (
          effectiveMaxPrice === undefined &&
          parsedBracket.maxPrice !== null &&
          parsedBracket.maxPrice !== undefined
        ) {
          effectiveMaxPrice = parsedBracket.maxPrice;
        }
      }
    }

    const conditions = [];

    // Always only show active products by default unless specified
    if (filters.isActive !== undefined) {
      conditions.push(eq(products.isActive, filters.isActive));
    } else {
      conditions.push(eq(products.isActive, true));
    }

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    if (categorySlug) {
      conditions.push(eq(categories.slug, categorySlug));
    }

    if (brandId) {
      conditions.push(eq(products.brandId, brandId));
    }

    if (brandSlug) {
      conditions.push(eq(brands.slug, brandSlug));
    }

    if (effectiveMinPrice !== undefined && effectiveMinPrice !== null) {
      conditions.push(gte(products.basePrice, effectiveMinPrice.toString()));
    }

    if (effectiveMaxPrice !== undefined && effectiveMaxPrice !== null) {
      conditions.push(lte(products.basePrice, effectiveMaxPrice.toString()));
    }

    if (inStock === true) {
      conditions.push(gt(products.stockQuantity, 0));
    }

    if (minRating !== undefined && minRating !== null) {
      conditions.push(gte(products.averageRating, minRating.toString()));
    }

    const trimmedSearch = search ? search.trim() : '';
    if (trimmedSearch) {
      const searchPattern = `%${trimmedSearch}%`;
      conditions.push(
        or(
          sql`to_tsvector('english', coalesce(${products.title}, '') || ' ' || coalesce(${products.description}, '')) @@ plainto_tsquery('english', ${trimmedSearch})`,
          ilike(products.title, searchPattern),
          ilike(products.description, searchPattern),
          ilike(products.sku, searchPattern)
        )
      );
    }

    const whereClause = and(...conditions);

    // Sorting
    const isAscending = sortOrder === 'asc' || sortBy.endsWith('_asc');
    let orderByClauses = [];

    switch (sortBy) {
      case 'price':
      case 'price_asc':
      case 'price_desc':
        orderByClauses = [
          isAscending ? asc(products.basePrice) : desc(products.basePrice),
        ];
        break;

      case 'popularity':
      case 'popular':
      case 'popularity_desc':
      case 'popularity_asc':
        orderByClauses = isAscending
          ? [asc(products.reviewCount), asc(products.averageRating)]
          : [desc(products.reviewCount), desc(products.averageRating)];
        break;

      case 'rating':
      case 'rating_desc':
      case 'rating_asc':
        orderByClauses = isAscending
          ? [asc(products.averageRating), asc(products.reviewCount)]
          : [desc(products.averageRating), desc(products.reviewCount)];
        break;

      case 'date':
      case 'date_asc':
      case 'date_desc':
      case 'oldest':
        orderByClauses =
          isAscending || sortBy === 'oldest' || sortBy === 'date_asc'
            ? [asc(products.createdAt)]
            : [desc(products.createdAt)];
        break;

      case 'relevance':
        if (trimmedSearch) {
          orderByClauses = [
            desc(
              sql`ts_rank(to_tsvector('english', coalesce(${products.title}, '') || ' ' || coalesce(${products.description}, '')), plainto_tsquery('english', ${trimmedSearch}))`
            ),
          ];
        } else {
          orderByClauses = [desc(products.createdAt)];
        }
        break;

      case 'name_asc':
        orderByClauses = [asc(products.title)];
        break;

      case 'name_desc':
        orderByClauses = [desc(products.title)];
        break;

      case 'newest':
      default:
        orderByClauses = [desc(products.createdAt)];
        break;
    }

    // Total count for pagination
    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(whereClause);

    const totalCount = parseInt(countResult?.count || 0, 10);
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 0;
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
      .orderBy(...orderByClauses)
      .limit(limit)
      .offset(offset);

    const pagination = {
      total: totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1 && totalPages > 0,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 && page <= totalPages + 1 ? page - 1 : null,
    };

    let facets = undefined;
    if (includeFacets) {
      const facetConditions = [];
      if (filters.isActive !== undefined) {
        facetConditions.push(eq(products.isActive, filters.isActive));
      } else {
        facetConditions.push(eq(products.isActive, true));
      }
      if (categoryId) facetConditions.push(eq(products.categoryId, categoryId));
      if (categorySlug) facetConditions.push(eq(categories.slug, categorySlug));
      if (brandId) facetConditions.push(eq(products.brandId, brandId));
      if (brandSlug) facetConditions.push(eq(brands.slug, brandSlug));
      if (inStock === true) facetConditions.push(gt(products.stockQuantity, 0));
      if (minRating !== undefined && minRating !== null) {
        facetConditions.push(gte(products.averageRating, minRating.toString()));
      }
      if (trimmedSearch) {
        const searchPattern = `%${trimmedSearch}%`;
        facetConditions.push(
          or(
            sql`to_tsvector('english', coalesce(${products.title}, '') || ' ' || coalesce(${products.description}, '')) @@ plainto_tsquery('english', ${trimmedSearch})`,
            ilike(products.title, searchPattern),
            ilike(products.description, searchPattern),
            ilike(products.sku, searchPattern)
          )
        );
      }
      const facetWhereClause = and(...facetConditions);

      const [facetCounts] = await db
        .select({
          under_25: sql`COUNT(CASE WHEN CAST(${products.basePrice} AS NUMERIC) < 25 THEN 1 END)`,
          b_25_50: sql`COUNT(CASE WHEN CAST(${products.basePrice} AS NUMERIC) >= 25 AND CAST(${products.basePrice} AS NUMERIC) <= 50 THEN 1 END)`,
          b_50_100: sql`COUNT(CASE WHEN CAST(${products.basePrice} AS NUMERIC) >= 50 AND CAST(${products.basePrice} AS NUMERIC) <= 100 THEN 1 END)`,
          b_100_200: sql`COUNT(CASE WHEN CAST(${products.basePrice} AS NUMERIC) >= 100 AND CAST(${products.basePrice} AS NUMERIC) <= 200 THEN 1 END)`,
          b_200_500: sql`COUNT(CASE WHEN CAST(${products.basePrice} AS NUMERIC) >= 200 AND CAST(${products.basePrice} AS NUMERIC) <= 500 THEN 1 END)`,
          b_500_above: sql`COUNT(CASE WHEN CAST(${products.basePrice} AS NUMERIC) >= 500 THEN 1 END)`,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(facetWhereClause);

      facets = {
        priceBrackets: [
          {
            id: 'under-25',
            label: 'Under $25',
            min: 0,
            max: 25,
            count: parseInt(facetCounts?.under_25 || 0, 10),
          },
          {
            id: '25-50',
            label: '$25 to $50',
            min: 25,
            max: 50,
            count: parseInt(facetCounts?.b_25_50 || 0, 10),
          },
          {
            id: '50-100',
            label: '$50 to $100',
            min: 50,
            max: 100,
            count: parseInt(facetCounts?.b_50_100 || 0, 10),
          },
          {
            id: '100-200',
            label: '$100 to $200',
            min: 100,
            max: 200,
            count: parseInt(facetCounts?.b_100_200 || 0, 10),
          },
          {
            id: '200-500',
            label: '$200 to $500',
            min: 200,
            max: 500,
            count: parseInt(facetCounts?.b_200_500 || 0, 10),
          },
          {
            id: '500-above',
            label: '$500 & Above',
            min: 500,
            max: null,
            count: parseInt(facetCounts?.b_500_above || 0, 10),
          },
        ],
      };
    }

    return {
      products: items,
      pagination,
      ...(facets ? { facets } : {}),
      filters: {
        search: trimmedSearch || undefined,
        categoryId: categoryId || undefined,
        categorySlug: categorySlug || undefined,
        brandId: brandId || undefined,
        brandSlug: brandSlug || undefined,
        minPrice:
          effectiveMinPrice !== undefined ? effectiveMinPrice : undefined,
        maxPrice:
          effectiveMaxPrice !== undefined ? effectiveMaxPrice : undefined,
        priceBracket: priceBracket || undefined,
        inStock: inStock || undefined,
        minRating: minRating || undefined,
        sortBy,
        sortOrder: isAscending ? 'asc' : 'desc',
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
