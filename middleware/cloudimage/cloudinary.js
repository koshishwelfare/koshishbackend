import {v2 as cloudinary} from 'cloudinary'
  // Cloudinary Upload Image
import fs from 'fs'
import logger from '../../notification/services/logger.js';
const cloudinaryUploadImage =  async(fileToUpload) => {
    try {
      // console.log('i am cloudnaryupload function', fileToUpload);
      if (!fileToUpload) return null;
      const data = await cloudinary.uploader.upload(fileToUpload.path, {
        folder: 'koshish',           // Creates folder if it doesn't exist
       resource_type: 'auto',               // image | video | raw | auto
        overwrite: true                       // Optional: overwrite if exists
      })
      fs.unlink(fileToUpload.path, (err) => {
        if (err) {
            // console.error("Error deleting temp file:", err);
        } else {
            // console.log("Temporary image deleted:", fileToUpload.path);
        }
    });
      // console.log("data : ",data);
      return data;
    } catch (error) {
      logger.error('Cloudinary upload failed', { error: error.message });
      throw new Error("Internal Server Error (cloudinary)",error);
    }
  };

  // Cloudinary Remove Image
const cloudinaryRemoveImage = async (imagePublicId) => {
    try {
      // console.log("")
      const result = await cloudinary.uploader.destroy(imagePublicId);
      return result;
    } catch (error) {
      logger.error('Cloudinary remove image failed', { error: error.message });
      throw new Error("Internal Server Error (cloudinary)");
    }
  };

  // Cloudinary Remove Multiple Image
const cloudinaryRemoveMultipleImage = async (publicIds) => {
    try {
      logger.debug('Removing multiple cloudinary images', { count: Array.isArray(publicIds) ? publicIds.length : 0 });
      const result = await cloudinary.api.delete_resources(publicIds)
      return result;
    } catch (error) {
      logger.error('Cloudinary remove multiple images failed', { error: error.message });
        throw new Error("Internal Server Error (cloudinary)");
    }
  };

  export  {
    cloudinaryUploadImage,
    cloudinaryRemoveImage,
    cloudinaryRemoveMultipleImage,
  };