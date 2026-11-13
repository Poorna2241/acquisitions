import {signUpSchema} from '#validations/auth.validation.js';
import logger from '#config/logger.js';
import {formatValidationError} from '#utils/format.js';
import { createUser } from '#services/auth.service.js';
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