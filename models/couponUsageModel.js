import mongoose from 'mongoose';

const couponUsageSchema = new mongoose.Schema({
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const CouponUsage = mongoose.model('CouponUsage', couponUsageSchema);

export default CouponUsage;
