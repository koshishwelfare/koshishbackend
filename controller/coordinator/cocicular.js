import validator from "validator";
import bycrypt from "bcrypt";
import {cloudinaryUploadImage} from "../../middleware/cloudimage/cloudinary.js";
import changeCocercular  from "../../repositories/coordinator/changeco-cercular.js";
import CocicularModel from "../../models/Cocirculer/cocerculerProfile.js";

const buildCocircularPayload = ({ name, email, password, speciality, about, degree }) => ({
  name: String(name || "").trim(),
  email: String(email || "").trim().toLowerCase(),
  password,
  speciality: String(speciality || "General").trim(),
  degree: String(degree || "B.tech").trim(),
  about: String(about || "Created by coordinator").trim(),
  isactive: true
});

const changecocirculer = async (req, res) => {
  console.log("i am in change cocirculer controller", req.body, req.file);
  try {
    const { name, email, password, speciality, about, degree } = req.body;
    const imgfile = req.file;
    // console.log("imagefile", imgfile);
    // console.log(
    //   "all request resourse",
    //   name,
    //   email,
    //   password,
    //   speciality,
    //   about,
    //   address
    // );
    // Minimal required fields for coordinator onboarding flow.
    if (!name || !email || !password) {
      return res.json({ success: false, message: "name, email and password are required" });
    }
    //  validating email formate
    if (!validator.isEmail(email)) {
      return res.json({
        success: false,
        message: "Please enter a valid email",
      });
    }
    //  validating strong password
    if (password.length < 8) {
      return res.json({
        success: false,
        message: "please enter valid password",
      });
    }

    const existingUser = await CocicularModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.json({
        success: false,
        message: "Co-curricular user already exists with this email"
      });
    }

    //  hasing doctor password
    const salt = await bycrypt.genSalt(10);
    const hashPassword = await bycrypt.hash(password, salt);
    // console.log("hashpassword", hashPassword);
    //  upload image to cloudnary
    let imageUrl;
    if (imgfile) {
      const imageUpload = await cloudinaryUploadImage(imgfile);
      imageUrl = imageUpload?.secure_url;
    }
    //  save in our database
    // console.log("i am uploaded img : ",imageUpload)
    const cocircularData = buildCocircularPayload({
      name,
      email,
      password: hashPassword,
      speciality,
      about,
      degree
    });
    if (imageUrl) {
      cocircularData.image = imageUrl;
    }
    // console.log(cocircularData);

    // const newCocirculer = new CocicularModel(cocircularData);
    // await newCocirculer.save();
   await changeCocercular(cocircularData)
    
    res.json({ success: true, message: "Co-curricular profile updated successfully" });
  } catch (error) {
    console.log(error);

    res.json({
      success: false,
      message: error.message,
    });
  }
};

const listCocircularUsers = async (req, res) => {
  try {
    const {
      q = '',
      isactive,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    const parsedIsactive =
      isactive === 'true' ? true : isactive === 'false' ? false : undefined;

    const data = await changeCocercular.list({
      search: q,
      isactive: parsedIsactive,
      sortBy,
      sortOrder,
      page: Number(page) || 1,
      limit: Number(limit) || 10
    });

    return res.json({ success: true, ...data });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const activateCocircularUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await changeCocercular.activate(id);

    if (!user) {
      return res.json({ success: false, message: "Co-curricular user not found" });
    }

    return res.json({
      success: true,
      message: "Co-curricular activated successfully. Other users were deactivated.",
      user
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const deactivateCocircularUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await changeCocercular.deactivate(id);

    if (!user) {
      return res.json({ success: false, message: "Co-curricular user not found" });
    }

    return res.json({ success: true, message: "Co-curricular deactivated successfully", user });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export default changecocirculer;
export { listCocircularUsers, activateCocircularUser, deactivateCocircularUser };
