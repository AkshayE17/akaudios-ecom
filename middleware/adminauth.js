// adminauth.js - Authentication middleware

const isLogin = (req, res, next) => {
  try {
    const admin = req.session.admin_id;
    if (admin) {
      // User is logged in, continue to the next middleware or route handler
      next();
    } else {
      // User is not logged in, redirect to the login page
      res.redirect('/admin');
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
};

const isLogout = (req, res, next) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        res.status(500).send('Internal Server Error');
      } else {

        res.redirect('/admin');
      }
    });
  } catch (error) {
    console.error('Error logging out admin:', error);
    res.status(500).send('Internal Server Error');
  }
};

export { isLogin, isLogout };
