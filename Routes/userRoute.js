import express from 'express';
const userRoute = express();
import userController from '../controllers/userController.js';
import wallerController from '../controllers/wallerController.js';
import auth from '../middleware/userauth.js';
import productController from '../controllers/productController.js';

userRoute.set('view engine', 'ejs');
userRoute.set('views', './views/users');

userRoute.get('/', userController.homeLoad);
userRoute.get('/registration', auth.isLogout, userController.loadRegister);
userRoute.post('/registration',auth.isLogout, userController.signup);
userRoute.post('/verify',auth.isLogout, userController.verifyotp);
userRoute.get('/login', auth.isLogout, userController.loginLoad);
userRoute.post('/login', userController.verifyLogin);
userRoute.get('/userdashboard',auth.isLogin,auth.isBlocked, userController.userdashLoad);
userRoute.get('/userdetails',auth.isLogin,auth.isBlocked, userController.userDetails);
userRoute.get('/editdetails', auth.isLogin,userController.editUserDetailsLoad);
userRoute.post('/update-profile',auth.isLogin ,userController.updateUserDetails);
userRoute.get('/updatepassword', auth.isLogin,userController.loadUpadatepasword);
userRoute.post('/updatepassword',userController.updatePassword);
userRoute.get('/logout',auth.isLogin, userController.userLogout);
userRoute.get('/forgot-password', auth.isLogout, userController.forgotPasswordLoad);
userRoute.post('/forgot-password', auth.isLogout,userController.forgotPassword);
userRoute.post('/forgot-otp', auth.isLogout,userController.forgototp);
userRoute.post('/change-password',auth.isLogout,auth.isBlocked, userController.changePassword);
userRoute.get('/product/:id', productController.productDetails);
userRoute.get('/productfilter',productController.loadProductfiller);
userRoute.post('/filterProducts', productController.filterProducts);
userRoute.get('/wallet',auth.isLogin,wallerController.loadwallet);
userRoute.post('/addwallet',auth.isLogin,wallerController.addwallet);
userRoute.post('/wallet/addMoney',auth.isLogin,wallerController.addMoney);

export default userRoute;  