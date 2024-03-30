import mongoose from "mongoose";
const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  billingAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
       required:true,
     },
     deliveryAddress: { type: mongoose.Schema.Types.ObjectId, 
      ref: 'Address' },
     totalAmount:{  
      type:Number,

     },
     items:[
      {
        product_id:{
          type:mongoose.Types.ObjectId,
          ref:"product",
          required:true,
        },
        quantity:{
          type:Number,
          required:true
        },
        price:{
          type:Number,
          required:true
        },
        status:{
          type:String,
          enum:['pending','shipped','delivered','cancelled','returned'],
          default:'pending',
          required:true
        },
      }
     ],
     payment:{
      type:String,
      required:true
     },
     paymentStatus: {  // Add this field
      type: String,
      enum: ['Pending', 'Completed'],
      default: 'Pending',
      required: true
    },
     createdAt:{
      type:Date,
      default:Date.now
     },
     updateAt:{
      type:Date,
      default:null,
     },
})

export default mongoose.model('Order', orderSchema);
