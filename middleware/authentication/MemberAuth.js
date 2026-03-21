import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../../config/jwtSecret.js';
//  member authentication middlewre
const authMember = async (req,res,next)=>{
   
      try{
            const {authmembertoken} = req.headers;
            const cookieToken = req.cookies?.memberToken;
            const token = authmembertoken || cookieToken;
            if(!token){
                return res.json({sucess:false,authmembertoken:`${token}`, message:"Web token is Null or undefined"})
            }
            const tokenDecode= jwt.verify(token, getJwtSecret())
            
            if( tokenDecode !== process.env.COCICULAR_USERNAME + process.env.COCICULAR_PASSWORD ){
                return res.json({sucess:false, message:"Not Authorized Login again"})
            }
            // return res.json({success: true, message:"you are login" })
            next();
      }
      catch(error){
        //  console.log(error);
         res.json({sucess: false, message: error.message})
      }
}
export default authCociculer;