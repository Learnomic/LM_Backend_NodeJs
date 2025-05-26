import mongoose from 'mongoose';

const badgeSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        dateEarned: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const Badge = mongoose.model('Badge', badgeSchema);

export default Badge;
