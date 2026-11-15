import logger from '#config/logger.js';
import {formatValidationError} from '#utils/format.js';
import {getAllUsers, getUserById as getUserByIdService, updateUser as updateUserService, deleteUser as deleteUserService} from '#services/users.services.js';
import {updateUserSchema, userIdSchema} from '#validations/users.validation.js';

const validateUserId = (req, res) => {
  const result = userIdSchema.safeParse(req.params);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: formatValidationError(result.error),
    });
    return null;
  }
  return result.data.id;
};

const canManageUser = (req, id) => req.user?.role === 'admin' || req.user?.id === id;

export const fetchAllUsers = async (req, res) => {
  try {
    logger.info('Fetching all users');
    const allUsers = await getAllUsers();
    return res.status(200).json({
      message: 'Successfully fetched all users',
      users: allUsers,
      count: allUsers.length,
    });
  } catch (error) {
    logger.error('Error fetching all users', {error});
    return res.status(500).json({error: 'Internal server error'});
  }
};

export const getUserById = async (req, res) => {
  try {
    const id = validateUserId(req, res);
    if (id === null) return;

    logger.info('Fetching user by id', {id});
    const user = await getUserByIdService(id);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }
    return res.status(200).json({message: 'Successfully fetched user', user});
  } catch (error) {
    logger.error('Error fetching user by id', {error});
    return res.status(500).json({error: 'Internal server error'});
  }
};

export const updateUser = async (req, res) => {
  try {
    const id = validateUserId(req, res);
    if (id === null) return;

    const validationResult = updateUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error),
      });
    }

    const updates = validationResult.data;
    if (!canManageUser(req, id)) {
      logger.warn('Unauthorized user update attempt', {id, requesterId: req.user?.id});
      return res.status(403).json({error: 'You can only update your own information'});
    }
    if (updates.role !== undefined && req.user?.role !== 'admin') {
      logger.warn('Unauthorized role update attempt', {id, requesterId: req.user?.id});
      return res.status(403).json({error: 'Only admins can change user roles'});
    }

    logger.info('Updating user', {id});
    const user = await updateUserService(id, updates);
    return res.status(200).json({message: 'User updated successfully', user});
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({error: error.message});
    }
    logger.error('Error updating user', {error});
    return res.status(500).json({error: 'Internal server error'});
  }
};

export const deleteUser = async (req, res) => {
  try {
    const id = validateUserId(req, res);
    if (id === null) return;

    if (!canManageUser(req, id)) {
      logger.warn('Unauthorized user deletion attempt', {id, requesterId: req.user?.id});
      return res.status(403).json({error: 'You can only delete your own account'});
    }

    logger.info('Deleting user', {id});
    const user = await deleteUserService(id);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }
    return res.status(200).json({message: 'User deleted successfully', user});
  } catch (error) {
    logger.error('Error deleting user', {error});
    return res.status(500).json({error: 'Internal server error'});
  }
};
