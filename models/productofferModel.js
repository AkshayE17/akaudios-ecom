import mongoose from 'mongoose';

const productOfferSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product",
        required: true
    },
    productOffer: {
        type: Number, // or any other type that represents the discount or offer for the category
        default: 0, // default to no offer
    },
});

export default mongoose.model("ProductOffer", productOfferSchema);
