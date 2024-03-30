import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  addresses: [
    {
      name: {
        type: String,
        required: true
      },
      mobileNo: {
        type: String,
        required: true
      },
      pinCode: {
        type: String,
        required: true
      },
      address: {
        type: String,
        required: true
      },
      localityTown: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      extraMobileNo: {
        type: String,
        required: false // This field is optional
      },
      defaultAddress: {
        type: Boolean,
        default: false
      }
    }
  ]
});

export default mongoose.model('Address', addressSchema);

