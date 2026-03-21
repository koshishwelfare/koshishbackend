import mongoose from "mongoose";
import defaultImg from "../../controller/defaultimg.js";
const MemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    unique: true
  },
  password: {
    type: String,
    default: ''
  },
  linkedin: {
    type: String,
    default: '',
  },
  linkedinUrl: {
    type: String,
    default: ''
  },
  instagramUrl: {
    type: String,
    default: ''
  },
  facebookUrl: {
    type: String,
    default: ''
  },
  youtubeUrl: {
    type: String,
    default: ''
  },
  websiteUrl: {
    type: String,
    default: ''
  },
  image:{
    type:String,
    default:defaultImg
  },
  profileImage: {
    type: String,
    default: ''
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  subject: {
    type: String,
    default: ''
  },
  classTeacher: {
    type: String,
    default: ''
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession',
    default: null
  },
  joinTime:{
    type: Date,
    default: Date.now
  },
  leaveTime:{
    type: Date,
    default: null
  },
  speciality:{
    type:String,
    default: '',

  },
  isVisionary:{
    type: Boolean ,
    default:false
  },
  isActive:{
    type: Boolean ,
    default:false
  },
  isCertify:{
    type: Boolean ,
    default:false
  },
  type:{
    type:Number,
    default:1
  },
  role: {
    type: String,
    enum: ['mentor', 'sponsor', 'alumni', 'collaborator'],
    default: 'mentor',
    required: true
  },
  isTop:{
    type: Boolean ,
    default:false
  },
  quote:{
      type:String,
      default: ''
  }, 
  aboutHead:{
      type: String,
      default: ''
  },
  yog:{
      type: Number,
      default: 2026
  } ,
  about:{
    type: String,
    default:"I love Koshish"
  }
}, { timestamps: true });
const MemberModel = mongoose.models.TeacherModel || mongoose.model('TeacherModel', MemberSchema);

export default  MemberModel;