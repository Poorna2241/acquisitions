import logger from '#config/logger.js';
import bcrypt from 'bcrypt';
import { users } from '#models/user.model.js';
import {eq} from 'drizzle-orm';
import { db } from '#config/database.js';

export const hashPassword = async (password) => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    logger.error('Error occurred while hashing password', { error });
    throw new Error('Error occurred while hashing password');
  }
};

export const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    logger.error('Error occurred while comparing password', { error });
    throw new Error('Error occurred while comparing password');
  }
};

export const authenticateUser = async ({ email, password }) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || !(await comparePassword(password, user.password))) {
      throw new Error('Invalid email or password');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    if (error.message === 'Invalid email or password') {
      throw error;
    }

    logger.error('Error occurred while authenticating user', { error });
    throw new Error('Error occurred while authenticating user');
  }
};

export const createUser = async ({ name, email, password, role = 'user'}) => {
  try {
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }
    const hashedPassword = await hashPassword(password);
    const [newUser] = await db
      .insert(users)
      .values({ name, email, password: hashedPassword, role })
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role });
        
    logger.info(`User ${name} with email ${email} and role ${role} created successfully.`);
    return newUser;
  } catch (error) {
    logger.error('Error occurred while creating user', { error });
    throw new Error('Error occurred while creating user');
  }
};