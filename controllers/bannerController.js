
import bannerModel from "../models/bannerModel.js";


 const loadBanner = async (req, res) => {
  try {
    const banners = await bannerModel.find();
    res.render("admin/banners",{banners});
  } catch (error) {
    return res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
};


 const addBanner = async (req, res) => {
  try {
     const newBanner = new bannerModel({
       title: req.body.title,
       subtitle: req.body.subtitle,
       image: req.file ? req.file.filename : undefined,
       color: req.body.color,
     });
     await newBanner.save();
     res.redirect('/admin/banner'); 
  } catch (error) {
     console.error(error);
     return res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
 };


 const loadupdateBanner =async (req, res) => {
  try {
     const banner = await bannerModel.findById(req.params.id);
     if (!banner) {
       return res.status(404).send('Banner not found');
     }
     res.render('admin/bannerEdit', { banner });
  } catch (error) {
     console.error(error);
     return res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
 };


 const updateBanner = async (req, res) => {
  try {
     const banner = await bannerModel.findById(req.params.id);
     if (!banner) {
       return res.status(404).send('Banner not found');
     }
 
     // Update the banner fields
     banner.title = req.body.title;
     banner.subtitle = req.body.subtitle;
     banner.color = req.body.color;
     banner.image = req.file?req.file.filename:banner.image;
 
     console.log("title:",banner.title);
     console.log("subtitle:",banner.subtitle);
     console.log("color:",banner.color);
     console.log("image:",banner.image);
     await banner.save();
 
     console.log("updated banner:", banner);
     res.redirect('/admin/banner');
  } catch (error) {
     console.error(error);
     return res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
 };

 const deleteBanner = async (req, res) => {
  const { id } = req.params;
  console.log("id is :", id);
  try {
     const banner = await bannerModel.findById(id);
     if (!banner) {
       console.log("No banner found with the given ID.");
       return res.status(404).render("adminerror",{ message: 'No banner found with the given ID.' });
     }

     const result = await bannerModel.findByIdAndDelete(id);
 
     if (result) {
       res.status(200).json({ message: 'Banner deleted successfully' });
     } else {
       res.status(500).json({ message: 'Failed to delete banner' });
     }
  } catch (error) {
     console.error("Error in deleteBanner:", error);
     return res.status(500).render('adminerror', { message: 'Internal Server Error', success: false, msg: '', product: {} });
  }
 };
 

export default{
loadBanner,
addBanner,
loadupdateBanner,
deleteBanner,
updateBanner
}