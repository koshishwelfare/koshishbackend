import { v2 as cloudinary } from "cloudinary";
import CocicularModel from "../../models/Cocirculer/cocerculerProfile.js";
import logger from '../../notification/services/logger.js';
const updatecocerculerprofile = async(req,res) => {
    try {
      const {
        email,
        speciality,
        about,
        address,
      } = req.body;
    //   const imagefile = req.file;
      // console.log(
      //   speciality,
      //   about,
      //   address,
      //   // imagefile
      // );
      // checking for all data for docotor
      if (
        !email ||
        !speciality ||
        !about ||
        !address
      )
        return res.json({ success: false, msg: `fill all required field` });
     
    //   if (!imagefile) {
    //     return res.json({ success: false, message: "Please upload an image" });
    // }

      //  upload image to cloudnary
  
    //   const imageUpload = await cloudinary.uploader.upload(imagefile.path, {
    //     resource_type: "image",
    //   });
    //   const imageURL = imageUpload.secure_url;
      //  save in our database
  
      const cocircularData = {
        // image: imageURL,
        speciality,
        about,
        address: address,
      };
      logger.debug('Updating co-curricular profile', { email });
    //   const newCocirculer = new CocicularModel(cocircularData);
    //   await newCocirculer.save();
    const update = await CocicularModel.findOneAndUpdate({email},cocircularData);
    if (update)  res.json({ success: true, meg: "love u Abhishek" });
    else res.json({ success: false, meg: "some error" });
    } catch (error) {
      logger.error('Failed to update co-curricular profile', { error: error.message });
  
      res.json({ success: false, msg: error.message, where: "i am update cocirculer" });
    }
}

export default updatecocerculerprofile