import logger from '#config/logger.js';
import { db } from '#config/database.js';
import { brands } from '#models/brand.model.js';
import { eq } from 'drizzle-orm';
import { slugify } from '#utils/slug.js';

export const createBrand = async data => {
  try {
    const slug = data.slug ? slugify(data.slug) : slugify(data.name);

    const [newBrand] = await db
      .insert(brands)
      .values({
        name: data.name,
        slug,
        description: data.description || null,
        logo: data.logo || null,
        website: data.website || null,
      })
      .returning();

    logger.info(`Brand created: ${newBrand.name} (id: ${newBrand.id})`);
    return newBrand;
  } catch (error) {
    logger.error('Error creating brand', { error, data });
    throw error;
  }
};

export const getAllBrands = async () => {
  try {
    return await db.select().from(brands);
  } catch (error) {
    logger.error('Error fetching brands', { error });
    throw error;
  }
};

export const getBrandById = async id => {
  try {
    const [brand] = await db
      .select()
      .from(brands)
      .where(eq(brands.id, id))
      .limit(1);

    return brand || null;
  } catch (error) {
    logger.error('Error fetching brand by id', { error, id });
    throw error;
  }
};

export const getBrandBySlug = async slug => {
  try {
    const [brand] = await db
      .select()
      .from(brands)
      .where(eq(brands.slug, slug))
      .limit(1);

    return brand || null;
  } catch (error) {
    logger.error('Error fetching brand by slug', { error, slug });
    throw error;
  }
};

export const updateBrand = async (id, updates) => {
  try {
    const existing = await getBrandById(id);
    if (!existing) {
      throw new Error('Brand not found');
    }

    const values = { ...updates, updatedAt: new Date() };
    if (values.name && !values.slug) {
      values.slug = slugify(values.name);
    } else if (values.slug) {
      values.slug = slugify(values.slug);
    }

    const [updated] = await db
      .update(brands)
      .set(values)
      .where(eq(brands.id, id))
      .returning();

    logger.info(`Brand updated: ${id}`);
    return updated;
  } catch (error) {
    logger.error('Error updating brand', { error, id });
    throw error;
  }
};

export const deleteBrand = async id => {
  try {
    const existing = await getBrandById(id);
    if (!existing) {
      throw new Error('Brand not found');
    }

    const [deleted] = await db
      .delete(brands)
      .where(eq(brands.id, id))
      .returning();

    logger.info(`Brand deleted: ${id}`);
    return deleted;
  } catch (error) {
    logger.error('Error deleting brand', { error, id });
    throw error;
  }
};
