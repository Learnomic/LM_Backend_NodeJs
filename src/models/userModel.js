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
            required: true,
        },
        board: {
            type: String,
            required: true,
        },
        grade: {
            type: Number,
            required: true,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
        badges: {
            type: [String],
            default: []
        },
    },
    {
        timestamps: true,
    }
);

// Check if the model already exists before defining it
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;