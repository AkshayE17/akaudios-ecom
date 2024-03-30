import express from "express";
import productController from "../controllers/productController.js";
import multer from "multer";
import { isLogin } from '../middleware/adminauth.js';
const productRoute = express.Router();



// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/product');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });



productRoute.get('/',isLogin, productController.loadProducts);
productRoute.get('/addproduct', isLogin ,productController.loadAddproduct);
productRoute.post('/addproduct',isLogin, productController.upload.array('productImg', 4), productController.addProduct);
productRoute.get('/editProduct/:id', isLogin,productController.editProductPage); 
productRoute.post('/editProduct/:id', isLogin, upload.array('editProductImages', 4), productController.editProduct);
productRoute.post('/deleteImage/:productId/:imageName', productController.deleteProductImage);
productRoute.get('/deleteProduct/:id', isLogin,productController.deleteProduct);


export default productRoute;
