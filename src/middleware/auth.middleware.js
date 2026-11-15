import logger from '#config/logger.js';
import {cookies} from '#utils/cookies.js';
import {jwttoken} from '#utils/jwt.js';

export const authenticate = (req, res, next) => {
  try {
    const token = cookies.get(req, 'token');
    if (!token) {
      return res.status(401).json({error: 'Authentication required'});
    }

    req.user = jwttoken.verify(token);
    return next();
  } catch (error) {
    logger.warn('Authentication failed', {error});
    return res.status(401).json({error: 'Invalid or expired authentication token'});
  }
};
