import Cart from "../models/cartModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";
import cartModel from "../models/cartModel.js";
import categoryModel from "../models/categoryModel.js";
import Product from "../models/productModel.js";
import productOfferModel from "../models/productofferModel.js";
import categoryOfferModel from "../models/categoryofferModel.js";
import coupondb from "../models/couponModel.js";
import CouponUsage from "../models/couponUsageModel.js";
import Wishlist from "../models/wishlistModel.js";

const calculateOfferPrice = async (productDetails) => {
  try {
    const productOffer = await productOfferModel.findOne({
      product: productDetails._id,
    });
    const categoryOffer = await categoryOfferModel.findOne({
      category: productDetails.category,
    });

    const offerPercentage = Math.max(
      productOffer ? productOffer.productOffer : 0,
      categoryOffer ? categoryOffer.categoryOffer : 0
    );

    const offerPrice = productDetails.price * (1 - offerPercentage / 100);
    return offerPrice;
  } catch (error) {
    console.error("Error calculating offer price:", error);
    return productDetails.price;
  }
};

const loadCart = async (req, res) => {
  try {
    const currentUser = await userModel.findById(req.session.userId);
    const categories = await categoryModel.find();

    if (!currentUser) {
      return res.redirect("/login");
    } else {
      const cartDetails = await cartModel.aggregate([
        {
          $match: { user_id: currentUser._id },
        },
        {
          $unwind: "$items",
        },
        {
          $lookup: {
            from: "products",
            localField: "items.product_id",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        {
          $unwind: "$productDetails",
        },
      ]);

      const availableCoupons = await coupondb.find({
        expiryDate: { $gte: new Date() },
      });

      let couponApplied = false;
      let appliedCoupon = null;

      if (!cartDetails || cartDetails.length === 0) {
        return res.render("users/cart", {
          req,
          categories,
          cartDetails: [],
          totalAmount: 0,
          availableCoupons,
          couponApplied,
        });
      }
      for (const product of cartDetails) {
        const productOffer = await productOfferModel.findOne({
          product: product.productDetails._id,
        });
        const categoryOffer = await categoryOfferModel.findOne({
          category: product.productDetails.category,
        });
        const offerPercentage = Math.max(
          productOffer ? productOffer.productOffer : 0,
          categoryOffer ? categoryOffer.categoryOffer : 0
        );
        product.productDetails.offerPrice =
          product.productDetails.price * (1 - offerPercentage / 100);
      }

      const totalAmount = cartDetails.reduce((total, item) => {
        return total + item.items.quantity * item.productDetails.offerPrice;
      }, 0);

      const totalAmountInteger = Math.round(totalAmount);

      req.session.totalAmount = totalAmountInteger;
      let couponDiscount = 0;
      if (req.session.couponApplied) {
          // Assuming you have a way to calculate the discount based on the coupon
          couponDiscount = calculateCouponDiscount(req.session.couponApplied);
      }
      res.render("users/cart", {
        cartDetails,
        categories,
        totalAmountInteger,
        req,
        availableCoupons,
        couponApplied,
        appliedCoupon,
        couponDiscount,
        messages: req.flash(),
      });
    }
  } catch (error) {
    console.error("Error in loadCart:", error);
    res.status(500).render("users/error");
  }
};

const addToCart = async (req, res) => {
  try {
    const productId = req.params.id;
    const currentUser = await userModel.findById(req.session.userId);

    if (!currentUser) {
      return res.redirect("/login"); // Redirect to login if not logged in
    }

    const productData = await productModel.findById({ _id: productId });

    if (!productData) {
      return res.status(404).send("Product not found");
    }
    const offerPrice = await calculateOfferPrice(productData);

    let userCart = await Cart.findOne({ user_id: currentUser._id });

    if (!userCart) {
      userCart = new Cart({
        user_id: currentUser._id,
        items: [],
        totalPrice: 0,
      });
    }
    const existingProductIndex = userCart.items.findIndex((item) =>
      item.product_id.equals(productId)
    );

    if (existingProductIndex !== -1) {
      userCart.items[existingProductIndex].quantity += 1;
    } else {
      userCart.items.push({
        product_id: productId,
        quantity: 1,
        price: offerPrice,
      });
    }

    userCart.totalPrice = userCart.items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );

    await userCart.save();

    req.session.cartItemCount = req.session.cartItemCount
      ? req.session.cartItemCount + 1
      : 1;

    res.redirect("/cart/loadcart");
  } catch (error) {
    console.error("Error in addToCart:", error);
    req.flash("error", "Internal Server Error");
    res.redirect("/cart/loadcart");
  }
};

const removeFromCart = async (req, res) => {
  try {
    const productId = req.params.productId;
    console.log("Product ID to remove:", productId);

    const currentUser = await userModel.findById(req.session.userId);
    console.log("Current User:", currentUser);

    if (!currentUser) {
      return res.redirect("/login");
    }

    const cart = await Cart.findOne({ user_id: currentUser._id });

    if (!cart) {
      return res.status(404).send("Cart not found");
    }

    const indexToRemove = cart.items.findIndex((item) =>
      item.product_id.equals(productId)
    );

    if (indexToRemove !== -1) {
      cart.items.splice(indexToRemove, 1);

    } else {
      console.log("Item not found in cart");
    }

    await cart.save();
    req.session.cartItemCount = req.session.cartItemCount
      ? req.session.cartItemCount - 1
      : 0;

    res.redirect("/cart/loadcart");
  } catch (error) {
    console.error("Error in removeFromCart:", error);
    req.flash("error", "Internal Server Error");
    res.redirect("/cart/loadcart");
  }
};


const updateQuantity = async (req, res) => {
  try {
    const { productId, adjustment } = req.body;
    const currentUser = await userModel.findById(req.session.userId);

    if (!currentUser) {
      return res.status(403).send("Unauthorized");
    }

    const cart = await Cart.findOne({ user_id: currentUser._id });

    const itemIndex = cart.items.findIndex((item) =>
      item.product_id.equals(productId)
    );
    if (itemIndex !== -1) {
      const updatedQuantity =
        cart.items[itemIndex].quantity + parseInt(adjustment);
      if (updatedQuantity < 0) {
        return res.status(400).json({ error: "Quantity cannot be negative" });
      }

      // Check if the updated quantity exceeds the stock count
      const product = await Product.findById(productId);
      if (product.stockCount !== -1 && updatedQuantity > product.stockCount) {
        return res.status(400).json({ error: "Out of stock" });
      }
      cart.items[itemIndex].quantity = updatedQuantity;

      await cart.save();

      const totalAmount = cart.items.reduce((total, item) => {
        return total + item.quantity * item.price;
      }, 0);

      res.json({ quantity: updatedQuantity, totalAmount });
    } else {
      res.status(404).send("Item not found in cart");
    }
  } catch (error) {
    console.error("Error in updateQuantity:", error);
    req.flash("error", "Internal Server Error");
    res.redirect("/cart/loadcart");
  }
};

const getCartCount = async (req, res) => {
  try {
    const currentUser = await userModel.findById(req.session.userId);
    if (!currentUser) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const cartDetails = await cartModel.aggregate([
      { $match: { user_id: currentUser._id } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
    ]);
    const cartItemCount = cartDetails.length;
    res.status(200).json({ count: cartItemCount });
  } catch (error) {
    console.error("Error fetching cart count:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const applyCoupon = async (req, res) => {
  try {
     console.log("welcome to apply coupon");
     const { couponCode, totalAmount } = req.body;
     
     console.log("coupon code:", couponCode);
     console.log("total amount:", totalAmount);
     
     // Check if a coupon code is selected
     if (!couponCode) {
       return res.status(400).json({ error: 'Please select a coupon' });
     }
     
     const currentUser = await userModel.findById(req.session.userId);
     if (!currentUser) {
       return res.status(403).json({ error: 'Unauthorized' });
     }
     
     const coupon = await coupondb.findOne({ code: couponCode });
     if (!coupon) {
       return res.status(400).json({ error: 'Coupon not found' });
     }
 
     if (coupon.isExpired()) {
       return res.status(400).json({ error: 'Coupon has expired' });
     }
 
     const existingUsage = await CouponUsage.findOne({ coupon: coupon._id, user: currentUser._id });
     if (existingUsage) {
       return res.status(400).json({ error: 'Coupon already used' });
     }
 
     if (totalAmount < coupon.minPrice || totalAmount > coupon.maxPrice) {
       return res.status(400).json({ error: 'Total amount does not meet coupon conditions' });
     }
     
     let couponDiscount=coupon.discount;
     const discountedAmount = totalAmount - couponDiscount;
     console.log("discount price:", discountedAmount);
     req.session.totalAmount = discountedAmount;
     req.session.couponApplied = true;
     req.session.originalTotalAmount = totalAmount;
     
     // Save the coupon usage
     const couponUsage = new CouponUsage({ coupon: coupon._id, user: currentUser._id });
     await couponUsage.save();
 
     // Return success response
     return res.json({ success: true, totalAmount: discountedAmount,couponDiscount });
  } catch (error) {
     console.error('Error applying coupon:', error);
     // Return error response
     return res.status(500).json({ error: 'Internal Server Error' });
  }
 };
 



const removeCoupon = async (req, res) => {
  try {
    const currentUser = await userModel.findById(req.session.userId);
    if (!currentUser) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const couponCode = req.body.couponCode;
    const coupon = await coupondb.findOne({ code: couponCode });

    if (!coupon) {
      return res.status(400).json({ error: "Coupon not found" });
    }

    await CouponUsage.deleteOne({
      coupon: coupon._id,
      user: currentUser._id,
    });

    req.session.couponApplied = false;
    req.session.totalAmount = req.session.originalTotalAmount;

    req.flash("success", "Coupon removed successfully.");

    return res.json({ success: true, totalAmount: req.session.originalTotalAmount });
  } catch (error) {
    console.error("Error removing coupon usage:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


const loadWishlist = async (req, res) => {
  try {
    const currentUser = await userModel.findById(req.session.userId);
    const categories = await categoryModel.find();

    if (!currentUser) {
      return res.redirect("/login");
    } else {
      const userWishlist = await Wishlist.findOne({
        user_id: currentUser._id,
      }).populate("products");

      if (!userWishlist) {
        return res.render("users/wishlist", {
          categories,
          req,
          wishlistItems: [],
          currentUser,
        });
      }

      for (let i = 0; i < userWishlist.products.length; i++) {
        const product = userWishlist.products[i];
        const offerPrice = await calculateOfferPrice(product);
        const offerPercentage = parseFloat(
          ((product.price - offerPrice) / product.price) * 100
        ).toFixed(2);

        // Add offerPrice and offerPercentage to the product object
        userWishlist.products[i].offerPrice = parseFloat(offerPrice).toFixed(2);
        userWishlist.products[i].offerPercentage = offerPercentage;
      }
      res.render("users/wishlist", {
        categories,
        req,
        wishlistItems: userWishlist.products,
        currentUser,
      });
    }
  } catch (error) {
    console.error("Error loading wishlist:", error);
    res.status(500).send("Internal Server Error");
  }
};

const addToWishlist = async (req, res) => {
  try {
    const productId = req.params.id;
    const currentUser = await userModel.findById(req.session.userId);

    if (!currentUser) {
      return res.redirect("/login");
    }

    const productData = await productModel.findById(productId);

    if (!productData) {
      return res.status(404).send("Product not found");
    }

    let userWishlist = await Wishlist.findOne({ user_id: currentUser._id });

    if (!userWishlist) {
      userWishlist = new Wishlist({
        user_id: currentUser._id,
        products: [],
      });
    }

    // Check if the product is already in the wishlist
    if (userWishlist.products.includes(productId)) {
      return res.status(400).send("Product already in wishlist");
    }

    userWishlist.products.push(productId);
    await userWishlist.save();

    res.redirect("/cart/wishlist");
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).send("Internal Server Error");
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const productId = req.params.id;
    const currentUser = await userModel.findById(req.session.userId);

    if (!currentUser) {
      return res.redirect("/login");
    }

    const userWishlist = await Wishlist.findOne({ user_id: currentUser._id });

    if (!userWishlist) {
      return res.status(404).send("Wishlist not found");
    }

    const indexToRemove = userWishlist.products.indexOf(productId);

    if (indexToRemove !== -1) {
      userWishlist.products.splice(indexToRemove, 1);
      await userWishlist.save();
    }

    res.redirect("/cart/wishlist");
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).send("Internal Server Error");
  }
};

export default {
  loadCart,
  addToCart,
  removeFromCart,
  updateQuantity,
  getCartCount,
  applyCoupon,
  removeCoupon,
  loadWishlist,
  addToWishlist,
  removeFromWishlist,
};
