import userModel from '../models/userModel.js'; 
import categoryModel from '../models/categoryModel.js';
import productModel from '../models/productModel.js';
import productOfferModel from '../models/productofferModel.js';
import categoryOfferModel from '../models/categoryofferModel.js';
import walletModel from '../models/walletModel.js';
import bannerModel from '../models/bannerModel.js';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import Mailgen from 'mailgen';
import Swal from 'sweetalert2';
import { v4 as uuidv4 } from 'uuid';


const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    throw error;
  }
};


const homeLoad = async (req, res) => {
  try {
    const categories = await categoryModel.find();
    const products = await productModel.find();
    const productOffers = await productOfferModel.find();
    const categoryOffers = await categoryOfferModel.find();
    const banners = await bannerModel.find();

    const isLoggedIn = req.session.isLoggedIn;
    const justLoggedInFromLoginPage = req.session.justLoggedInFromLoginPage || false; // Use this flag
    req.session.justLoggedInFromLoginPage = false; // Reset it

    const userId = req.session.userId;
    let userName = '';

    if (userId) {
      const userData = await userModel.findById(userId);
      userName = userData ? userData.name : '';
    }

    const productsWithOffer = products.map(product => {
      const productOffer = productOffers.find(offer => offer.product.toString() === product._id.toString());
      const categoryOffer = categoryOffers.find(offer => offer.category.toString() === product.category.toString());
      const offerPercentage = productOffer ? productOffer.productOffer : 0;
      const categoryOfferPercentage = categoryOffer ? categoryOffer.categoryOffer : 0;
      const finalOfferPercentage = Math.max(offerPercentage, categoryOfferPercentage);
      const offerPrice = product.price * (1 - finalOfferPercentage / 100);
      const roundedOfferPrice = Math.round(offerPrice);

      return {
        ...product.toObject(),
        offerPrice: roundedOfferPrice,
        offerPercentage: finalOfferPercentage,
      };
    });

    res.render("userHome", { req, categories, products: productsWithOffer, isLoggedIn, justLoggedInFromLoginPage, userName, banners });
  } catch (error) {
    console.log("Error from homeLoad", error);
    res.status(500).render('error', { error: 'Internal Server Error' });
  }
};

 
const loadRegister = async (req, res) => {
  try {
     const categories = await categoryModel.find(); 
     res.render('userRegistration', { req, categories, emailExists: false });
  } catch (error) {
     console.log(error.message);
     res.render('error');
  }
 };

 let gname, gpassword, gemail, gmobile;
 var otp;
 
 const otpgenerator = () => {
   otp = Math.floor(100000 + Math.random() * 900000); // Ensures a 6-digit number
   console.log(otp);
 };
 
 function sendOtp(email, OTP) {
   let config = {
     service: "gmail",
     auth: {
       user: "akshaykumar2002817@gmail.com",
       pass: "cpdf hmcp sdsm odtn",
     },
   };
 
   const transport = nodemailer.createTransport(config);
 
   let mailGenerator = new Mailgen({
     theme: "default",
     product: {
       name: "Mailgen",
       link: "http://mailgen.js/",
     },
   });
 
   let response = {
     body: {
       name: `${email}`,
       intro: `Your OTP is ${otp}`,
       outro: "Looking forward",
     },
   };
 
   let mail = mailGenerator.generate(response);
 
   let message = {
     from: "akshaykumar2002817@gmail.com",
     to: email, // Define the recipient's email address here
     subject: "Otp sent successfully",
     html: mail,
   };
 
   transport.sendMail(message);
 }


