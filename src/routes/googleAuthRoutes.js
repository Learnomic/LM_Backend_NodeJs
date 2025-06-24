import express from 'express';
import { googleSignIn, signIn } from '../controllers/googleAuthController.js';

const router = express.Router();

router.post('/google-signin', googleSignIn);
router.post('/signin', signIn);

export default router;