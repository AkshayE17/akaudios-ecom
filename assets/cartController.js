import Cart from '../models/cartModel.js';
import productModel from '../models/productModel.js';
import userModel from '../models/userModel.js';
import cartModel from '../models/cartModel.js';
import categoryModel from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import productOfferModel from '../models/productofferModel.js';
import categoryOfferModel from '../models/categoryofferModel.js';

const calculateOfferPrice = async (productDetails) => {
  try {
    // Fetch offer details from the database based on the product ID
    const productOffer = await productOfferModel.findOne({ product: productDetails._id });
    const categoryOffer = await categoryOfferModel.findOne({ category: productDetails.category });

    // Calculate offer percentage
    const offerPercentage = Math.max(productOffer ? productOffer.productOffer : 0, categoryOffer ? categoryOffer.categoryOffer : 0);

    // Calculate offer price
    const offerPrice = productDetails.price * (1 - offerPercentage / 100);

    return offerPrice;
  } catch (error) {
    console.error("Error calculating offer price:", error);
    // If there's an error, return the regular price
    return productDetails.price;
  }
};

const loadCart = async (req, res) => {
  try {
      const currentUser = await userModel.findById(req.session.userId);
      const categories = await categoryModel.find();

      if (!currentUser) {
          return res.redirect('/login'); // Redirect to login if not logged in
      }

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

      if (!cartDetails || cartDetails.length === 0) {
          // If the cart is empty, render the cart page with empty cart details
          return res.render("users/cart", { req, categories, cartDetails: [], totalAmount: 0 });
      }

      // Fetch offer details for each product and add them to the productDetails object
      for (const product of cartDetails) {
          const productOffer = await productOfferModel.findOne({ product: product.productDetails._id });
          const categoryOffer = await categoryOfferModel.findOne({ category: product.productDetails.category });
          const offerPercentage = Math.max(productOffer ? productOffer.productOffer : 0, categoryOffer ? categoryOffer.categoryOffer : 0);
          product.productDetails.offerPrice = product.productDetails.price * (1 - offerPercentage / 100);
      }

      // Calculate total amount
      const totalAmount = cartDetails.reduce((total, item) => {
          return total + (item.items.quantity * item.productDetails.offerPrice);
      }, 0);

      req.session.totalAmount = totalAmount;

      res.render('users/cart', { cartDetails, categories, totalAmount, req });

  } catch (error) {
      console.error('Error in loadCart:', error);
      res.status(500).render('users/error'); // Render an error page
  }
};



const addToCart = async (req, res) => {
  try {
    const productId = req.params.id;
    const currentUser = await userModel.findById(req.session.userId);

    if (!currentUser) {
      return res.redirect('/login'); // Redirect to login if not logged in
    }

    const productData = await productModel.findById({_id: productId});

    if (!productData) {
      return res.status(404).send('Product not found');
    }

    // Calculate offer price
    const offerPrice = await calculateOfferPrice(productData);

    let userCart = await Cart.findOne({ user_id: currentUser._id });

    if (!userCart) {
      userCart = new Cart({
        user_id: currentUser._id,
        items: [],
        totalPrice: 0
      });
    }

    // Check if the product is already in the cart
    const existingProductIndex = userCart.items.findIndex(item => item.product_id.equals(productId));

    if (existingProductIndex !== -1) {
      // If the product is already in the cart, increment its quantity
      userCart.items[existingProductIndex].quantity += 1;
    } else {
      // If the product is not in the cart, add it with the offer price
      userCart.items.push({
        product_id: productId,
        quantity: 1,
        price: offerPrice
      });
    }

    // Update total price
    userCart.totalPrice = userCart.items.reduce((total, item) => total + (item.quantity * item.price), 0);

    // Save cart to database
    await userCart.save();

    // Update cart item count in session
    req.session.cartItemCount = req.session.cartItemCount ? req.session.cartItemCount + 1 : 1;

    // Redirect to the cart page after adding the product
    res.redirect('/cart/loadcart');
  } catch (error) {
    console.error('Error in addToCart:', error);
    res.status(500).send('Internal Server Error');
  }
};



const removeFromCart = async (req, res) => {
  try {
    const productId = req.params.productId;
    console.log('Product ID to remove:', productId);

    const currentUser = await userModel.findById(req.session.userId);
    console.log('Current User:', currentUser);

    if (!currentUser) {
      return res.redirect('/login');
    }

    const cart = await Cart.findOne({ user_id: currentUser._id });
 

    if (!cart) {
      return res.status(404).send('Cart not found');
    }


    const indexToRemove = cart.items.findIndex(item => item.product_id.equals(productId));

    if (indexToRemove !== -1) {

      cart.items.splice(indexToRemove, 1);
      console.log('Item removed from cart');
    } else {
      console.log('Item not found in cart');
    }


    await cart.save();
    console.log('Cart saved successfully');
  
    req.session.cartItemCount = req.session.cartItemCount ? req.session.cartItemCount - 1 : 0

    res.redirect('/cart/loadcart');
  } catch (error) {
    console.error('Error in removeFromCart:', error);
    res.status(500).send('Internal Server Error');
  }
};
const updateQuantity = async (req, res) => {
  try {
      const { productId, adjustment } = req.body;
      const currentUser = await userModel.findById(req.session.userId);
      
      if (!currentUser) {
          return res.status(403).send('Unauthorized');
      }

      const cart = await Cart.findOne({ user_id: currentUser._id });


      const itemIndex = cart.items.findIndex(item => item.product_id.equals(productId));
      if (itemIndex !== -1) {
          const updatedQuantity = cart.items[itemIndex].quantity + parseInt(adjustment);
          if (updatedQuantity < 0) {
              return res.status(400).json({ error: 'Quantity cannot be negative' });
          }

          // Check if the updated quantity exceeds the stock count
          const product = await Product.findById(productId);
          if (product.stockCount !== -1 && updatedQuantity > product.stockCount) {
              return res.status(400).json({ error: 'Out of stock' });
          }

          // Update the quantity of the item
          cart.items[itemIndex].quantity = updatedQuantity;

          await cart.save();

          const totalAmount = cart.items.reduce((total, item) => {
              return total + (item.quantity * item.price);
          }, 0);

          res.json({ quantity: updatedQuantity, totalAmount });
      } else {

          res.status(404).send('Item not found in cart');
      }
  } catch (error) {
      console.error('Error in updateQuantity:', error);
      res.status(500).send('Internal Server Error');
  }
};

const getCartCount = async (req, res) => {
  try {
    const currentUser = await userModel.findById(req.session.userId);
    if (!currentUser) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const cartDetails = await cartModel.aggregate([
      { $match: { user_id: currentUser._id } },
      { $unwind: "$items" },
      { $lookup: { from: "products", localField: "items.product_id", foreignField: "_id", as: "productDetails" } },
      { $unwind: "$productDetails" }
    ]);
    const cartItemCount = cartDetails.length;
    res.status(200).json({ count: cartItemCount });
  } catch (error) {
    console.error('Error fetching cart count:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default {
  loadCart,
  addToCart,
  removeFromCart,
  updateQuantity,
  getCartCount
};
