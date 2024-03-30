import coupondb from "../models/couponModel.js";

const loadCouponpage = async (req, res) => {
  try {
     const page = parseInt(req.query.page) || 1;
     const couponsPerPage = 4; 
     const totalCoupons = await coupondb.countDocuments();
     const totalPages = Math.ceil(totalCoupons / couponsPerPage);
 
     const coupons = await coupondb
       .find({})
       .skip((page - 1) * couponsPerPage)
       .limit(couponsPerPage);
 
     res.render("coupons", { coupons, currentPage: page, totalPages, couponsPerPage });
  } catch (error) {
     console.error("Error loading coupon page:", error);
     res.render("adminerror");
  }
 };
 


const loadaddCouponpage = async (req, res) => {
  try {
    res.render("addcoupons");
  } catch (error) {
    console.log("error:", error);
  }
};

const addCoupon = async (req, res) => {
  try {
    console.log("going to add coupon :");
    const { code, discount, minPrice, maxPrice, startDate, expiryDate } = req.body;

    const existingCoupon = await coupondb.findOne({ code });
    if (existingCoupon) {
      return res.status(400).json({ error: 'Coupon code must be unique' });
    }

    if (parseFloat(discount) <= 0) {
      return res.status(400).json({ error: 'Discount price must be greater than zero' });
    }

    if (parseFloat(minPrice) <= 0 || parseFloat(maxPrice) <= 0 || parseFloat(maxPrice) <= parseFloat(minPrice)) {
      return res.status(400).json({ error: 'Minimum and maximum prices must be positive, and maximum price must be greater than minimum price' });
    }

    // Validate start and expiry dates
    const start = new Date(startDate);
    const expiry = new Date(expiryDate);
    if (start >= expiry) {
      return res.status(400).json({ error: 'Expiry date must be after the start date' });
    }

    const newCoupon = new coupondb({
      code,
      discount: parseFloat(discount),
      minPrice: parseFloat(minPrice),
      maxPrice: parseFloat(maxPrice),
      startDate: start,
      expiryDate: expiry
    });

    await newCoupon.save();

    console.log("new coupon:", newCoupon);
    return res.status(200).json({ success: 'Coupon added successfully' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'An error occurred while adding the coupon' });
  }
};



const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    // Find the coupon by ID and delete it from the database
    await coupondb.findByIdAndDelete(couponId);
    res.redirect("/admin/coupon");
  } catch (error) {
    console.log(error);
  }
};

export default {
  loadCouponpage,
  loadaddCouponpage,
  addCoupon,
  deleteCoupon
};
