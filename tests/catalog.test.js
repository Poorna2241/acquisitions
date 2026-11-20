import { jest } from '@jest/globals';
import { slugify } from '#utils/slug.js';

let categoryIdCounter = 1;
const categoriesStore = [];

let brandIdCounter = 1;
const brandsStore = [];

let productIdCounter = 1;
const productsStore = [];

let variantIdCounter = 1;
const variantsStore = [];

const buildCategoryTree = flatCategories => {
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

jest.unstable_mockModule('#services/category.service.js', () => ({
  buildCategoryTree,
  createCategory: jest.fn(async data => {
    const slug = data.slug ? slugify(data.slug) : slugify(data.name);

    if (data.parentId) {
      const parent = categoriesStore.find(c => c.id === data.parentId);
      if (!parent) {
        throw new Error('Parent category not found');
      }
    }

    const newCategory = {
      id: categoryIdCounter++,
      name: data.name,
      slug,
      description: data.description || null,
      parentId: data.parentId || null,
      image: data.image || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    categoriesStore.push(newCategory);
    return newCategory;
  }),
  getAllCategories: jest.fn(async ({ tree = false } = {}) => {
    if (tree) {
      return buildCategoryTree(categoriesStore);
    }
    return [...categoriesStore];
  }),
  getCategoryById: jest.fn(async id => {
    return categoriesStore.find(c => c.id === id) || null;
  }),
  getCategoryBySlug: jest.fn(async slug => {
    return categoriesStore.find(c => c.slug === slug) || null;
  }),
  updateCategory: jest.fn(async (id, updates) => {
    const index = categoriesStore.findIndex(c => c.id === id);
    if (index === -1) {
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
      const parent = categoriesStore.find(c => c.id === values.parentId);
      if (!parent) {
        throw new Error('Parent category not found');
      }
    }

    const updated = { ...categoriesStore[index], ...values };
    categoriesStore[index] = updated;
    return updated;
  }),
  deleteCategory: jest.fn(async id => {
    const index = categoriesStore.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Category not found');
    }
    const [deleted] = categoriesStore.splice(index, 1);
    return deleted;
  }),
}));

jest.unstable_mockModule('#services/brand.service.js', () => ({
  createBrand: jest.fn(async data => {
    const slug = data.slug ? slugify(data.slug) : slugify(data.name);

    const newBrand = {
      id: brandIdCounter++,
      name: data.name,
      slug,
      description: data.description || null,
      logo: data.logo || null,
      website: data.website || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    brandsStore.push(newBrand);
    return newBrand;
  }),
  getAllBrands: jest.fn(async () => {
    return [...brandsStore];
  }),
  getBrandById: jest.fn(async id => {
    return brandsStore.find(b => b.id === id) || null;
  }),
  getBrandBySlug: jest.fn(async slug => {
    return brandsStore.find(b => b.slug === slug) || null;
  }),
  updateBrand: jest.fn(async (id, updates) => {
    const index = brandsStore.findIndex(b => b.id === id);
    if (index === -1) {
      throw new Error('Brand not found');
    }

    const values = { ...updates, updatedAt: new Date() };
    if (values.name && !values.slug) {
      values.slug = slugify(values.name);
    } else if (values.slug) {
      values.slug = slugify(values.slug);
    }

    const updated = { ...brandsStore[index], ...values };
    brandsStore[index] = updated;
    return updated;
  }),
  deleteBrand: jest.fn(async id => {
    const index = brandsStore.findIndex(b => b.id === id);
    if (index === -1) {
      throw new Error('Brand not found');
    }
    const [deleted] = brandsStore.splice(index, 1);
    return deleted;
  }),
}));

jest.unstable_mockModule('#services/product.service.js', () => ({
  createProduct: jest.fn(async data => {
    const category = categoriesStore.find(c => c.id === data.categoryId);
    if (!category) {
      throw new Error(`Category with ID ${data.categoryId} not found`);
    }

    if (data.brandId) {
      const brand = brandsStore.find(b => b.id === data.brandId);
      if (!brand) {
        throw new Error(`Brand with ID ${data.brandId} not found`);
      }
    }

    const slug = data.slug ? slugify(data.slug) : slugify(data.title);

    const newProduct = {
      id: productIdCounter++,
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
      averageRating: '0.00',
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    productsStore.push(newProduct);
    return newProduct;
  }),
  getProducts: jest.fn(async (filters = {}) => {
    const { categoryId, minPrice, maxPrice, inStock } = filters;
    let filtered = [...productsStore];

    if (categoryId) {
      filtered = filtered.filter(p => p.categoryId === categoryId);
    }

    if (minPrice !== undefined) {
      filtered = filtered.filter(
        p => parseFloat(p.basePrice) >= parseFloat(minPrice)
      );
    }

    if (maxPrice !== undefined) {
      filtered = filtered.filter(
        p => parseFloat(p.basePrice) <= parseFloat(maxPrice)
      );
    }

    if (inStock === true) {
      filtered = filtered.filter(p => p.stockQuantity > 0);
    }

    const items = filtered.map(p => {
      const cat = categoriesStore.find(c => c.id === p.categoryId);
      const br = brandsStore.find(b => b.id === p.brandId);
      return {
        ...p,
        categoryName: cat?.name || 'Category',
        categorySlug: cat?.slug || 'category',
        brandName: br?.name || 'Brand',
        brandSlug: br?.slug || 'brand',
      };
    });

    return {
      products: items,
      pagination: {
        page: 1,
        limit: 20,
        total: items.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }),
  getProductById: jest.fn(async (id, { includeVariants = true } = {}) => {
    const product = productsStore.find(p => p.id === id);
    if (!product) return null;
    const res = { ...product };
    if (includeVariants) {
      res.variants = variantsStore.filter(v => v.productId === id);
    }
    return res;
  }),
  getProductBySlug: jest.fn(async (slug, { includeVariants = true } = {}) => {
    const product = productsStore.find(p => p.slug === slug);
    if (!product) return null;
    const res = { ...product };
    if (includeVariants) {
      res.variants = variantsStore.filter(v => v.productId === product.id);
    }
    return res;
  }),
  updateProduct: jest.fn(async (id, updates) => {
    const index = productsStore.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Product not found');
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

    const updated = { ...productsStore[index], ...values };
    productsStore[index] = updated;
    return updated;
  }),
  deleteProduct: jest.fn(async id => {
    const index = productsStore.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Product not found');
    }
    const [deleted] = productsStore.splice(index, 1);
    return deleted;
  }),
  createProductVariant: jest.fn(async (productId, data) => {
    const product = productsStore.find(p => p.id === productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const newVariant = {
      id: variantIdCounter++,
      productId,
      sku: data.sku,
      title: data.title,
      attributes: data.attributes,
      priceAdjustment:
        data.priceAdjustment !== undefined
          ? data.priceAdjustment.toString()
          : '0.00',
      stockQuantity: data.stockQuantity ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    variantsStore.push(newVariant);
    return newVariant;
  }),
  updateProductVariant: jest.fn(async (productId, variantId, updates) => {
    const index = variantsStore.findIndex(
      v => v.id === variantId && v.productId === productId
    );
    if (index === -1) {
      throw new Error('Product variant not found');
    }

    const values = { ...updates, updatedAt: new Date() };
    if (values.priceAdjustment !== undefined) {
      values.priceAdjustment = values.priceAdjustment.toString();
    }

    const updated = { ...variantsStore[index], ...values };
    variantsStore[index] = updated;
    return updated;
  }),
  deleteProductVariant: jest.fn(async (productId, variantId) => {
    const index = variantsStore.findIndex(
      v => v.id === variantId && v.productId === productId
    );
    if (index === -1) {
      throw new Error('Product variant not found');
    }
    const [deleted] = variantsStore.splice(index, 1);
    return deleted;
  }),
}));

const { default: app } = await import('#src/app.js');
const { default: request } = await import('supertest');
const { jwttoken } = await import('#utils/jwt.js');

describe('Catalog & Taxonomy API - Comprehensive Suite', () => {
  const adminToken = jwttoken.sign({
    id: 1,
    email: 'admin@acquisitions.com',
    role: 'admin',
  });

  const userToken = jwttoken.sign({
    id: 2,
    email: 'customer@acquisitions.com',
    role: 'user',
  });

  let createdCategoryId;
  let createdSubcategoryId;
  let createdBrandId;
  let createdProductId;
  let createdVariantId;

  describe('Categories API', () => {
    it('GET /api/categories should return 200 and categories array', async () => {
      const response = await request(app).get('/api/categories').expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
    });

    it('POST /api/categories without token should return 401 Unauthorized', async () => {
      const response = await request(app)
        .post('/api/categories')
        .send({ name: 'Computers & Tech' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('POST /api/categories with non-admin role should return 403 Forbidden', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Computers & Tech' })
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('POST /api/categories with invalid payload should return 400 Validation Error', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('POST /api/categories as admin should create root category', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Computers ${Date.now()}`,
          description: 'Laptops, Desktops and Accessories',
        })
        .expect(201);

      expect(response.body).toHaveProperty('category');
      expect(response.body.category).toHaveProperty('id');
      expect(response.body.category).toHaveProperty('slug');
      createdCategoryId = response.body.category.id;
    });

    it('POST /api/categories as admin should create subcategory with parentId', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Laptops ${Date.now()}`,
          parentId: createdCategoryId,
          description: 'High performance portable computers',
        })
        .expect(201);

      expect(response.body.category.parentId).toBe(createdCategoryId);
      createdSubcategoryId = response.body.category.id;
    });

    it('GET /api/categories?tree=true should organize categories into parent-child hierarchy', async () => {
      const response = await request(app)
        .get('/api/categories?tree=true')
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      const parent = response.body.categories.find(
        c => c.id === createdCategoryId
      );
      expect(parent).toBeDefined();
      expect(parent.children.some(c => c.id === createdSubcategoryId)).toBe(
        true
      );
    });

    it('GET /api/categories/:identifier by ID should return category details', async () => {
      const response = await request(app)
        .get(`/api/categories/${createdCategoryId}`)
        .expect(200);

      expect(response.body.category.id).toBe(createdCategoryId);
    });

    it('PUT /api/categories/:id as admin should update category details', async () => {
      const response = await request(app)
        .put(`/api/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated computers description' })
        .expect(200);

      expect(response.body.category.description).toBe(
        'Updated computers description'
      );
    });
  });

  describe('Brands API', () => {
    it('GET /api/brands should return 200 and list', async () => {
      const response = await request(app).get('/api/brands').expect(200);

      expect(response.body).toHaveProperty('brands');
      expect(Array.isArray(response.body.brands)).toBe(true);
    });

    it('POST /api/brands as admin should create brand', async () => {
      const response = await request(app)
        .post('/api/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Apple Inc ${Date.now()}`,
          description: 'Think Different',
          website: 'https://apple.com',
        })
        .expect(201);

      expect(response.body).toHaveProperty('brand');
      expect(response.body.brand).toHaveProperty('id');
      createdBrandId = response.body.brand.id;
    });

    it('GET /api/brands/:identifier by ID should return brand', async () => {
      const response = await request(app)
        .get(`/api/brands/${createdBrandId}`)
        .expect(200);

      expect(response.body.brand.id).toBe(createdBrandId);
    });

    it('PUT /api/brands/:id as admin should update brand', async () => {
      const response = await request(app)
        .put(`/api/brands/${createdBrandId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Innovative electronics brand' })
        .expect(200);

      expect(response.body.brand.description).toBe(
        'Innovative electronics brand'
      );
    });
  });

  describe('Products & Variants API', () => {
    it('POST /api/products as admin should create product linked to category and brand', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: `MacBook Pro 16 ${timestamp}`,
          description: 'M3 Max powerhouse laptop with 36GB unified memory',
          categoryId: createdSubcategoryId,
          brandId: createdBrandId,
          basePrice: 2499.99,
          salePrice: 2299.99,
          sku: `MBP16-${timestamp}`,
          stockQuantity: 15,
          images: [
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
          ],
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('product');
      expect(response.body.product).toHaveProperty('id');
      expect(response.body.product.categoryId).toBe(createdSubcategoryId);
      expect(response.body.product.brandId).toBe(createdBrandId);
      createdProductId = response.body.product.id;
    });

    it('GET /api/products should list products with pagination and filters', async () => {
      const response = await request(app)
        .get(
          `/api/products?categoryId=${createdSubcategoryId}&minPrice=1000&maxPrice=3000&inStock=true&sortBy=price_asc`
        )
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body.pagination).toHaveProperty('total');
      const found = response.body.products.find(p => p.id === createdProductId);
      expect(found).toBeDefined();
      expect(found.categoryName).toBeDefined();
      expect(found.brandName).toBeDefined();
    });

    it('GET /api/products/:identifier by ID should return product with category and brand', async () => {
      const response = await request(app)
        .get(`/api/products/${createdProductId}`)
        .expect(200);

      expect(response.body.product.id).toBe(createdProductId);
      expect(response.body.product).toHaveProperty('variants');
    });

    it('POST /api/products/:id/variants as admin should create product variant with attributes', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post(`/api/products/${createdProductId}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sku: `MBP16-SPACEBLACK-1TB-${timestamp}`,
          title: 'Color: Space Black / Storage: 1TB',
          attributes: { color: 'Space Black', storage: '1TB', ram: '36GB' },
          priceAdjustment: 200,
          stockQuantity: 5,
        })
        .expect(201);

      expect(response.body).toHaveProperty('variant');
      expect(response.body.variant.productId).toBe(createdProductId);
      expect(response.body.variant.attributes).toEqual({
        color: 'Space Black',
        storage: '1TB',
        ram: '36GB',
      });
      createdVariantId = response.body.variant.id;
    });

    it('PUT /api/products/:id/variants/:variantId should update variant attributes and stock', async () => {
      const response = await request(app)
        .put(`/api/products/${createdProductId}/variants/${createdVariantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stockQuantity: 8,
          priceAdjustment: 250,
        })
        .expect(200);

      expect(response.body.variant.stockQuantity).toBe(8);
    });

    it('GET /api/products/:id should now include the created variant', async () => {
      const response = await request(app)
        .get(`/api/products/${createdProductId}`)
        .expect(200);

      expect(
        response.body.product.variants.some(v => v.id === createdVariantId)
      ).toBe(true);
    });

    it('DELETE /api/products/:id/variants/:variantId should delete the variant', async () => {
      const response = await request(app)
        .delete(
          `/api/products/${createdProductId}/variants/${createdVariantId}`
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.variant.id).toBe(createdVariantId);
    });

    it('DELETE /api/products/:id as admin should delete the product', async () => {
      const response = await request(app)
        .delete(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.product.id).toBe(createdProductId);
    });
  });

  describe('Cleanup', () => {
    it('DELETE subcategory and root category', async () => {
      await request(app)
        .delete(`/api/categories/${createdSubcategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app)
        .delete(`/api/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('DELETE brand', async () => {
      await request(app)
        .delete(`/api/brands/${createdBrandId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
