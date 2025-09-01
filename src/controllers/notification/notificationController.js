// controllers/notificationController.js
import admin from 'firebase-admin';
import User from '../../models/User.js';
import Notification from './Notification.js';

// Initialize Firebase Admin SDK (add this to your main server file or create a separate config)
// Make sure to download your Firebase service account key and add it to your project
// import { createRequire } from 'module';
// const require = createRequire(import.meta.url);

// const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}


// Send notification to users
export const sendNotification = async (req, res) => {
    try {
        const { title, text, board, grade, medium } = req.body;

        // Validate required fields
        if (!title || !text) {
            return res.status(400).json({
                success: false,
                message: "Title and text are required"
            });
        }

        // Build query for filtering users
        let userQuery = {};
        
        if (board) {
            userQuery.board = board;
        }
        
        if (grade) {
            userQuery.grade = grade;
        }
        
        if (medium) {
            // For users with medium array (SSC board)
            userQuery.medium = { $in: Array.isArray(medium) ? medium : [medium] };
        }

        console.log('User query:', userQuery);

        // Find users based on criteria
        const users = await User.find(userQuery).select('_id name email board grade medium fcmToken');
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No users found matching the criteria"
            });
        }

        console.log(`Found ${users.length} users matching criteria`);

        // Get FCM tokens (filter out users without tokens)
        const fcmTokens = users
            .map(user => user.fcmToken)
            .filter(token => token && token.trim() !== '');

        if (fcmTokens.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No users have FCM tokens registered"
            });
        }

        console.log(`Sending notifications to ${fcmTokens.length} devices`);

        // Create notification payload
        const message = {
            notification: {
                title: title,
                body: text,
            },
            data: {
                type: 'general',
                board: board || '',
                grade: grade || '',
                medium: medium || '',
                timestamp: new Date().toISOString()
            },
            tokens: fcmTokens
        };

        // Send notification using Firebase Admin SDK
        const response = await admin.messaging().sendEachForMulticast(message);

        console.log('Firebase response:', response);

        // Save notification to database
        const notification = new Notification({
            title,
            text,
            board: board || null,
            grade: grade || null,
            medium: medium || null,
            sentTo: users.map(user => user._id),
            sentCount: response.successCount,
            failedCount: response.failureCount,
            createdAt: new Date()
        });

        await notification.save();

        // Handle failed tokens (optional - remove invalid tokens)
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(fcmTokens[idx]);
                    console.log('Failed token:', fcmTokens[idx], 'Error:', resp.error);
                }
            });

            // Optionally remove invalid tokens from users
            if (failedTokens.length > 0) {
                await User.updateMany(
                    { fcmToken: { $in: failedTokens } },
                    { $unset: { fcmToken: 1 } }
                );
            }
        }

        res.status(200).json({
            success: true,
            message: `Notification sent successfully to ${response.successCount} users`,
            data: {
                totalUsers: users.length,
                successCount: response.successCount,
                failureCount: response.failureCount,
                notification: {
                    title,
                    text,
                    board,
                    grade,
                    medium
                }
            }
        });

    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({
            success: false,
            message: "Error sending notification",
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Get notification history
export const getNotificationHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sentTo', 'name email board grade');

        const total = await Notification.countDocuments();

        res.status(200).json({
            success: true,
            data: {
                notifications,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get notification history error:', error);
        res.status(500).json({
            success: false,
            message: "Error fetching notification history",
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};