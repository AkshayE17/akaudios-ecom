import mongoose from "mongoose";
const otpSchema = mongoose.Schema({
  email:{type:String,required:true},
  otp:{type:Number,required:true},
  createAt:{type:Date,default:Date.now},
  expiry:{type:Date,expires:'3m',default:Date.now()+180000}
})

module.exports = mongoose.model('Otp',otpSchema)