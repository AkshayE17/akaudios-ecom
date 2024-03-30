import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      unique: true,
      collation: { locale: 'en', strength: 2 }, // Added collation for case-insensitivity
    },
    categoryImg: {
       type: String
       },
    isDeleted: { 
      type: Boolean, 
      default: false
     },
  },
  { unique: false }
);

export default mongoose.model('Category', categorySchema);
