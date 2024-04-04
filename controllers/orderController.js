import orderModel from "../models/orderModel.js";
import categoryModel from "../models/categoryModel.js";
import AddressModel from "../models/addressModel.js";
import userModel from "../models/userModel.js";
import cartModel from "../models/cartModel.js";
import productModel from "../models/productModel.js";
import walletModel from "../models/walletModel.js";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import dotenv from "dotenv";
import puppeteer from "puppeteer-core";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config();

const loadAddress = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect("/login");
    }
    const categories = await categoryModel.find();

    const userAddress = await AddressModel.findOne({ user_id: userId });

    const addresses = userAddress ? userAddress.addresses : [];

    const totalAmount = req.session.totalAmount;

    res.render("users/checkoutaddress", {
      addresses,
      categories,
      req,
      totalAmount,
    });
  } catch (error) {
    console.log(error);
    res.status(500).render("users/error", { error: "Internal Server Error" });
  }
};

const loadPaymentmethod = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect("/login");
    }

    const categories = await categoryModel.find();
    const totalAmount = req.session.totalAmount;
    const selectedAddressId = req.query.selectedAddress;
    const razorpaykey = process.env.key_id;

    // Determine if COD is available based on total amount
    const codAvailable = totalAmount >= 5000;

    res.render("users/paymentmethod", {
      categories,
      req,
      totalAmount,
      selectedAddressId,
      razorpaykey,
      codAvailable,
      message: "",
    });
  } catch (error) {
    console.log(error);
    res.status(500).render("users/error", { error: "Internal Server Error" });
  }
};

const loadThanku = async (req, res) => {
  try {
    const categories = await categoryModel.find();
    return res.render("users/thanku", { req, categories });
  } catch (error) {
    console.log("error from loadThanku", error);
    res.status(500).render("users/error", { message: "Internal Server Error" });
  }
};

const viewOrders = async (req, res) => {
  try {
    const currentUser = req.session.userId;
    if (!currentUser) {
      return res.redirect("/login");
    } else {
      const userId = new mongoose.Types.ObjectId(currentUser);
      const categories = await categoryModel.find();

      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 3;

      const orders = await orderModel
        .aggregate([
          {
            $match: { userId },
          },
          {
            $unwind: "$items",
          },
          {
            $lookup: {
              from: "products",
              localField: "items.product_id",
              foreignField: "_id",
              as: "ordered",
            },
          },
          {
            $unwind: "$ordered",
          },
          {
            $project: {
              _id: 1,
              userId: 1,
              billingAddress: 1,
              totalAmount: 1,
              payment: 1,
              paymentStatus: 1,
              createdAt: 1,
              "items.product_id": 1,
              "items.quantity": 1,
              "items.price": 1,
              "items.status": 1,
              "ordered._id": 1,
              "ordered.productName": 1,
              "ordered.productImg": 1,
              "ordered.colour": 1,
            },
          },
          {
            $sort: { createdAt: -1 },
          },
        ])
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec();
      const razorpaykey = process.env.key_id;
      return res.render("users/orders", {
        req,
        orders,
        razorpaykey,
        categories,
        message: null,
        page,
        pageSize,
      });
    }
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).render("error", { message: "Internal Server Error" });
  }
};

