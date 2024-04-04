import adminModel from '../models/adminModel.js';
import userModel from '../models/userModel.js'; 
import productModel from '../models/productModel.js';
import Product from '../models/productModel.js';
import categoryModel from '../models/categoryModel.js';
import orderModel from '../models/orderModel.js';
import productofferModel from '../models/productofferModel.js';
import categoryofferModel from '../models/categoryofferModel.js';
import addressModel from '../models/addressModel.js';



const adminRegistration = async (req,res) => {
  try {
    console.log(req.body.name)
    const admin = new adminModel({
      name: req.body.name,
      email: req.body.email,
      password:req.body.password  
    });
    console.log("admin is",admin)

    const adminData = await admin.save();

    console.log("admindata is",adminData)
    if(adminData){
      res.status(201).json({message: "Admin created successfully"})
      console.log("registration succesful");
    }

  }catch(error){
    res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }

}


const homeLoad = async (req, res) => {
  try {
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;

    const option = req.query.option || 'daily';

    let orders;
    let totalRevenue;
    let totalOrders;
    let totalProductsSold;
    let monthlyEarnings;
    let totalCategories;

    const categories = await categoryModel.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'products',
        },
      },
      {
        $addFields: {
          productCount: { $size: '$products' },
        },
      },
      {
        $sort: { productCount: -1 },
      },
    ]);

    const topProducts = await orderModel.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product_id',
          totalOrdered: { $sum: '$items.quantity' },
        },
      },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productInfo' } },
      { $project: { productName: '$productInfo.productName', totalOrdered: 1 } },
      { $sort: { totalOrdered: -1 } },
      { $limit: 5 },
    ]);


    if (!startDate || !endDate) {
      // Fetch all orders from the database
      orders = await orderModel.find().populate('userId', 'name');
    } else {
      // Fetch orders within the specified date range
      orders = await orderModel.find({
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).populate('userId', 'name');
    }

    // Calculate the required data for the sales report
    totalRevenue = orders.reduce((acc, order) => acc + order.totalAmount, 0);
    totalOrders = orders.length;
    totalProductsSold = orders.reduce((acc, order) => acc + order.items.reduce((acc, item) => acc + item.quantity, 0), 0);
    totalCategories = await categoryModel.countDocuments();

    if (!startDate || !endDate) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      monthlyEarnings = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      }).reduce((acc, order) => acc + order.totalAmount, 0);
    }

    // Prepare revenue data for daily, monthly, and yearly periods
    const dailyRevenue = await calculateRevenueData(startDate, endDate, 'day');
    const monthlyRevenue = await calculateRevenueData(startDate, endDate, 'month');
    const yearlyRevenue = await calculateRevenueData(startDate, endDate, 'year');

     res.render("adminHome", {
       totalRevenue,
      totalOrders,
      totalProductsSold,
      monthlyEarnings,
      totalCategories,
      dailyRevenue: JSON.stringify(dailyRevenue),
      monthlyRevenue: JSON.stringify(monthlyRevenue),
      yearlyRevenue: JSON.stringify(yearlyRevenue),
      option,
      categories,
      topProducts
});


  } catch (error) {
    console.error("Error from homeLoad", error);
    res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
};

