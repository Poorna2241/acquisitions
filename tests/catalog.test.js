import request from 'supertest';
import app from '#src/app.js';
import { jwttoken } from '#utils/jwt.js';

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
