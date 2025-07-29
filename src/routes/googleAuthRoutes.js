import express from 'express';
import { googleSignIn, completeGoogleProfile } from '../controllers/googleAuthController.js';
import protect from '../middleware/authMiddleware.js'; // Assuming you have auth middleware

const router = express.Router();

router.post('/google-signin', googleSignIn);

export default router;