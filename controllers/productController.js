import categoryModel from "../models/categoryModel.js";
import productModel from '../models/productModel.js';
import productOfferModel from "../models/productofferModel.js";
import categoryOfferModel from "../models/categoryofferModel.js";
import multer from 'multer';
import sharp from "sharp";


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/product');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

const loadProducts = async (req, res) => {
  try {
    const productData = await productModel.find().populate('category');
    const categories = await categoryModel.find();
    res.render('products', { categories, products: productData, success: false, error:''}); 
  } catch (error) {
    console.log(error.message);
    res.status(500).render('error', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
};


const productDetails = async (req, res) => {
  try {
    const productId = req.params.id; 
    const productData = await productModel.findById(productId);
    if (!productData) {

      return res.render('error', { message: 'Product not found', success: false, msg: '', product: {} });
    }

    const categories = await categoryModel.find();


    const productOffer = await productOfferModel.findOne({ product: productId });
    const categoryOffer = await categoryOfferModel.findOne({ category: productData.category });
    const offerPercentage = Math.max(productOffer ? productOffer.productOffer : 0, categoryOffer ? categoryOffer.categoryOffer : 0);


    const offerPrice = Math.floor(productData.price * (1 - offerPercentage / 100));



    const productWithOffer = {
      ...productData.toObject(),
      offerPrice,
      offerPercentage
    };
    
    res.render('productDetails', { products: productWithOffer, categories, req });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
};



const loadAddproduct = async (req, res) => {
  try {
    const categories = await categoryModel.find();
    res.render('addProduct', { categories });
  } catch (error) {
    console.log(error.message);
    res.status(500).render('error', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
};


const addProduct = async (req, res) => {
  try {
  
    const width = 500;
    const height = 1000;

    let arrImages = [];

    if (req.files) {
      for (let i = 0; i < req.files.length; i++) {
        const croppedBuffer = await sharp(req.files[i].path)
          .resize({ width: 300, height: 300, fit: "contain" })
          .toBuffer();

        // Generate a unique filename for each image
        const filename = `cropped_${req.files[i].originalname}_${Date.now()}`;
        arrImages[i] = filename;

        // Save the cropped image
        await sharp(croppedBuffer).toFile(`uploads/product/${filename}`);
      }
    }

    console.log(req.body);

    const { productName, description, price, category, colour, stockCount } = req.body;
    const productImgs = req.files ? req.files.map(file => file.filename) : [];

    const product = new productModel({
      productName,
      description,
      price,
      category,
      colour,
      stockCount,
      productImg: arrImages,
      isDeleted: false 
    });

    const savedProduct = await product.save();

    console.log(savedProduct);
    const productData = await productModel.find();
    res.render('products', { products: productData, success: 'Product added successfully' }); 
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
};



const editProductPage = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await productModel.findById(productId).populate('category');
    const categories = await categoryModel.find();

    if (!product) {
      return res.status(404).render('adminerror', { message: 'Product not found', success: false, msg: '', product: {} });
    }
    const productImages = product.productImg.map(image => [image]); 

    res.render('editProduct', { product, categories, productImages });
  } catch (error) {
    console.error(error);
    res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
};


const editProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).render('adminerror', { message: 'Product not found', success: false, msg: '', product: {} });
    }
    product.productName = req.body.editProductName;
    product.description = req.body.editDescription;
    product.price = req.body.editPrice;
    const categoryId = req.body.editCategory;
    const category = await categoryModel.findById(categoryId);
    product.category = category;
    product.colour = req.body.editColour;
    product.stockCount = req.body.stockCount;

    if (req.files && req.files.length > 0) {

      product.productImg = req.files.map(file => file.filename);
    }


    await product.save();
    const productData = await productModel.find().populate('category');
    res.render('products', { products: productData, success: 'Product edited successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
};

const deleteProductImage = async (req, res) => {
  try {
    const productId = req.params.productId;
    const imageName = req.params.imageName;
    const product = await productModel.findById(productId);
    if (!product) {
      return res.render('products',{ error: 'Product not found' });
    }
    product.productImg = product.productImg.filter(image => image !== imageName);
    await product.save();
    const productData = await productModel.find().populate('category');
    console.log("updated product:",productData);
    return res.render('products',{ products:productData , success: 'Image deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
};


const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const deletedProduct = await productModel.findOneAndDelete({ _id: productId });

    if (deletedProduct) {
      console.log('Deleted product:', deletedProduct);

      const productData = await productModel.find();
    res.render('products', { products: productData, success: 'Product deleted successfully' });
    } else {
      console.log('Product not found for deletion:', productId);
      res.status(404).render('products', { error: 'Product not found', msg: '', product: {} });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).render('error', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
};


const loadProductfiller = async (req, res) => {
  try {
    const categoryId = req.query.categoryId;
    const categories = await categoryModel.find();
    let filterConditions = {};
    if (categoryId) {
      filterConditions.category = categoryId;
    }
    const filteredProducts = await productModel.find(filterConditions);

    // Fetch product offers and category offers
    const productOffers = await productOfferModel.find();
    const categoryOffers = await categoryOfferModel.find();

    const productsWithOffer = filteredProducts.map(product => {
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

    const productsFound = productsWithOffer.length > 0;
    res.render('productfilter', { req, categories, productData: productsWithOffer, productsFound });
  } catch (error) {
    console.log("Error at filter page loading ", error);
    res.render('error', { error });
  }
};


const filterProducts = async (req, res) => {
  try {
    const categoryIds = Array.isArray(req.body.categoryIds) ? req.body.categoryIds : [req.body.categoryIds];
    const minPrice = parseFloat(req.body.minPrice);
    const maxPrice = parseFloat(req.body.maxPrice);
    
    let filterConditions = {};
    if (categoryIds.length > 0) {
      filterConditions.category = { $in: categoryIds };
    }
    if (!isNaN(minPrice) && !isNaN(maxPrice)) {
      filterConditions.price = { $gte: minPrice, $lte: maxPrice };
    }

    const filteredProducts = await productModel.find(filterConditions);
    const productOffers = await productOfferModel.find();
    const categoryOffers = await categoryOfferModel.find();

    const populatedProducts = filteredProducts.map(product => {
      const productOffer = productOffers.find(offer => offer.product.toString() === product._id.toString());
      const categoryOffer = categoryOffers.find(offer => offer.category.toString() === product.category.toString());
      const offerPercentage = productOffer ? productOffer.productOffer : 0;
      const categoryOfferPercentage = categoryOffer ? categoryOffer.categoryOffer : 0;
      const finalOfferPercentage = Math.max(offerPercentage, categoryOfferPercentage);
      const offerPrice = product.price * (1 - finalOfferPercentage / 100);
      const roundedOfferPrice = Math.round(offerPrice);

      return { ...product.toObject(), offerPrice: roundedOfferPrice, offerPercentage: finalOfferPercentage };
    });

    const categories = await categoryModel.find();
    res.json({ categories, productData: populatedProducts });

  } catch (error) {
    console.error('Error filtering products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


export default
 {
  loadAddproduct,
  loadProducts,
  addProduct,
  upload,
  productDetails,
  editProductPage,
  editProduct,
  deleteProductImage,
  deleteProduct,
  loadProductfiller,
  filterProducts
};