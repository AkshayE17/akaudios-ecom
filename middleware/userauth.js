import userModel from "../models/userModel.js";

const isLogin = async (req, res, next) => {
  try {
    if (req.session.userId) {
      return next();
    } else {
      res.redirect('/login');
    }
  } catch (error) {
    console.error("Error in isLogin middleware:", error.message);
    res.status(500).render('error', { error: 'Internal Server Error' });
  }
};

const isLogout = async (req, res, next) => {
  try {
    if (!req.session.userId) { // Check if the user is not logged in
      return next();
    } else {
      res.redirect('/'); // Redirect logged-in users to the home page
    }
  } catch (error) {
    console.error("Error in isLogout middleware:", error.message);
    res.status(500).render('error', { error: 'Internal Server Error' });
  }
};

const isBlocked = async (req, res, next) => {
  try {
    if (req.session.userId) {
      const user = await userModel.findById(req.session.userId);
      if (user.is_blocked) {
        delete req.session.userId;
        return res.redirect('/login');
      }
    }
    next();
  } catch (error) {
    console.error("Error in isBlocked middleware:", error.message);
    res.status(500).render('error', { error: 'Internal Server Error' });
  }
};



export default {
  isLogin,
  isLogout,
  isBlocked
  
};
