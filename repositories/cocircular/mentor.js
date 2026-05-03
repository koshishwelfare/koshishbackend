
import logger from '../../notification/services/logger.js';
import MemberModel from "../../models/member/MemberSchema.js";

const addMentorDB = async(mentorData)=>{
   const newMentor =  await  MemberModel.create(mentorData);
   return newMentor;
}
const CertifyMentorDB = async(id)=>{
   // console.log("certify", id);
     const {isCertify} =await MemberModel.findById(id)
      await  MemberModel.findByIdAndUpdate(id, {isCertify:!isCertify})
}
const terminateMentorDB = async(id)=>{
      const {isActive} =await MemberModel.findById(id)
       await  MemberModel.findByIdAndUpdate(id, {isActive:!isActive,leaveTime : Date.now() })
}
const topMentorDB = async(id)=>{
    const {isTop} = await MemberModel.findById(id)

    await MemberModel.findByIdAndUpdate(id, {isTop: !isTop})
}
const AllMentorDB = async (filter = {})=>{
   try {
      const data = await MemberModel.find(filter);
      logger.debug('Fetched mentors', { count: data.length });
      return data.reverse()
   } catch (error) {
      logger.error('Failed to fetch mentors', { error: error.message });
   }
   
   
//    const myData = 
  
}
const mentorByIdDB = async (id)=>{
   const data = await MemberModel.findById(id);
   logger.debug('Fetched mentor by id', { id, found: !!data });
//    const myData = 
   return data
}
const AllAlumniDB = async ()=>{
   const data = await MemberModel.find({isActive:false});
   logger.debug('Fetched alumni', { count: data.length });
//    const myData = 
   return data.reverse()
}
const updateMentor = async (id, data)=>{
   try {
      await  MemberModel.findByIdAndUpdate(id, data)
      .then(updatedUser => {
         if (updatedUser) {
         //   console.log('User updated successfully:', updatedUser);
         } else {
         //   console.log('User not found');
         }
       })
       .catch(error => {
         // console.error('Error updating user:', error);
       });
   } catch (error) {
         logger.error('Failed to update mentor', { error: error.message });
   }
    
}
export {
    addMentorDB,
    terminateMentorDB,
    AllMentorDB,
    updateMentor,
    AllAlumniDB,
    mentorByIdDB,
    topMentorDB,
    CertifyMentorDB
}