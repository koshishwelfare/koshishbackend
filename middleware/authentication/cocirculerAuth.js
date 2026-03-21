import { verifyAuthToken } from '../../utils/authToken.js';
//  admin authentication middlewre
const authCociculer = async (req,res,next)=>{
      try{
            const tokenFromBearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
            const authcociculertoken = req.headers.authcociculertoken || req.headers.authCociculertoken;
            const cookieToken = req.cookies?.cocirculerToken;
            const token = tokenFromBearer || authcociculertoken || cookieToken;
            
            if(!token){
                return res.status(401).json({success: false, message: "Web token is Null or undefined"})
            }
            
            const tokenDecode = verifyAuthToken(token)
            if( tokenDecode?.role !== 'cocirculer' ){
                return res.status(401).json({success: false, message: "Not Authorized Login again"})
            }
            
            req.cocircular = tokenDecode;
            req.authRole = tokenDecode.role;
            // return res.json({success: true, message:"you are login" })
            next();
      }
      catch(error){
         res.status(401).json({success: false, message: error.message})
      }
}
export default authCociculer;