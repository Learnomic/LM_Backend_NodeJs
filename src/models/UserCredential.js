import mongoose from 'mongoose';

const userCredentialSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    }
}, {
    collection: 'UserCredentials'
});

const UserCredential = mongoose.model('UserCredential', userCredentialSchema);

export default UserCredential; 