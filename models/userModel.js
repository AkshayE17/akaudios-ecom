
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobile: { type: String, required: true },
  is_blocked: { type: Boolean, default:false },
  is_Online: {type: Boolean , default:false}
});

export default mongoose.model('User', userSchema);