const signup = async (req, res) => {
  try {
     const categories = await categoryModel.find();
     gname = req.body.name;
     gemail = req.body.email;
     gpassword = await securePassword(req.body.password);
     gmobile = req.body.mobile;
 
     const existuser = await userModel.findOne({ email: gemail });
     if (existuser) {
       // Send a flag indicating the email already exists
       return res.render("userRegistration", { categories, req, emailExists: true });
     }
     
     otpgenerator();
     sendOtp(gemail, otp);
 
     res.render("otp", { req, categories, email: gemail, message: "Enter the otp" });
 
  } catch (error) {
     console.log("Error in signup:", error);
  }
 };


 const verifyotp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    const categories = await categoryModel.find();
    if (enteredOtp == otp) {
      const user = new userModel({
        name: gname,
        email: gemail,
        password: gpassword,
        mobile: gmobile,
      });
      const userData = await user.save();
      await userModel.updateOne({ _id: userData._id }, { $set: { is_Online: true } });

      const userWallet = new walletModel({
        userId: userData._id, 
        walletBalance: 0, 
        transactions: [], 
      });
      await userWallet.save();

      if (userData) {
        res.redirect("/login");
      } else {
        res.render("userRegistration", {req,categories, message: "Registration failed" });
      }

      // Pass the otp value as a parameter to the sendOtp function
      sendOtp(gemail, otp);
    } else {
      res.render("otp", { req,categories,email: gemail, message: "Incorrect OTP. Please try again." });
    }
  } catch (error) {
    console.log("Error in verifyotp:", error);
  res.status(404).render('error', { message: 'User not found' });
  }
};


const loginLoad = async (req, res) => {
  try {
    const categories = await categoryModel.find(); // Fetch categories from the database
    res.render('userLogin', { req, categories, message: "" }); // Pass categories and message to the view
  } catch (error) {
    console.log("Error from loginLoad", error);
  }
};


const verifyLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const userData = await userModel.findOne({ email: email });
    const categories = await categoryModel.find(); // Fetch categories from the database
    if (userData) {
      if (userData.is_blocked) {
        return res.render("userLogin", { req, categories, message: "User is blocked. Please contact support." });
      }

      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        req.session.userId = userData._id;
        req.session.isLoggedIn = true;
        req.session.justLoggedInFromLoginPage = true; // Set this variable to true when coming from the login page
        req.session.userName = userData.name;
        await userModel.findByIdAndUpdate(
          { _id: userData._id },
          { $set: { is_Online: true } }
        );

        // Redirect to the home page
        res.redirect("/");
      } else {
        res.render("userLogin", { req, categories, message: "Password is incorrect" });
      }
    } else {
      res.render("userLogin", { req, categories, message: "User not found. Please sign up." });
    }
  } catch (error) {
    console.log(error.message);
  }
};


 


