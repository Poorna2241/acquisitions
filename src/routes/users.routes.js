import { fetchAllUsers } from '#controllers/user.controller.js';
import express from 'express';

const router = express.Router();

router.get('/', fetchAllUsers);
router.get('/:id', (req, res) => res.send(`GET /users/${req.params.id} route`));
router.put('/:id', (req, res) => res.send(`PUT /users/${req.params.id} route`));
router.delete('/:id', (req, res) => res.send(`DELETE /users/${req.params.id} route`));

export default router;