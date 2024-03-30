import walletModel from "../models/walletModel.js";
import categoryModel from "../models/categoryModel.js";
import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

const loadwallet = async (req, res) => {
  try {
    const userId = req.session.userId; 
    const categories = await categoryModel.find();
    let userWallet = await walletModel.findOne({ userId: userId });
    const razorpaykey = process.env.key_id;

    if (!userWallet) {
      // If wallet not found, create a new wallet
      userWallet = new walletModel({
        userId,
        transactions: [],
        walletBalance: 0,
      });
      await userWallet.save();
    }

    res.render('wallet', {
      categories,
      req,
      walletBalance: userWallet.walletBalance,
      transactions: userWallet.transactions,
      razorpaykey,
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
};


const addwallet = async (req, res) => {
  try {
    const userId = req.session.userId; 
    const { amount } = req.body;

    const transaction = {
      amount,
      transactionDate: new Date(),
    };

    console.log("transaction:", transaction);

    let wallet = await walletModel.findOne({ userId });

    console.log("wallet :", wallet);

    if (!wallet) {
      wallet = new walletModel({
        userId,
        transactions: [transaction],
        walletBalance: parseInt(amount), // Parse amount to integer
      });
    } else {
      wallet.walletBalance += parseInt(amount); // Parse amount to integer
      wallet.transactions.push(transaction);
    }

    await wallet.save();

    res.redirect("/wallet");
  } catch (error) {
    console.log("Error adding to wallet:", error);
    res.status(500).render("error", { error });
  }
};


const razorpay = new Razorpay({
  key_id: process.env.key_id,
  key_secret: process.env.key_secret
});


const addMoney = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { amount } = req.body;
    const parsedAmount = parseInt(amount);

    let wallet = await walletModel.findOne({ userId });

    if (!wallet) {
      wallet = new walletModel({
        userId,
        transactions: [{ amount: parsedAmount,type:"credit",transactionDate: new Date() }],
        walletBalance: parsedAmount,
      });
    } else {
      wallet.walletBalance += parsedAmount;
      wallet.transactions.push({ amount: parsedAmount,type:"credit", transactionDate: new Date() });
    }

    await wallet.save();

    const options = {
      amount: parsedAmount * 100,
      currency: 'INR',
      receipt: 'wallet_addition_' + Date.now(),
      payment_capture: 1,
    };
    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
};


export default {
  loadwallet,
  addwallet,
  addMoney

};
