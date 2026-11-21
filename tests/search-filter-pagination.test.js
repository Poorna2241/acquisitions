import request from 'supertest';
import app from '#src/app.js';
import { parsePriceBracket, STANDARD_PRICE_BRACKETS } from '#utils/price.js';
import { queryProductsSchema } from '#validations/product.validation.js';

describe('Search, Filter & Pagination Domain Suite', () => {
  describe('Price Bracket Parser Utility (parsePriceBracket)', () => {
    it('should correctly parse standard price bracket identifiers', () => {
      expect(parsePriceBracket('under-25')).toEqual({
        minPrice: 0,
        maxPrice: 25,
      });
      expect(parsePriceBracket('25-50')).toEqual({
        minPrice: 25,
        maxPrice: 50,
      });
      expect(parsePriceBracket('50-100')).toEqual({
        minPrice: 50,
        maxPrice: 100,
      });
      expect(parsePriceBracket('100-200')).toEqual({
        minPrice: 100,
        maxPrice: 200,
      });
      expect(parsePriceBracket('200-500')).toEqual({
        minPrice: 200,
        maxPrice: 500,
      });
      expect(parsePriceBracket('500-above')).toEqual({
        minPrice: 500,
        maxPrice: null,
      });
    });

    it('should parse standard brackets by label (case-insensitive)', () => {
      expect(parsePriceBracket('Under $25')).toEqual({
        minPrice: 0,
        maxPrice: 25,
      });
      expect(parsePriceBracket('$25 to $50')).toEqual({
        minPrice: 25,
        maxPrice: 50,
      });
      expect(parsePriceBracket('$500 & Above')).toEqual({
        minPrice: 500,
        maxPrice: null,
      });
    });

    it('should parse "under-X" or "<X" formats', () => {
      expect(parsePriceBracket('under-75')).toEqual({
        minPrice: 0,
        maxPrice: 75,
      });
      expect(parsePriceBracket('<150')).toEqual({ minPrice: 0, maxPrice: 150 });
      expect(parsePriceBracket('under-99.99')).toEqual({
        minPrice: 0,
        maxPrice: 99.99,
      });
    });

    it('should parse "over-X", ">X", "X+", and "X-above" formats', () => {
      expect(parsePriceBracket('500+')).toEqual({
        minPrice: 500,
        maxPrice: null,
      });
      expect(parsePriceBracket('over-1000')).toEqual({
        minPrice: 1000,
        maxPrice: null,
      });
      expect(parsePriceBracket('>250')).toEqual({
        minPrice: 250,
        maxPrice: null,
      });
      expect(parsePriceBracket('300-above')).toEqual({
        minPrice: 300,
        maxPrice: null,
      });
    });

    it('should parse range formats "X-Y", "[X,Y]", and "X to Y"', () => {
      expect(parsePriceBracket('50-150')).toEqual({
        minPrice: 50,
        maxPrice: 150,
      });
      expect(parsePriceBracket('[100,300]')).toEqual({
        minPrice: 100,
        maxPrice: 300,
      });
      expect(parsePriceBracket('20 to 80')).toEqual({
        minPrice: 20,
        maxPrice: 80,
      });
    });

    it('should return null for invalid price brackets', () => {
      expect(parsePriceBracket(null)).toBeNull();
      expect(parsePriceBracket('')).toBeNull();
      expect(parsePriceBracket('invalid-bracket')).toBeNull();
      expect(parsePriceBracket('300-100')).toBeNull(); // min > max
    });

    it('should expose STANDARD_PRICE_BRACKETS array with valid brackets', () => {
      expect(Array.isArray(STANDARD_PRICE_BRACKETS)).toBe(true);
      expect(STANDARD_PRICE_BRACKETS.length).toBe(6);
      STANDARD_PRICE_BRACKETS.forEach(bracket => {
        expect(bracket).toHaveProperty('id');
        expect(bracket).toHaveProperty('label');
        expect(bracket).toHaveProperty('min');
      });
    });
  });

  describe('Query Validation Tests (/api/products)', () => {
    it('should reject invalid page numbers', async () => {
      const response = await request(app)
        .get('/api/products?page=0')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should reject negative page numbers', async () => {
      const response = await request(app)
        .get('/api/products?page=-5')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should reject limit greater than 100', async () => {
      const response = await request(app)
        .get('/api/products?limit=101')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should reject when minPrice > maxPrice', async () => {
      const response = await request(app)
        .get('/api/products?minPrice=500&maxPrice=100')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain(
        'minPrice cannot be greater than maxPrice'
      );
    });

    it('should reject invalid sortBy value', async () => {
      const response = await request(app)
        .get('/api/products?sortBy=invalid_sort')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should reject minRating > 5', async () => {
      const response = await request(app)
        .get('/api/products?minRating=6')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should validate all supported sort options via queryProductsSchema', () => {
      const validSorts = [
        'price_asc',
        'price_desc',
        'popularity',
        'popular',
        'popularity_desc',
        'date_asc',
        'date_desc',
        'newest',
        'oldest',
        'rating',
        'relevance',
      ];

      for (const sortBy of validSorts) {
        const parsed = queryProductsSchema.safeParse({ sortBy });
        expect(parsed.success).toBe(true);
        expect(parsed.data.sortBy).toBe(sortBy);
      }
    });
  });

  describe('Search, Filter & Sorting Endpoints (/api/products and /api/products/search)', () => {
    it('GET /api/products should return standard paginated response with pagination metadata', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Products retrieved successfully'
      );
      expect(response.body).toHaveProperty('products');
      expect(Array.isArray(response.body.products)).toBe(true);

      const { pagination } = response.body;
      expect(pagination).toHaveProperty('page', 1);
      expect(pagination).toHaveProperty('limit', 10);
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('totalPages');
      expect(pagination).toHaveProperty('hasNextPage');
      expect(pagination).toHaveProperty('hasPrevPage');
    });

    it('GET /api/products/search should route properly without 404', async () => {
      const response = await request(app)
        .get('/api/products/search?q=laptop')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('pagination');
    });

    it('GET /api/products should accept alias "q" for "search"', async () => {
      const response = await request(app)
        .get('/api/products?q=wireless')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('filters');
      expect(response.body.filters.search).toBe('wireless');
    });

    it('GET /api/products should accept price bracket filtering via "priceBracket"', async () => {
      const response = await request(app)
        .get('/api/products?priceBracket=50-100')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('filters');
      expect(response.body.filters.priceBracket).toBe('50-100');
    });

    it('GET /api/products should accept price bracket filtering via alias "bracket"', async () => {
      const response = await request(app)
        .get('/api/products?bracket=under-25')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('filters');
      expect(response.body.filters.priceBracket).toBe('under-25');
    });

    it('GET /api/products should support sorting by popularity', async () => {
      const response = await request(app)
        .get('/api/products?sortBy=popularity')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body.filters.sortBy).toBe('popularity');
    });

    it('GET /api/products should support sorting by date', async () => {
      const response = await request(app)
        .get('/api/products?sortBy=date_desc')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body.filters.sortBy).toBe('date_desc');
    });

    it('GET /api/products should support sorting by price with sortOrder', async () => {
      const response = await request(app)
        .get('/api/products?sortBy=price&sortOrder=asc')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body.filters.sortBy).toBe('price');
      expect(response.body.filters.sortOrder).toBe('asc');
    });

    it('GET /api/products should support inStock filter', async () => {
      const response = await request(app)
        .get('/api/products?inStock=true')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body.filters.inStock).toBe(true);
    });

    it('GET /api/products should support combined search, bracket, and sorting', async () => {
      const response = await request(app)
        .get(
          '/api/products?search=pro&priceBracket=200-500&sortBy=price_asc&inStock=true'
        )
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body.filters.search).toBe('pro');
      expect(response.body.filters.priceBracket).toBe('200-500');
      expect(response.body.filters.sortBy).toBe('price_asc');
      expect(response.body.filters.inStock).toBe(true);
    });

    it('GET /api/products should support includeFacets=true and return price bracket facets', async () => {
      const response = await request(app)
        .get('/api/products?includeFacets=true')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('facets');
      expect(response.body.facets).toHaveProperty('priceBrackets');
      expect(Array.isArray(response.body.facets.priceBrackets)).toBe(true);
      expect(response.body.facets.priceBrackets.length).toBe(6);

      const under25 = response.body.facets.priceBrackets.find(
        b => b.id === 'under-25'
      );
      expect(under25).toBeDefined();
      expect(typeof under25.count).toBe('number');
      expect(under25.min).toBe(0);
      expect(under25.max).toBe(25);
    });

    it('GET /api/products should support sorting by relevance with search query', async () => {
      const response = await request(app)
        .get('/api/products?search=shoes&sortBy=relevance')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body.filters.sortBy).toBe('relevance');
      expect(response.body.filters.search).toBe('shoes');
    });

    it('GET /api/products should support sorting by name (name_asc and name_desc)', async () => {
      const ascRes = await request(app)
        .get('/api/products?sortBy=name_asc')
        .expect(200);
      expect(ascRes.body.filters.sortBy).toBe('name_asc');

      const descRes = await request(app)
        .get('/api/products?sortBy=name_desc')
        .expect(200);
      expect(descRes.body.filters.sortBy).toBe('name_desc');
    });

    it('GET /api/products should support filtering by categorySlug and brandSlug', async () => {
      const response = await request(app)
        .get('/api/products?categorySlug=electronics&brandSlug=apple')
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body.filters.categorySlug).toBe('electronics');
      expect(response.body.filters.brandSlug).toBe('apple');
    });

    it('GET /api/products should return correct pagination structure with page navigation', async () => {
      const response = await request(app)
        .get('/api/products?page=2&limit=5')
        .expect(200);

      const { pagination } = response.body;
      expect(pagination.page).toBe(2);
      expect(pagination.limit).toBe(5);
      expect(typeof pagination.total).toBe('number');
      expect(typeof pagination.totalPages).toBe('number');
      expect(typeof pagination.hasNextPage).toBe('boolean');
      expect(typeof pagination.hasPrevPage).toBe('boolean');
    });
  });
});
