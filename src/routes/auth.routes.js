import express from 'express';
import { signUp } from '#controllers/auth.controller.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Authentication API is working',
    endpoints: ['POST /api/auth/sign-up', 'POST /api/auth/sign-in', 'POST /api/auth/sign-out'],
  });
});

router.post('/sign-up', signUp);

router.post('/sign-in', (req, res) => {
  res.send('POST /api/auth/sign-in response');
});

router.post('/sign-out', (req, res) => {
  res.send('POST /api/auth/sign-out response');
});

export default router;

