import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  image: { type: String, required: true },
  color: { type: String, required: true }, 
});

export default mongoose.model('banner', bannerSchema);
 