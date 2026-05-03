import logger from "../../notification/services/logger.js";
import { Announcement } from "../../models/App/announcementSchema.js";

const saveAnnouncementDB = async(data)=>{
    try {
       await Announcement.create(data)
    } catch (error) {
        logger.error('Failed to save announcement', { error: error.message });
        throw Error(error.message)
    }
}

const updateAnnouncementDB = async (id, data)=>{
     await Announcement.findByIdAndUpdate(id , data);
}

const hideAnnouncementDB = async(id)=>{
       await Announcement.findByIdAndUpdate({_id:id},{isAtive:false} )
}

const getNewsByIdDB = async(id)=>{
   const data =  await Announcement.findById(id )
   return data;
}
const getNewsAllDB = async()=>{
    // console.log("I am get all News DB ")
    const data =  await Announcement.find({})
    logger.debug('Fetched announcements', { count: data.length });
    return data;
 }
 


export {
    saveAnnouncementDB,
    updateAnnouncementDB,
    hideAnnouncementDB,
    getNewsByIdDB,
    getNewsAllDB
}