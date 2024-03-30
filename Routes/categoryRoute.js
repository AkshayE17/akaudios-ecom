import express from 'express';
import categoryController from '../controllers/categoryController.js';
import { isLogin, isLogout } from '../middleware/adminauth.js';
const categoryRoute = express.Router();





categoryRoute.get('/', isLogin,categoryController.loadCategory);
categoryRoute.get('/addcategory', isLogin,categoryController.addCategoryPage);
categoryRoute.post('/addcategory',isLogin, categoryController.upload.single('newCategoryImage'), categoryController.addCat);
categoryRoute.get('/editCategory/:id',isLogin, categoryController.editCategoryPage); // Update the route to include the category ID
categoryRoute.post('/editCategory/:id',isLogin, categoryController.upload.single('editCategoryImage'), categoryController.editCategory);
categoryRoute.get('/deleteCategory/:id',isLogin, categoryController.deleteCategory);


export default categoryRoute;
