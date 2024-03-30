import express from 'express';
import orderController from '../controllers/orderController.js';
import auth from '../middleware/userauth.js';
const orderRoute = express();

orderRoute.get('/checkoutaddress',orderController.loadAddress);
orderRoute.get('/payment',orderController.loadPaymentmethod);
orderRoute.post('/placeOrder',orderController.placeOrder);
orderRoute.get('/thanku', orderController.loadThanku);
orderRoute.get('/razorthanku', orderController.loadrazorThanku);
orderRoute.get('/viewOrder',orderController.viewOrders);
orderRoute.post('/updateOrderStatus', orderController.updateOrderStatus);
orderRoute.post('/createOrder',orderController.createOrderWithRazorpay);  
orderRoute.post('/walletOrder',orderController.walletorder);  
orderRoute.get('/viewdetails/:orderId/:productId',orderController.vieworderdetails);
orderRoute.get('/downloadinvoice/:orderId/:productId',orderController.downloadinvoice);
orderRoute.get('/cancel/:orderId/:productId',orderController.orderCancel);
orderRoute.get('/return/:orderId/:productId',orderController.orderReturn);


export default orderRoute;