const userdashLoad = async (req, res) => {
  try {
    const categories = await categoryModel.find();
    const user = await userModel.findById(req.session.userId);
    if (user) {
      // Check if the user has just logged in
      const isLoggedIn = req.session.isLoggedIn;
      // Clear the session flag
      delete req.session.isLoggedIn;
      // Render the userDashboard template with the user's email, categories, and isLoggedIn flag
      res.render("userDashboard", { req, categories, userEmail: user.email, isLoggedIn });
    } else {
      // Handle the case where user details are not found
      res.status(404).render('error', { message: 'User not found' });
    }
  } catch (error) {
    console.log("Error from userdashLoad", error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
};



const userDetails = async(req,res)=>{
  try{
    const categories = await categoryModel.find();
    const user = await userModel.findById(req.session.userId);

    if (user) {
      // Render the user details template with the user data
      res.render("userdetails", { req, user ,categories});
    } else {
      // Handle the case where user details are not found
      res.status(404).render('error', { message: 'User not found' });
    }
  }
  catch(error){
    console.log("Error from uuserdetails", error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
}

const editUserDetailsLoad = async (req, res) => {
  try {
    const categories = await categoryModel.find();
    // Fetch the current user's details from the database
    const user = await userModel.findById(req.session.userId);

    if (user) { 
      // Render the edit user details page with the user's current details
      res.render("userdetailsEdit", { user,categories,req });
    } else {
      // Handle the case where user details are not found
      res.status(404).render('error', { error: 'User not found' });
    }
  } catch (error) {
    console.log("Error from editUserDetailsLoad", error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
};

const updateUserDetails = async (req, res) => {
  try {
    // Extract updated user details from the form submission
    const { name, mobile, email, gender, dob, location } = req.body;

    // Find the user by ID and update their details
    await userModel.findByIdAndUpdate(req.session.userId, {
      name,
      mobile,
      email,
      gender,
      dob,
      location
    });

    // Redirect the user to a confirmation page or back to the profile page
    res.redirect("/userdetails");
  } catch (error) {
    console.log("Error from updateUserDetails", error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
};


//load changepassword page
const loadUpadatepasword = async (req, res) => {
  try {

    const userId = req.session.userId;

    if(!userId){
     res.redirect('/login')
    }
    const categories = await categoryModel.find();
    res.render('updatepassword', { categories, req, message: "" });
  } catch (error) {
    console.log("Error from update password load page", error);
    res.status(500).render('error', { error: 'Internal Server Error' });
  }
}


const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const categories= await categoryModel.find();
    // Validate new passwords
    if (newPassword !== confirmPassword) {
      return res.status(400).render('updatepassword', { req,categories,message:{type: 'error' , text: "New password and confirm password do not match" }});

    }
    // Add additional validation rules for new password if necessary

    const userId = req.session.userId;
    const user = await userModel.findById(userId);

    if (!user || !user.password) {
      return res.status(400).render('updatepassword', { req,categories,message:{type: 'error' , text: "User or user's password not found" }});
    }

    // Check if the current password matches the user's actual password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    console.log("validationn:", isPasswordValid);
    if (isPasswordValid==false) {
      return res.status(400).render('updatepassword', { req,categories,message:{type: 'error' , text: "Current password is incorrect" }});
    }else{
     console.log("new pass:",newPassword);

      const hashedNewPassword = await bcrypt.hash(newPassword, 10); // Here, '10' is the saltRounds parameter


    // Update the user's password
    user.password = hashedNewPassword;
    await user.save();

    }

    // Hash the new password
    res.render('updatepassword', { req,categories,message:{type:'success',text:'Password updated successfully'} });

  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).render('error', { message: "Failed to update password" });
  }
};


const userLogout = async (req, res) => {
  try {

    if (req.session.userId) {
      await userModel.findByIdAndUpdate(
        { _id: req.session.userId },
        { $set: { is_Online: false } }
      );

     delete  req.session.userId;
      res.redirect('/');
    } else {
      res.redirect('/');
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
};

const forgotPasswordLoad =async (req, res) => {
  try{
    const categories = await categoryModel.find();
    res.render('forgot-password', { categories,req,email: req.body.email, message: "verify email"});
  }
  catch{
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
};




const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const categories = await categoryModel.find();
    otpgenerator();
    const resetToken = otp;
    const userEmail= await userModel.find({email:email});
   
    if(userEmail.length>0){
      sendOtp(email, resetToken);
      res.render("forgot-otp", {categories,req, email, message: "OTP sent successfully" });
    }
    else{

     res.render('forgot-password', { categories,req,email: req.body.email, error: "User is found with that email"});
    }
  } catch (error) {
    console.log('Error in forgotPassword:', error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
};


const forgototp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    const userEmail = req.body.email;
    const categories = await categoryModel.find();
    
    console.log('Email:', userEmail);
    // Check if the entered OTP matches the stored OTP in your system
    if (enteredOtp == otp) {
      // Render a page for the user to enter a new password
      res.render("newpassword", {categories,req, email: userEmail, message: "" });
    } else {
      res.render("forgot-otp", { categories,req,email: userEmail, message: "Incorrect OTP. Please try again." });
    }
  } catch (error) {
    console.log("Error in forgototp:", error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const email = req.body.email;
    const newPassword = req.body.newPassword;
    const confirmPassword = req.body.confirmPassword;
    const categories = await categoryModel.find();
    console.log('Email:', email);
    if (newPassword !== confirmPassword) {
      return res.render('newpassword', { categories,req,email, message: 'New password and confirm password do not match. Please try again.' });
    }
    const hashedPassword = await securePassword(newPassword);
    console.log('Hashed Password:', hashedPassword);
    const result = await userModel.updateOne({ email }, { $set: { password: hashedPassword } });
    console.log('Result from password update:', result);
    if (result.modifiedCount == 1) {
      return res.render('userLogin', { categories,req,message: 'Password changed successfully. Please log in with your new password.' });
    } else {
      return res.render('newpassword', { categories,req,email, message: 'Failed to change password. Please try again.' });
    }
  } catch (error) {
    console.error('Error in changePassword:', error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
};

export default {
  homeLoad,
  loginLoad,
  loadRegister,
  signup,
  verifyotp,
  verifyLogin,
  userdashLoad,
  userLogout,
  forgotPasswordLoad,
  forgotPassword,
  forgototp,
  changePassword,
  userDetails,
  editUserDetailsLoad,
  updateUserDetails,
  updatePassword,
  loadUpadatepasword,
  // resendForgotPasswordOtp
};