const vieworderdetails = async (req, res) => {
  try {
    const categories = await categoryModel.find();
    const orderId = req.params.orderId;
    const productId = req.params.productId;
    let order = await orderModel
      .findById(orderId)
      .populate("userId")
      .populate("items.product_id");

    // Manually populate billingAddress
    const userAddress = await AddressModel.findOne({ user_id: order.userId });
    const billingAddress = userAddress.addresses.find(
      (address) => address._id.toString() === order.billingAddress.toString()
    );

    order = order.toObject(); // convert the mongoose document to a plain JavaScript object
    order.billingAddress = billingAddress; // Replace the billingAddress field with the fetched address document

    const product = order.items.find(
      (item) => item.product_id && item.product_id._id.toString() === productId
    );
    return res.render("users/orderdetails", {
      categories,
      req,
      order: [order],
      product,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).render("error", { message: "Internal Server Error" });
  }
};

const downloadinvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const productId = req.params.productId;
    let order = await orderModel
      .findById(orderId)
      .populate("userId")
      .populate("items.product_id");
    const categories = await categoryModel.find();

    const userAddress = await AddressModel.findOne({ user_id: order.userId });
    const billingAddress = userAddress.addresses.find(
      (address) => address._id.toString() === order.billingAddress.toString()
    );

    order = order.toObject();
    order.billingAddress = billingAddress; // Replace the billingAddress field with the fetched address document
    console.log("order:", order);
    const product = order.items.find(
      (item) => item.product_id && item.product_id._id.toString() === productId
    );

    console.log("product details:", product);
    const html = await ejs.renderFile(
      path.join(__dirname, "..", "views", "users", "invoice.ejs"),
      { order: [order], categories, req, product }
    );

    const browser = await puppeteer.launch({headless:'new',executablePath:'/snap/bin/chromium'});
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", timeout: 0 });
    await browser.close();

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", 'attachment; filename="invoice.pdf"');
    res.setHeader("Content-Length", pdf.length);
    res.send(pdf);
  } catch (error) {
    console.log("error:", error);
    res.render("users/error");
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, itemId, status } = req.body;
    const order = await orderModel.findById(orderId);
    console.log("order:", order);
    console.log("item id:", itemId);
    console.log("status:", status);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const item = order.items.find((item) => item._id.toString() === itemId);

    if (!item) {
      return res.status(404).json({ error: "Item not found in order" });
    }

    console.log("item found:", item);

    item.status = status;
    await order.save();

    res
      .status(200)
      .json({ message: "Order status updated successfully", order });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const placeOrder = async (req, res) => {
  try {
    const totalAmount = req.session.totalAmount;

    const selectedAddressId = req.body.selectedAddress;
    if (!selectedAddressId) {
      console.log("Selected address ID is missing in the request");
    }
    const currentUser = await userModel.findById(req.session.userId);
    const userCart = await cartModel.aggregate([
      {
        $match: { user_id: currentUser._id },
      },
      {
        $unwind: "$items",
      },
    ]);
    const selectedAddress = await AddressModel.findOne({
      "addresses._id": selectedAddressId,
    });
    if (!selectedAddress) {
      console.log("Selected address not found for ID:", selectedAddressId);
      return res.status(404).json({ error: "Selected address not found" });
    }
    const order = new orderModel({
      userId: currentUser._id,
      billingAddress: selectedAddressId,
      totalAmount: totalAmount,
      createdAt: new Date().toISOString(),
      payment: req.body.paymentOption,
      paymentStatus: "Pending",
      items: userCart.map((item) => ({
        product_id: item.items.product_id,
        quantity: item.items.quantity,
        price: item.items.price,
        status: "pending",
      })),
    });

    req.session.orderId = order._id;
    await order.save();

    await cartModel.updateOne(
      { user_id: currentUser._id },
      { $set: { items: [], totalPrice: 0, counponPrice: 0 } }
    );

    // Decrease product stock count
    for (const item of userCart) {
      const productId = item.items.product_id;
      const quantity = item.items.quantity;

      await productModel.updateOne(
        { _id: productId },
        { $inc: { stockCount: -quantity } }
      );
    }

    res.redirect("/order/razorthanku");
  } catch (error) {
    console.log("Error placing order:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const razorpay = new Razorpay({
  key_id: process.env.key_id,
  key_secret: process.env.key_secret,
});

const createOrderWithRazorpay = async (req, res) => {
  try {
    const { totalAmount, selectedAddressId } = req.body;

    const currentUser = await userModel.findById(req.session.userId);

    const userCart = await cartModel.findOne({ user_id: currentUser._id });

    let deliveryCharge = 0;
    if (totalAmount < 1000) {
      deliveryCharge = 100;
    } else if (totalAmount < 5000) {
      deliveryCharge = 50;
    }
    const parsedTotalAmount = parseFloat(totalAmount);
    const totalAmountWithDelivery = parsedTotalAmount + deliveryCharge;

    console.log("Total Amount:", totalAmount);
    console.log("Delivery Charge:", deliveryCharge);

    console.log("Total Amount with delivery:", totalAmountWithDelivery);
    const formattedAmount = (totalAmountWithDelivery * 100).toFixed(0);

    console.log(
      "Formatted Amount (Including Delivery Charge):",
      formattedAmount
    );

    const order = new orderModel({
      userId: currentUser._id,
      billingAddress: selectedAddressId,
      totalAmount: totalAmountWithDelivery,
      createdAt: new Date(),
      payment: "Razorpay",
      paymentStatus: "Pending",
      items: userCart.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        status: "pending",
      })),
    });
    const savedOrder = await order.save();

    req.session.orderId = savedOrder._id;

    await cartModel.updateOne(
      { user_id: currentUser._id },
      { $set: { items: [], totalPrice: 0, counponPrice: 0 } }
    );

    for (const item of userCart.items) {
      const productId = item.product_id;
      const quantity = item.quantity;

      await productModel.updateOne(
        { _id: productId },
        { $inc: { stockCount: -quantity } }
      );
    }

    const options = {
      amount: Math.ceil(totalAmountWithDelivery * 100), // Use total amount with delivery charge
      currency: "INR",
      receipt: savedOrder._id,
    };

    const rzpOrder = await razorpay.orders.create(options);

    res.status(200).json({ order: savedOrder, razorpayOrder: rzpOrder });
  } catch (error) {
    console.error("Error creating order with Razorpay:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const walletorder = async(req, res) => {
  try {
      const totalAmount = req.session.totalAmount;
      const selectedAddressId = req.body.selectedAddress;
      const paymentOption = req.body.paymentOption;
  
      if (!selectedAddressId) {
        console.log("Selected address ID is missing in the request");
        return res.status(400).json({ error: "Selected address ID is missing" });
      }
  
      const currentUser = await userModel.findById(req.session.userId);
      const userCart = await cartModel.aggregate([
        {
          $match: { user_id: currentUser._id }
        },
        {
          $unwind: "$items"
        }
      ]);
  
      const selectedAddress = await AddressModel.findOne({
        "addresses._id": selectedAddressId
      });
      if (!selectedAddress) {
        console.log("Selected address not found for ID:", selectedAddressId);
        return res.status(404).json({ error: "Selected address not found" });
      }
  
      // Find or create the wallet for the user
      let wallet = await walletModel.findOne({ userId: currentUser._id });
      if (!wallet) {
        // If the wallet does not exist, create a new one
        wallet = new walletModel({
          userId: currentUser._id,
          walletBalance: 0, // Initialize with 0 balance
        });
      }
  
      // Check if the user has enough balance in their wallet
      const parsedAmount = parseFloat(totalAmount);
      if (wallet.walletBalance < parsedAmount) {
        // Not enough balance, show an alert and stop the process
        return res.status(400).json({ error: "Not enough money in wallet" });
      }
  
      // Deduct the amount from the wallet balance
      wallet.walletBalance -= parsedAmount;
      wallet.transactions.push({ amount: parsedAmount, type: "debit", transactionDate: new Date() });
  
      await wallet.save();
  
      // Create or update the order
      const order = new orderModel({
        userId: currentUser._id,
        billingAddress: selectedAddressId,
        totalAmount: totalAmount,
        createdAt: new Date().toISOString(),
        payment: paymentOption,
        paymentStatus: 'Pending',
        items: userCart.map((item) => ({
          product_id: item.items.product_id,
          quantity: item.items.quantity,
          price: item.items.price,
          status: 'pending'
        })),
      });
  
      req.session.orderId = order._id;
      await order.save();
  
      // Clear the cart
      await cartModel.updateOne(
        { user_id: currentUser._id },
        { $set: { items: [], totalPrice: 0, counponPrice: 0 } }
      );
  
      // Update product stock counts
      for (const item of userCart) {
        const productId = item.items.product_id;
        const quantity = item.items.quantity;
  
        await productModel.updateOne(
          { _id: productId },
          { $inc: { stockCount: -quantity } }
        );
      }
  
      res.redirect("/order/razorthanku");
  } catch (error) {
      console.log("error:", error);
      return res.render("users/error");
  }
 };
 
 

const loadrazorThanku = async (req, res) => {
  try {
    const categories = await categoryModel.find();
    var orderId = req.query.orderId;
    console.log("id from query:", orderId);
    if (orderId == null) {
      orderId = req.session.orderId;
    }
    console.log("going to the function updatepaymentStatus");

    const order = await orderModel.findByIdAndUpdate(
      orderId,
      { paymentStatus: "Completed" },
      { new: true }
    );
    console.log("new order:", order);
    if (!order) {
      throw new Error("Order not found");
    }

    return res.render("users/thanku", { req, categories });
  } catch (error) {
    console.log("error from loadThanku", error);
    res.status(500).render("users/error", { message: "Internal Server Error" });
  }
};

const orderCancel = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const itemId = req.params.productId;
    const categories = await categoryModel.find();
    let order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).send({ message: "Order not found" });
    }

    const item = order.items.find(item => item.product_id.toString() === itemId);
    if (!item) {
      return res.status(404).send({ message: "Item not found in order" });
    }

    // Restore stock count for the canceled item
    await incrementStockCount(item.product_id, item.quantity);

    // Update item status
    item.status = "cancelled";

    if (order.payment === 'Razorpay' || order.payment === 'Wallet') {
      const userWallet = await walletModel.findOne({ userId: order.userId });
      if (!userWallet) {
        return res.status(404).send({ message: "User wallet not found" });
      }

      userWallet.walletBalance += item.price;

      userWallet.transactions.push({
        amount: item.price,
        type: "credit",
        transactionDate: new Date()
      });

      await userWallet.save();
    }

    await order.save();
    res.redirect('/order/viewOrder?successMessage=Order%20cancelled%20successfully')
  } catch (error) {
    console.log("error:", error);
    res.status(500).send({ message: "Error cancelling order" });
  }
};

