import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import userRoute from './Routes/userRoute.js';
import adminRoute from './Routes/adminRoute.js';
import categoryRoute from './Routes/categoryRoute.js';
import productRoute from './Routes/productRoute.js';
import cartRoute from './Routes/cartRoute.js';
import addressRoute from './Routes/addressRoute.js';
import orderRoute from './Routes/orderRoute.js';
import bannerRoute from './Routes/bannerRoute.js';
import flash from 'express-flash';
import dotenv from 'dotenv';
import session from 'express-session';
dotenv.config();

// Now you can access process.env.sessionSecret




const app = express();
const port = process.env.PORT || 5500;

app.use(session({ 
  secret: process.env.sessionSecret,
  resave: true,
  saveUninitialized: true
}));

app.use(flash());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('assets'));
app.use(express.static('adminassets'));
app.use(express.static('uploads'));
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', ['./views/users', './views/admin']);

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).render('error', { message: 'Internal Server Error' });
// });
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});



app.use('/', userRoute);
app.use('/admin', adminRoute);
app.use('/admin/category', categoryRoute);
app.use('/admin/products', productRoute);
app.use('/admin/banner',bannerRoute);
app.use('/cart', cartRoute);
app.use('/address', addressRoute);
app.use('/order', orderRoute);
app.use('/products', productRoute);

async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/project1');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
  }
}

connectToMongoDB();

app.listen(port, () => console.log(`Listening to the server on http://localhost:${port}/admin`));