// import express from 'express';
// const router = express.Router();
// import { getUserProfile, updateUserProfile, getUserSubjectProgress, getUserProgress } from '../controllers/userController.js';
// import protect from '../middleware/authMiddleware.js'; 

// // Protected Routes
// router.get('/profile', protect, getUserProfile);
// router.put('/update_profile', protect, updateUserProfile);
// router.get('/progress', protect, getUserProgress);
// router.get('/subject-progress', protect, getUserSubjectProgress);

// export default router; 




// routes/userRoutes.js
import express from 'express';
import protect  from '../middleware/authMiddleware.js';
import { upload } from '../config/Azure/azureStore.js';
import {
  getUserProfile,
  updateUserProfile,
  getUserSubjectProgress,
  getUserProgress,
  uploadProfilePicture,
  deleteProfilePicture
} from '../controllers/userController.js';

const router = express.Router();

// Existing routes
router.get('/profile',protect, getUserProfile);
router.put('/update_profile',protect, updateUserProfile);
router.get('/subject-progress',protect, getUserSubjectProgress);
router.get('/progress',protect, getUserProgress);

// New routes for profile picture management
router.post('/upload-profile-picture',protect, upload.single('profilePicture'), uploadProfilePicture);

router.delete('/delete-profile-picture',protect, deleteProfilePicture);

export default router;