const calculateRevenueData = async (startDate, endDate, period) => {
  const revenueDataArray = [];
 
  for (let i = 0; i < 5; i++) {
     const currentDate = new Date();
     let adjustedStartDate, adjustedEndDate, groupByExpression;
 
     if (period === 'day') {
       adjustedStartDate = new Date(currentDate);
       adjustedStartDate.setDate(adjustedStartDate.getDate() - (4 - i)); // Adjust for last 5 days
       adjustedEndDate = new Date(adjustedStartDate);
       adjustedEndDate.setDate(adjustedEndDate.getDate() + 1); // Set end date to the next day
       groupByExpression = {
         year: { $year: "$createdAt" },
         month: { $month: "$createdAt" },
         day: { $dayOfMonth: "$createdAt" },
       };
     } else if (period === 'month') {
       adjustedStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - (4 - i), 1); // Adjust for last 5 months
       adjustedEndDate = new Date(adjustedStartDate);
       adjustedEndDate.setMonth(adjustedEndDate.getMonth() + 1); // Set end date to the next month
       groupByExpression = {
         year: { $year: "$createdAt" },
         month: { $month: "$createdAt" },
       };
     } else if (period === 'year') {
       adjustedStartDate = new Date(currentDate.getFullYear() - (4 - i), 0, 1); // Adjust for last 5 years
       adjustedEndDate = new Date(adjustedStartDate);
       adjustedEndDate.setFullYear(adjustedEndDate.getFullYear() + 1); // Set end date to the next year
       groupByExpression = { year: { $year: "$createdAt" } };
     } else {
       throw new Error(`Invalid period: ${period}`);
     }
 
     const pipeline = [
       {
         $match: {
           createdAt: {
             $gte: adjustedStartDate,
             $lt: adjustedEndDate, // Use $lt to include the end date
           },
         },
       },
       {
         $group: {
           _id: groupByExpression,
           revenue: { $sum: "$totalAmount" },
         },
       },
     ];
 
     const revenueData = await orderModel.aggregate(pipeline);
 
     // Initialize revenue data for the current period
     const formattedData = {};
 
     if (period === 'day') {
       formattedData[adjustedStartDate.toISOString().split('T')[0]] = revenueData.length > 0 ? revenueData[0].revenue : 0;
     } else if (period === 'month') {
       formattedData[adjustedStartDate.toISOString().slice(0, 7)] = revenueData.length > 0 ? revenueData[0].revenue : 0;
     } else if (period === 'year') {
       formattedData[adjustedStartDate.getFullYear().toString()] = revenueData.length > 0 ? revenueData[0].revenue : 0;
     }
 
     revenueDataArray.push(formattedData);
  }
 
  return revenueDataArray;
 };
 



const loadAdminlogin = async (req, res) => {
  try {
    res.render('adminLogin');
  } catch (error) {
    res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
}

const verifyLogin = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const password = req.body.password;

    const adminData = await adminModel.findOne({ email: email });

    if (adminData) {


      const trimmedEnteredPassword = password.trim();
      const trimmedStoredPassword = adminData.password.trim();

      const passwordMatch = trimmedEnteredPassword === trimmedStoredPassword;

      if (passwordMatch) {
        if (adminData.isAdmin == false) {
          res.render('adminLogin', { message: "ONLY ADMIN ALLOWED" });
        } else {
          req.session.admin_id = adminData._id || null;
        
          return res.redirect('/admin/home');  
        }
      } else {
        res.render('adminLogin', { message: "Username or password is incorrect" });
      }
    } else {
      console.log("Email incorrect");
      res.render('adminLogin', { message: "Username or password is incorrect" });
    }
  } catch (error) {
    console.error('Error in verifyLogin:', error.message);
    res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
};