const orderReturn = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const itemId = req.params.productId;
    const categories = await categoryModel.find();
    console.log("WELCOME TO ORDER RETURN");

    let order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).send({ message: "Order not found" });
    }

    const item = order.items.find(item => item.product_id.toString() === itemId);
    if (!item) {
      return res.status(404).send({ message: "Item not found in order" });
    }

    // Restore stock count for the returned item
    await incrementStockCount(item.product_id, item.quantity);

    // Update item status
    item.status = "returned";

    if (order.payment === 'COD') {
      // Find user's wallet
      const userWallet = await walletModel.findOne({ userId: order.userId });
      if (!userWallet) {
        return res.status(404).send({ message: "User wallet not found" });
      }
      userWallet.walletBalance += item.price;

      userWallet.transactions.push({
        amount: item.price,
        type: "credit",
        transactionDate: new Date()
      });
      await userWallet.save();
    }

    item.status = "returned";

    await order.save();
    res.redirect('/order/viewOrder?successMessage=Order%20returned%20successfully');

  } catch (error) {
    console.error("Error returning order:", error);
    res.status(500).send({ message: "Error returning order" });
  }
};


const incrementStockCount = async (productId, quantity) => {
  try {
    const product = await productModel.findById(productId);
    if (!product) {
      console.error(`Product with ID ${productId} not found`);
      return;
    }

    product.stockCount += quantity;
    await product.save();
  } catch (error) {
    console.error("Error incrementing stock count:", error);
  }
};


export default {
  loadAddress,
  loadPaymentmethod,
  placeOrder,
  loadThanku,
  loadrazorThanku,
  viewOrders,
  vieworderdetails,
  downloadinvoice,
  updateOrderStatus,
  createOrderWithRazorpay,
  walletorder,
  orderCancel,
  orderReturn
};
