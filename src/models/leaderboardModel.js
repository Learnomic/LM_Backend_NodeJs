import mongoose from 'mongoose';

const leaderboardSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        score: {
            type: Number,
            required: true,
        },
        dateAchieved: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

export default Leaderboard;
