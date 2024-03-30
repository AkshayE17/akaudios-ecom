import mongoose from 'mongoose';

const categoryOfferSchema = new mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    categoryOffer: {
        type: Number, // or any other type that represents the discount or offer for the category
        default: 0, // default to no offer
    },
});

export default mongoose.model("CategoryOffer", categoryOfferSchema);