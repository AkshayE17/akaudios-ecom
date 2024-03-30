import express from 'express';
import addressController from '../controllers/addressController.js';

const addressRoute = express();

// Route to load the cart page
addressRoute.get('/loadSavedaddress', addressController.loadSavedAddress);
addressRoute.get('/loadAddaddress', addressController.loadAddaddress);
addressRoute.post('/addAddress',addressController.addAddress);
addressRoute.get('/editaddress/:id',addressController.loadEditaddress);
addressRoute.post('/editaddress/:id',addressController.editAddress);
addressRoute.get('/removeaddress/:id',addressController.removeAddress);

export default addressRoute;
