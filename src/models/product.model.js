import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';
import { categories } from './category.model.js';
import { brands } from './brand.model.js';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 280 }).notNull().unique(),
  description: text('description').notNull(),
  categoryId: integer('category_id')
    .references(() => categories.id)
    .notNull(),
  brandId: integer('brand_id').references(() => brands.id),
  basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  salePrice: numeric('sale_price', { precision: 10, scale: 2 }),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  stockQuantity: integer('stock_quantity').default(0).notNull(),
  images: jsonb('images').$type().default([]).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  averageRating: numeric('average_rating', { precision: 3, scale: 2 }).default(
    '0.00'
  ),
  reviewCount: integer('review_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const productVariants = pgTable('product_variants', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  title: varchar('title', { length: 150 }).notNull(),
  attributes: jsonb('attributes').$type().notNull(),
  priceAdjustment: numeric('price_adjustment', {
    precision: 10,
    scale: 2,
  }).default('0.00'),
  stockQuantity: integer('stock_quantity').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
