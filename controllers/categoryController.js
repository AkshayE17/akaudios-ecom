import categoryModel from '../models/categoryModel.js';
import multer from 'multer';
import path from 'path';
import mongoose from 'mongoose';

const storage = multer.diskStorage({
  destination: function (req,file,cb) {
    cb(null,'uploads/category');
  },
  filename:function(req,file,cb){
     cb(null,Date.now() + path.extname(file.originalname));
  },
})


const upload = multer({storage:storage});

const loadCategory = async (req, res) => {
  try {
    const fetchAllCategories = await categoryModel.find();
    res.render('category', { categories: fetchAllCategories });
    console.log("categories:",fetchAllCategories);
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
};



const addCategoryPage = (req, res) => {
  try {
    res.render('addCategory');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};



const addCat = async (req, res) => {
  try {
    const categoryName = req.body.newCategoryName;
    const existingCategory = await categoryModel.findOne({ categoryName });

    if (existingCategory) {
      res.render("addcategory", { success: false, msg: "Category already exists" });
    } else {
      const category = new categoryModel({
        categoryName,
        categoryImg: req.file ? req.file.filename : undefined,
      });

      const cat_data = await category.save();
      res.render("addcategory", { success: true, msg: "Category added successfully" });
    }
  } catch (error) {
    res.render("addcategory", { success: false, msg: "Error adding category" });
  }
};

const editCategoryPage = async (req, res) => {
  try {
    const categoryId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).render('error', { message: 'Invalid category ID', success: false, msg: '', category: {} });
    }

    console.log('Editing category with ID:', categoryId);

    const fetchCat = await categoryModel.findById({ _id: categoryId });

    if (fetchCat) {
      console.log('Fetched category data:', fetchCat);
      res.render('editCategory', { category: fetchCat, success: true, msg: '' });
    } else {
      return res.status(404).render('error', { message: 'Category not found', success: false, msg: '', category: {} });
    }
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Internal Server Error', success: false, msg: '', category: {} });
  }
};




const editCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await categoryModel.findById({ _id: categoryId });

    category.categoryName = req.body.editCategoryName;
    category.categoryImg = req.file ? req.file.filename : category.categoryImg;

    await category.save();
    const fetchAllCategories = await categoryModel.find();

    res.render('category', { categories: fetchAllCategories, success: true, msg: 'Category edited successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};


const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const deletedCategory = await categoryModel.findOneAndDelete({ _id: categoryId });

    if (deletedCategory) {
      console.log('Deleted category:', deletedCategory);
      const fetchAllCategories = await categoryModel.find();
      const successMessage = "Category has been deleted";
      res.render('category', { categories: fetchAllCategories, success: true, msg: successMessage });
    } else {
      console.log('Category not found for deletion:', categoryId);
      res.status(404).render('error', { message: 'Category not found', success: false, msg: '', category: {} });
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).render('error', { message: 'Internal Server Error', success: false, msg: '', category: {} });
  }
};




export default {
  loadCategory,
  addCategoryPage,
  // addCategory,
  upload,
  addCat,
  editCategoryPage,
  editCategory,
  deleteCategory
};