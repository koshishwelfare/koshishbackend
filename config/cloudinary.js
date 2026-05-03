import {v2 as cloudinary} from 'cloudinary'
import config from '../config.js';
import logger from '../notification/services/logger.js';

const ConnectCloudinary = async ()=>{
   try {
    cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret,
    });
   } catch (error) {
       logger.error('ConnectCloudinary failed', { error: error.message });
   }
    
}
export default ConnectCloudinary;