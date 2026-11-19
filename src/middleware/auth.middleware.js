import logger from '#config/logger.js';
import { cookies } from '#utils/cookies.js';
import { jwttoken } from '#utils/jwt.js';

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;
    const token = cookies.get(req, 'token') || bearerToken;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.user = jwttoken.verify(token);
    return next();
  } catch (error) {
    logger.warn('Authentication failed', { error });
    return res
      .status(401)
      .json({ error: 'Invalid or expired authentication token' });
  }
};
