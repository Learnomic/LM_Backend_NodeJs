// controllers/fcmController.js
import User from '../../models/User.js';

// Update user's FCM token
export const updateFCMToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        const userId = req.user._id; // From auth middleware

        if (!fcmToken) {
            return res.status(400).json({
                success: false,
                message: "FCM token is required"
            });
        }

        // Update user's FCM token
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.fcmToken = fcmToken;
        await user.save();

        console.log(`FCM token updated for user: ${user.email}`);

        res.status(200).json({
            success: true,
            message: "FCM token updated successfully"
        });

    } catch (error) {
        console.error('Update FCM token error:', error);
        res.status(500).json({
            success: false,
            message: "Error updating FCM token",
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};