const adminDashboard = async(req,res)=>{
  try{
     const userData = await userModel.find()
     
       res.render('customers',{users:userData});
  }catch(error){
    console.log(error.message);
    res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
}

const blockUnblockUser = async (req, res) => {
  try {
    const userId = req.body.userId;
    const action = req.body.action;
      console.log("action:",action);

    const user = await userModel.findById(userId);

    user.is_blocked = action === 'block';

    await user.save();
  
    // Redirect back to the customers page
    res.redirect('/admin/customers');
  } catch (error) {
    console.error(error);
    res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
};


const adminLogout = async (req, res) => {
  try {
    if (req.session.admin_id) {
      req.session.destroy();
      return res.redirect('/admin');
    } else {
      return res.redirect('/admin');
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).render('adminerror', { error: 'Internal Server Error' });
  }
};


const viewAllOrders = async (req, res) => {
  try {
    const orders = await orderModel.aggregate([
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
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $group: {
          _id: "$_id", // Group by order ID
          user: { $first: "$user" }, // Keep user details
          totalAmount: { $first: "$totalAmount" }, // Keep total amount
          createdAt: { $first: "$createdAt" }, // Keep creation date
          items: { $push: "$items" }, // Collect items
          payment: { $first: "$payment" } 
        },
      },
      {
        $sort: { "createdAt": -1 },
      },
    ]);

    res.render('allorders', { orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
};


const viewOrderDetails = async (req, res) => {
  try {
     const orderId = req.params.id;
     const categories = await categoryModel.find();
     const order = await orderModel.findById(orderId)
       .populate('userId')
       .populate({
         path: 'items.product_id',
         model: Product, 
         select: 'productName price productImg', 
       });
 
     if (!order) {
       return res.status(404).send('Order not found');
     }
 
     // Fetch the billing address details
     const address = await addressModel.findOne({
         'addresses._id': order.billingAddress
     }, {
         'addresses.$': 1
     });
 
     let billingAddress;
     let billingAddressMessage;
 
     if (!address || !address.addresses || address.addresses.length === 0) {
         billingAddressMessage = 'Billing address not found';
     } else {
         billingAddress = address.addresses[0];
     }
     const productImages = order.items.map(item => {
       const product = item.product_id;
       if (product && product.productImg && product.productImg.length > 0) {
         return product.productImg; 
       } else {
         return ['placeholder.jpg']; 
       }
     });

     res.render('adminorderDetails', { categories, req, order, billingAddress, billingAddressMessage, productImages });
  } catch (error) {
     console.error('Error fetching order details:', error);
     res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
 };
 

// Define the formatDate function to format dates
function formatDate(date) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
}


// Define the renderOrdersAsHtml function to render orders as HTML
function renderOrdersAsHtml(orders) {
  let html = `
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table align-middle table-nowrap mb-0">
                        <thead class="table-light">
                            <tr>
                                <th scope="col" class="text-center">
                                    <div class="form-check align-middle">
                                        <input class="form-check-input" type="checkbox" id="transactionCheck01" />
                                        <label class="form-check-label" for="transactionCheck01"></label>
                                    </div>
                                </th>
                                <th class="align-middle" scope="col">Order ID</th>
                                <th class="align-middle" scope="col">Billing Name</th>
                                <th class="align-middle" scope="col">Date</th>
                                <th class="align-middle" scope="col">Total</th>
                                <th class="align-middle" scope="col">Payment Method</th>
                            </tr>
                        </thead>
                        <tbody>
  `;
  orders.forEach(order => {
      html += `
                                <tr>
                                    <td class="text-center">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="transactionCheck${order._id}" />
                                            <label class="form-check-label" for="transactionCheck${order._id}"></label>
                                        </div>
                                    </td>
                                    <td><a href="#" class="fw-bold">#${order._id}</a></td>
                                    <td>${order.userId.name}</td>
                                    <td>${formatDate(order.createdAt)}</td>
                                    <td>₹${order.totalAmount.toFixed(2)}</td>
                                    <td><i class="material-icons md-payment font-xxl text-muted mr-5"></i> ${order.payment}</td>
                                </tr>
      `;
  });
  html += `
                        </tbody>
                    </table>
                </div>
                <!-- table-responsive end// -->
            </div>
  `;
  return html;
}


const getSalesReport = async (req, res) => {
  try {
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;

    let orders;
    let totalRevenue;
    let totalOrders;
    let totalProductsSold;
    let totalCategories;
    let monthlyEarning;

    if (!startDate || !endDate) {

      orders = await orderModel.find().populate('userId', 'name');
    } else {
      orders = await orderModel.find({
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).populate('userId', 'name');
    }

    // Calculate the required data for the sales report
    totalRevenue = orders.reduce((acc, order) => acc + order.totalAmount, 0);
    totalOrders = orders.length;
    totalProductsSold = orders.reduce((acc, order) => acc + order.items.reduce((acc, item) => acc + item.quantity, 0), 0);
    totalCategories = await categoryModel.countDocuments();

    // Calculate monthly earning for the current month if not already calculated
    if (!startDate || !endDate) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      monthlyEarning = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      }).reduce((acc, order) => acc + order.totalAmount, 0);
    }

    if (req.xhr) {

      const ordersHtml = renderOrdersAsHtml(orders); // Implement this function to render orders as HTML
      res.json({ ordersHtml });
    } else {
      // If it's a regular request, render the salesreport view
      res.render('salesreport', { totalRevenue, totalOrders, totalProductsSold, monthlyEarning, totalCategories, orders });
    }
  } catch (error) {
    // Handle errors
    console.error(error);
    if (req.xhr) {
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(500).render('adminerror', { error: 'Internal server error' });
    }
  }
};


const loadaddProductoffer = async (req, res) => {
  try {

    const products = await productModel.find();
    const productOffers = await productofferModel.find().populate('product');
    return res.render('addproductoffer', { products: products, productOffers: productOffers, success: req.flash('success') });
  } catch (error) {
    console.error('Error loading add product offer page:', error);
    return res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
}


const addproductoffer = async (req, res) => {
  try {
    const { productId, productOffer } = req.body;

    if (!productId || !productOffer) {
      return res.status(400).render('addproductoffer', { products: products, error: 'productId and productOffer are required' });
    }

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).render('addproductoffer', { products: products, error: 'Product not found' });
    }

    let existingOffer = await productofferModel.findOne({ product: productId });

    if (existingOffer) {
      existingOffer.productOffer = productOffer;
      await existingOffer.save();
    } else {
      const newProductOffer = new productofferModel({
        product: productId,
        productOffer: productOffer
      });
      await newProductOffer.save();
    }
    const productOffers = await productofferModel.find().populate('product');
    const products = await productModel.find();
    return res.render('addproductoffer', { products: products,productOffers: productOffers, success: 'Product offer added successfully' });

  } catch (error) {
    console.error('Error adding product offer:', error);
    return res.status(500).render('error', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
}

const deleteProductOffer = async (req, res) => {
  try {
    const offerId = req.params.id;

    const deletedOffer = await productofferModel.findByIdAndDelete(offerId);
    if (!deletedOffer) {
      return res.status(404).render('addproductoffer', { error: 'Product offer not found' });
    }

    req.flash('success', 'Product offer deleted successfully');
    return res.redirect('/admin/productoffer');
  } catch (error) {
    console.error('Error deleting product offer:', error);
    req.flash('error', 'Internal Server Error');
    return res.redirect('/admin/addproductoffer');
  }
};


const loadAddCategoryOffer = async (req, res) => {
  try {
    const categories = await categoryModel.find({ isDeleted: false });
    const categoryOffers = await categoryofferModel.find().populate('category');
    res.render('addcategoryoffer', { categories: categories, categoryOffers: categoryOffers, success: '', error: '' });
  } catch (error) {
    console.error('Error loading Add Category Offer page:', error);
    return res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
};


const addCategoryOffer = async (req, res) => {
  try {
    const { categoryId, categoryOffer } = req.body;

    const categories = await categoryModel.find({ isDeleted: false });
    if (!categoryId || !categoryOffer) {
      return res.status(400).render('addcategoryoffer', { categories: categories,success:'', error: 'Category and offer percentage are required' });
    }

    const category = await categoryModel.findById(categoryId);
    if (!category) {
      return res.status(404).render('addcategoryoffer', { categories: categories, success:'', error: 'Category not found' });
    }

    let existingOffer = await categoryofferModel.findOne({  category: categoryId });

    if (existingOffer) {
  
      existingOffer.categoryOffer = categoryOffer;
      await existingOffer.save();
    } else {
      const newCategoryOffer = new categoryofferModel({
        category: categoryId,
        categoryOffer: categoryOffer
      });
      await newCategoryOffer.save();
    }
    return res.redirect("/admin/categoryoffer");
  } catch (error) {
    console.error('Error adding category offer:', error);
    return res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
};

const deleteCategoryOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    console.log("offer id:",offerId);
    await categoryofferModel.findByIdAndDelete(offerId);
    res.redirect('/admin/categoryoffer');
  } catch (error) {
    console.error('Error deleting category offer:', error);

    res.redirect('/admin/categoryoffer');
  }
};



export default{

  homeLoad,
  adminRegistration,
  loadAdminlogin,
  verifyLogin,
  adminDashboard,
  blockUnblockUser,
  adminLogout,
  viewAllOrders,
  getSalesReport,
  viewOrderDetails,
  loadaddProductoffer,
  addproductoffer,
  deleteProductOffer,
  loadAddCategoryOffer,
  addCategoryOffer,
  deleteCategoryOffer

}