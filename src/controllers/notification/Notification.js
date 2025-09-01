// models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    board: {
        type: String,
        default: null
    },
    grade: {
        type: String,
        default: null
    },
    medium: {
        type: String,
        default: null
    },
    sentTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    sentCount: {
        type: Number,
        default: 0
    },
    failedCount: {
        type: Number,
        default: 0
    },
    type: {
        type: String,
        enum: ['general', 'announcement', 'reminder', 'update'],
        default: 'general'
    }
}, {
    collection: 'Notifications',
    timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;