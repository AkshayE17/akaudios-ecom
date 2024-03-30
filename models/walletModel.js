import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userWalletSchema = new Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    walletBalance: {
        type: Number,
        default: 0,
    },
    transactions: [
        {
            amount: {
                type: Number
            },
            type: {
                type: String, 
                required: true
            },
            transactionDate: {
                type: Date,
                default: Date.now(),
            },
        }
    ]
});

export default model('UserWallet', userWalletSchema);