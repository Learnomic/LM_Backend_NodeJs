import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a name'],
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please add a valid email',
            ],
        },
        password: {
            type: String,
            required: function() { return !this.isGoogleUser; },
            minlength: 6,
            select: false,
        },
        board: {
            type: String,
            required: [true, 'Please add a board'],
            enum: ['CBSE', 'ICSE', 'State Board'],
        },
        grade: {
            type: String,
            required: [true, 'Please add a grade'],
            enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        },
        school: {
            type: String,
        },
        div: {
            type: String,
        },
        pincode: {
            type: String,
        },
        profilePicture: {
            type: String
        },
        credential_id: {
            type: String,
            unique: true,
            sparse: true
        },
        resetPasswordToken: String,
        resetPasswordExpire: Date,
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

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Check if the model already exists before defining it and delete it
if (mongoose.models.User) {
  mongoose.deleteModel('User');
}
const User = mongoose.model('User', userSchema);

export default User;