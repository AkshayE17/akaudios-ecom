import express from 'express';
import bannerController from "../controllers/bannerController.js";
import { isLogin, isLogout } from '../middleware/adminauth.js';

const bannerRoute=express();

import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
 destination: function(req, file, cb) {
    cb(null, 'uploads/banners'); 
 },
 filename: function(req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
 }
});

const upload = multer({ storage: storage });


bannerRoute.get('/',isLogin,bannerController.loadBanner);
bannerRoute.post('/', upload.single('image'),isLogin,bannerController.addBanner);
bannerRoute.get('/editbanner/:id',isLogin,bannerController.loadupdateBanner);
bannerRoute.post('/editbanner/:id', upload.single('image'),isLogin, bannerController.updateBanner);
bannerRoute.post('/delete/:id', isLogin, bannerController.deleteBanner);



export default bannerRoute;