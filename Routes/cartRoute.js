import express from 'express';
import cartController from '../controllers/cartController.js';


const cartRoute = express();


cartRoute.get('/loadcart', cartController.loadCart);
cartRoute.post('/add-to-cart/:id', cartController.addToCart);
cartRoute.post('/remove-from-cart/:productId', cartController.removeFromCart);
cartRoute.post('/update-quantity', cartController.updateQuantity);
cartRoute.get('/count', cartController.getCartCount);
cartRoute.post('/applycoupon',cartController.applyCoupon);
cartRoute.post('/removecoupon',cartController.removeCoupon);
cartRoute.get('/wishlist',cartController.loadWishlist);
cartRoute.post('/add-to-wishlist/:id',cartController.addToWishlist);
cartRoute.post('/remove-from-wishlist/:id',cartController.removeFromWishlist)


export default cartRoute;
