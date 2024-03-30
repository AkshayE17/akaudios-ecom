// adminRoutes.js - Admin routes

import express from 'express';
import adminController from '../controllers/adminController.js';
import couponController from '../controllers/couponController.js';
import { isLogin, isLogout } from '../middleware/adminauth.js';


const adminRoute = express.Router();

adminRoute.get('/',adminController.loadAdminlogin);
adminRoute.post('/',adminController.verifyLogin);
adminRoute.get('/home', isLogin, adminController.homeLoad);
adminRoute.post('/adminRegistration', isLogout, adminController.adminRegistration);
adminRoute.get('/customers', isLogin, adminController.adminDashboard);
adminRoute.post('/customers/block', isLogin, adminController.blockUnblockUser);
adminRoute.get('/adminlogout', isLogin, adminController.adminLogout);
adminRoute.get('/orders', isLogin, adminController.viewAllOrders);
adminRoute.get('/order/:id', isLogin, adminController.viewOrderDetails);
adminRoute.get('/sales', isLogin, adminController.getSalesReport);
adminRoute.get('/productoffer',isLogin,adminController.loadaddProductoffer);
adminRoute.post('/productoffer',isLogin,adminController.addproductoffer);
adminRoute.post('/productoffer/delete/:id', isLogin, adminController.deleteProductOffer);
adminRoute.get('/categoryoffer',isLogin,adminController.loadAddCategoryOffer);
adminRoute.post('/categoryoffer',isLogin,adminController.addCategoryOffer);
adminRoute.post('/categoryoffer/delete/:id', isLogin, adminController.deleteCategoryOffer);
adminRoute.get('/coupon',isLogin,couponController.loadCouponpage);
adminRoute.get('/addcoupon',isLogin,couponController.loadaddCouponpage);
adminRoute.post('/addcoupon',isLogin,couponController.addCoupon);
adminRoute.post('/coupon/delete/:id', isLogin, couponController.deleteCoupon);


export default adminRoute;