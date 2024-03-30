import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    minPrice: {
        type: Number,
        required: true
    },
    maxPrice: {
        type: Number,
        required: true
    },
    startDate: {
      type: Date,
      required: true 
  },
    expiryDate: {
        type: Date,
        required: true 
    }
});

couponSchema.methods.isExpired = function() {
    return this.expiryDate < new Date();
};

const coupondb = mongoose.model('coupondbs', couponSchema);

export default coupondb;
