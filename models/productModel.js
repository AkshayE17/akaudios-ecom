import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true, unique: true },
  description:{type:String,required:true},
  price:{type:Number,required:true},
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  stockCount:{type:Number},
  colour:{type:String,require:true},
  productImg: { type: Array },
  isDeleted: { type: Boolean, default: false }
}, 

{ unique: false }); 

export default mongoose.model('product', productSchema);