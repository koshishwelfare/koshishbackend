import {v2 as cloudinary} from 'cloudinary'
import config from '../config.js';
import logger from '../notification/services/logger.js';

const ConnectCloudinary = async ()=>{
   try {
    console.log('[CLOUDINARY] Configuring Cloudinary...');
    cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret,
    });
    console.log('[CLOUDINARY] Cloudinary configured successfully');
    logger.info('Cloudinary configured successfully');
   } catch (error) {
       console.error('[CLOUDINARY ERROR] Failed to configure Cloudinary:', error);
       logger.error('ConnectCloudinary failed', { error: error.message, stack: error.stack });
       throw error; // Re-throw to be caught by server.js
   }
};
export default ConnectCloudinary;