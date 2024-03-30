
import AddressModel from "../models/addressModel.js";
import categoryModel from '../models/categoryModel.js';
import { ObjectId } from 'mongodb';

const loadSavedAddress = async (req, res) => {
  try {


    const userId = req.session.userId;

   if(!userId){
    res.redirect('/login')
   }

    const categories = await categoryModel.find();
    const userAddress = await AddressModel.findOne({ user_id: userId });
    const addresses = userAddress ? userAddress.addresses : [];

    res.render('users/savedaddress', { addresses, categories, req });
  } catch (error) {
    console.log("Error from addressload", error);
    res.status(500).render('users/error', { error: 'Internal Server Error' });
  }
};

const loadAddaddress = async (req, res) => {
  try { 
    const userId = req.session.userId;

    if(!userId){
     res.redirect('/login')
    }


    const categories = await categoryModel.find();
    const userAddress = await AddressModel.findOne({ user_id: userId });
    const addresses = userAddress ? userAddress.addresses : [];




    res.render('users/addAddress', { addresses, categories, req ,source: req.query.source});
  } catch (error) {
    console.log("Error from addaddressload", error);
    res.status(500).render('users/error', { error: 'Internal Server Error' });
  }
}

const loadEditaddress = async (req, res) => {
  try {
    const userId = req.session.userId;

    if(!userId){
     res.redirect('/login')
    }
    const addressId = req.params.id;
    const categories = await categoryModel.find();
    const userAddress = await AddressModel.findOne({ user_id: userId });

    if (!userAddress) {
      return res.status(404).render('users/error', { error: 'User address not found' });
    }

    if (!Array.isArray(userAddress.addresses)) {
      return res.status(404).render('users/error', { error: 'Addresses not found or not an array' });
    }

    console.log("User Address IDs:", userAddress.addresses.map(address => address._id.toString()));

    const editAddress = userAddress.addresses.find((address) => address._id.toString() === addressId);

    
    if (!editAddress) {
      return res.status(404).render('users/error', { error: 'Address not found' });
    }

    res.render('users/editaddress', { categories, req, userAddress, editAddress, addressData: editAddress, source: req.query.source });
  } catch (error) {
    console.log("Error from editaddressload", error);
    res.status(500).render('users/error', { error: 'Internal Server Error' });
  }
}



const addAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { name, mobileNo, pinCode, address, localityTown, city, state, extraMobileNo, defaultAddress } = req.body;
    let userAddress = await AddressModel.findOne({ user_id: userId });


    const newAddress = {
      name,
      mobileNo,
      pinCode,
      address,
      localityTown,
      city,
      state,
      extraMobileNo,
      defaultAddress: defaultAddress === 'false' // Convert defaultAddress string to boolean
    };
     
    if (!userAddress) {
      userAddress = new AddressModel({
        user_id: userId,
        addresses: [newAddress]
      });
    } else {

      userAddress.addresses.push(newAddress);
    }

    await userAddress.save();

    const source = req.query.source;
    console.log("Source:", source); 

    if (source === 'savedaddress') {
    
      res.redirect('/address/loadSavedaddress');

    } else if (source === 'checkout') {

      res.redirect('/order/checkoutaddress');
    
    } else {

      res.redirect('/');
    }
  } catch (error) {
    console.log("Error adding address:", error);
    res.status(500).render('users/error', { error: 'Internal Server Error' });
  }
}

const editAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addressId = req.params.id;

    let userAddress = await AddressModel.findOne({ user_id: userId });

    if (!userAddress) {
      return res.status(404).json({ message: 'User address not found' });
    }

    // Find the index of the address to be edited
    const addressIndex = userAddress.addresses.findIndex(address => address._id.toString() === addressId);

    if (!ObjectId.isValid(addressId) || addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const updatedAddress = {
      name: req.body.name,
      mobileNo: req.body.mobileNo,
      pinCode: req.body.pinCode,
      address: req.body.address,
      localityTown: req.body.localityTown,
      city: req.body.city,
      state: req.body.state,
      extraMobileNo: req.body.extraMobileNo,
      defaultAddress: req.body.defaultAddress === 'true'
    };

    // If the updated address is set as default, update the existing default address
    if (updatedAddress.defaultAddress) {
      userAddress.addresses.forEach(addr => {
        addr.defaultAddress = false;
      });
      updatedAddress.defaultAddress = true;
    }

    // Update the address in the array
    userAddress.addresses[addressIndex] = updatedAddress;

    // Save the updated user's address document
    await userAddress.save();

    const source = req.query.source;
    console.log("Source:", source); // Log the value of source
    const referer = req.headers.referer; // Get the referer URL
    console.log("Referer:", referer); // Log the value of referer

    if (source === 'savedaddress') {
      res.redirect('/address/loadSavedaddress');
    } else if (source === 'checkout') {
      res.redirect('/order/checkoutaddress');
    } else if (referer) {
      res.redirect(referer);
    } else {
      res.redirect('/');
    }
  } catch (error) {
    console.log("Error editing address:", error);
    res.status(500).render('error', { error: 'Internal Server Error' });
  }
}


const removeAddress = async (req, res) => {
  try {
    const userId = req.session.userId; // Change res.session.userId to req.session.userId
    const addressId = req.params.id;

    // Find the user's address document
    const userAddress = await AddressModel.findOne({ user_id: userId });

    // Find the index of the address to be removed
    const addressIndex = userAddress.addresses.findIndex(
      (address) => address._id.toString() === addressId
    );

    // Check if the addressId is a valid ObjectId and if the address is found
    if (!ObjectId.isValid(addressId) || addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // Check if the address to be removed is the default address
    const isDefaultAddress = userAddress.addresses[addressIndex].defaultAddress;

    // Remove the address from the array
    userAddress.addresses.splice(addressIndex, 1);

    // If the removed address was the default, handle setting a new default
    if (isDefaultAddress) {
      // Check if there are remaining addresses
      if (userAddress.addresses.length > 0) {
        // Set the first address as the new default
        userAddress.addresses[0].defaultAddress = true;
      }
    }

    // Save the updated userAddress document
    await userAddress.save();

    // Redirect or send a response as needed
    res.redirect('/address/loadSavedaddress');
  } catch (error) {
    console.log('error from removeAddress', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export default {
  loadSavedAddress,
  loadAddaddress,
  loadEditaddress,
  addAddress,
  editAddress,
  removeAddress
}