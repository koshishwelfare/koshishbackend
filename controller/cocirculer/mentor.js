import  {cloudinaryUploadImage, cloudinaryRemoveImage }  from '../../middleware/cloudimage/cloudinary.js'
import { addMentorDB, terminateMentorDB, AllMentorDB,CertifyMentorDB,updateMentor,mentorByIdDB,topMentorDB}   from '../../repositories/cocircular/mentor.js'
import bcrypt from 'bcrypt';
import MemberModel from '../../models/member/MemberSchema.js';
import { generateTempPassword, generateUsernameFromName } from '../../utils/credentials.js';
import { sendCredentialTemplateEmail } from '../../utils/mailer.js';
const addMentor = async(req, res ) => {
   try {
          const {name,email,isActive, isTop,classTeacher,linkedin,speciality,quote, aboutHead, about, role = 'mentor'}= req.body;
       const allowedRoles = ['mentor', 'alumni', 'sponsor', 'visionary'];
          if(!name || !email){
            return res.json({success:false, message:"fill all details"})
          }
          if (!allowedRoles.includes(String(role).toLowerCase())) {
            return res.json({ success:false, message: 'Invalid role. Use mentor, alumni, sponsor, or visionary' });
          }

          const normalizedEmail = String(email).trim().toLowerCase();
          const existingMember = await MemberModel.findOne({ email: normalizedEmail });
          if (existingMember) {
            return res.json({ success: false, message: 'Member already exists with this email' });
          }

          const plainPassword = generateTempPassword();
          const hashedPassword = await bcrypt.hash(plainPassword, 10);

          let username = generateUsernameFromName(name);
          while (await MemberModel.findOne({ username })) {
            username = generateUsernameFromName(name);
          }

          const memberImage = req.file
          const memberData ={
            name,
            email: normalizedEmail,
            username,
            password: hashedPassword,
            isActive: typeof isActive === 'boolean' ? isActive : true,
            isTop: Boolean(isTop),
            speciality: speciality || 'General',
            linkedin: linkedin || 'https://linkedin.com',
            about: about || 'Member profile',
            quote: quote || 'Learning never stops',
            aboutHead: aboutHead || 'About',
            role: String(role).toLowerCase()
         }
          if (classTeacher) {
            memberData.classTeacher = classTeacher;
          }
          if (memberImage) {
            const imageData = await cloudinaryUploadImage(memberImage)
            memberData.image = imageData.secure_url
          }
          const createdMember = await addMentorDB(memberData)

          const mailResult = await sendCredentialTemplateEmail({
            to: normalizedEmail,
            name,
            username,
            password: plainPassword,
            label: `Member Account Created (${String(role).toLowerCase()})`
          });

          res.json({
            success: true,
            message: 'New member added',
            data: {
              _id: createdMember?._id,
              name: createdMember?.name,
              email: createdMember?.email,
              username: createdMember?.username,
              role: createdMember?.role
            },
            email: {
              sent: mailResult.sent,
              reason: mailResult.reason || null
            },
            credentials: mailResult.sent ? undefined : {
              username,
              password: plainPassword
            }
          }) 
   } catch (error) {
            // console.log(error)
            res.json({success:false, message: error.message})
   }
}

const terminateMentor = async (req,res)=>{
  try {
    const {id} = req.params
    await terminateMentorDB(id)
    .then (()=>{
      res.json ({success:true, message: "Member status updated"});
    })
  } catch (error) {
           console.log(error)
           res.json({success:true, message: error.message})
  }
}
const CertifyMember = async (req,res)=>{
  try {
    const {id} = req.params
    await CertifyMentorDB(id)
    .then (()=>{
       res.json ({success:true, message: "Member is certify"});
    })
  } catch (error) {
           console.log(error)
           res.json({success:true, message: error.message})
  }
}
const TopMentor = async (req,res)=>{
  try {
    const {id} = req.params
    await topMentorDB(id)
    .then (()=>{
      res.json ({success:true, message: "Top member status updated"});
    })
  } catch (error) {
           console.log(error)
           res.json({success:true, message: error.message})
  }
}
const AllMentor = async(req,res)=>{
  try {
    const { role } = req.query;
    const filter = role ? { role: String(role).toLowerCase() } : {};
    const data =  await AllMentorDB(filter) 
    return res.json({success:true, data, message : "All members found"});
  } catch (error) {
           console.log(error)
           res.json({success:false, message: error.message})
  }
}

const getMentorById = async(req,res)=>{
  try {
    const {id} =  req.params
    const data = await  mentorByIdDB(id);
    return res.json({success:true, data, message : "Member found by id"});
  } catch (error) {
           console.log(error)
           res.json({success:true, message: error.message})
  }
}

const updateMentorById = async( req , res)=>{
      try {
        const { id } = req.params;
        const { name, email, isActive, isTop, role } = req.body;
  const allowedRoles = ['mentor', 'alumni', 'sponsor', 'visionary'];

        if (!name || !email) {
          return res.json({ success: false, message: 'name and email are required' });
        }

        if (role && !allowedRoles.includes(String(role).toLowerCase())) {
          return res.json({ success: false, message: 'Invalid role. Use mentor, alumni, sponsor, or visionary' });
        }

        await updateMentor(id, {
          name: String(name).trim(),
          email: String(email).trim().toLowerCase(),
          isActive: Boolean(isActive),
          isTop: Boolean(isTop),
          ...(role ? { role: String(role).toLowerCase() } : {})
        });

        return res.json({ success: true, message: 'successfully updated' });

      } catch (error) {
        // console.log(error)
        return res.json({ success: false, message: error.message })
      }
}
const updateMemberRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const allowedRoles = ['mentor', 'alumni', 'sponsor', 'visionary'];

    if (!role) {
      return res.json({ success: false, message: 'role is required' });
    }

    const normalizedRole = String(role).trim().toLowerCase();
    if (!allowedRoles.includes(normalizedRole)) {
      return res.json({ success: false, message: 'Invalid role. Use mentor, alumni, sponsor, or visionary' });
    }

    const updated = await MemberModel.findByIdAndUpdate(
      id,
      { role: normalizedRole },
      { new: true }
    );

    if (!updated) {
      return res.json({ success: false, message: 'member not found' });
    }

    return res.json({
      success: true,
      message: 'member role updated',
      data: {
        _id: updated._id,
        role: updated.role,
        name: updated.name
      }
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
}

export { addMentor, terminateMentor, AllMentor, updateMentorById,getMentorById,TopMentor,CertifyMember, updateMemberRoleById}