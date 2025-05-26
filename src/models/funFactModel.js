import mongoose from 'mongoose';

const funFactSchema = mongoose.Schema(
    {
        fact: {
            type: String,
            required: true,
        },
        source: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

const FunFact = mongoose.model('FunFact', funFactSchema);

export default FunFact;
