import { ContactModel } from "../../models/contact.js";
import logger from '../../notification/services/logger.js';
const contactcontroller = async(req, res) => {
    try {
        // console.log(req.body)
        const {name,
            email,
            loca,
            heading,
            para} = req.body;
        if (!name || !email || !loca || !heading || !para){
            res.json({success: false, message: "Fill all detail"});
        }
        const newContact = await ContactModel.create( {name,email,loca, heading, para});
        await newContact.save();

        return res.json({success:true , message: "We contact you as soon as possible" });
    } catch (error) {
        logger.error('Failed to create contact request', { error: error.message });
        return res.json({success: false, message: error.message})
    }
}

export default contactcontroller