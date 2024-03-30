import mongoose from 'mongoose';

const { Schema } = mongoose;

const cartSchema = new Schema({
    user_id: {
        type: mongoose.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    items: [
        {
            product_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "product",
                required: true
            },
            quantity: {
                type: Number,
                default: 1,
            },
            price: {
                type: Number,
                required: true
            }
        }
    ],
    totalPrice: {
        type: Number,
        default: 0
    },
});

export default mongoose.model("Cart", cartSchema);
