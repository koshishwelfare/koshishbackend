import {v2 as cloudinary} from 'cloudinary'
import config from '../config.js';

const ConnectCloudinary = async ()=>{
   try {
    cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret,
    });
   } catch (error) {
        console.log("ConnectCloudinary : ",error)
   }
    
}
export default ConnectCloudinary;