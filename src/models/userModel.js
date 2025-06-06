import mongoose from 'mongoose';

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: function() {
                return !this.googleId; // Password is required only if not using Google auth
            },
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true,
        },
        board: {
            type: String,
        },
        grade: {
            type: Number,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
        badges: {
            type: [String],
            default: []
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Check if the model already exists before defining it
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;