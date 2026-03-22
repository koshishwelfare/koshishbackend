
import MemberModel from "../../models/member/MemberSchema.js";
const getMyMember =async (req,res) => {
  try {
    const {id} = req.body
    // console.log("myid: ", id)
    if(!id) {
        return res.json ({success:false, message: "please fill valid id"})
    }
    const data = await MemberModel.findById(id);
    const {name,linkedin,image,speciality,yog,type,isActive,quote,aboutHead,about, classTeacher,leaveTime,joinTime,}=data;
    const sendData = {name,linkedin,yog,image,type,isActive,speciality,quote, aboutHead,about, classTeacher,leaveTime,joinTime,}
    // console.log("---> ",  data)
    res.json({success:true, data: sendData, message: `Member found by id: ${id}`});

  } catch (error) {
    //  console.log(error)
     res.json({success:false , message: error.message});
  }
}

export default getMyMember