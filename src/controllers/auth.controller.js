import {signInSchema, signUpSchema} from '#validations/auth.validation.js';
import logger from '#config/logger.js';
import {formatValidationError} from '#utils/format.js';
import { authenticateUser, createUser } from '#services/auth.service.js';
import { jwttoken } from '#utils/jwt.js';
import { cookies } from '#utils/cookies.js';

export const signUp = async (req, res) => {
  try {
    const validationResult = signUpSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({ 
        error : 'Validation failed',
        details: formatValidationError(validationResult.error)
      });
    }

    const { name, email,password, role } = validationResult.data;
    

    const user = await createUser({ name, email, password, role });
    const token = jwttoken.sign({ id: user.id, email: user.email, role: user.role });
    cookies.set(res, 'token', token);

    logger.info(`User ${name} with email ${email} and role ${role} signed up successfully.`);
    res.status(201).json({ 
      message: 'User signed up successfully',
      user: {
        id:user.id,
        name:user.name,
        email:user.email,
        role:user.role
                
      }
    });


  } catch (error) {
    if (error.issues) {
      const formattedErrors = formatValidationError(error);
      return res.status(400).json({ errors: formattedErrors });
    }
    logger.error('Failed to sign up user', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const signIn = async (req, res) => {
  try {
    const validationResult = signInSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error)
      });
    }

    const user = await authenticateUser(validationResult.data);
    const token = jwttoken.sign({ id: user.id, email: user.email, role: user.role });
    cookies.set(res, 'token', token);

    logger.info(`User ${user.name} with email ${user.email} signed in successfully.`);
    return res.status(200).json({
      message: 'User signed in successfully',
      user
    });
  } catch (error) {
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({ error: error.message });
    }

    logger.error('Failed to sign in user', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const signOut = (req, res) => {
  try {
    cookies.clear(res, 'token');
    logger.info('User signed out successfully.');
    return res.status(200).json({ message: 'User signed out successfully' });
  } catch (error) {
    logger.error('Failed to sign out user', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
};