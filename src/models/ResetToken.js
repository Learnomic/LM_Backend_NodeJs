import mongoose from 'mongoose';

const resetTokenSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        ref: 'UserCredential'
    },
    token: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // Token will be automatically deleted after 1 hour
    }
}, {
    collection: 'ResetTokens'
});

const ResetToken = mongoose.model('ResetToken', resetTokenSchema);

export default ResetToken; 