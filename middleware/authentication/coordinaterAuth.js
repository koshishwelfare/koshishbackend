import { verifyAuthToken } from '../../utils/authToken.js';
//  admin authentication middlewre
const authCoodinater = async (req,res,next)=>{
      try{
            const tokenFromBearer = req.headers.authorization?.startsWith('Bearer ')
              ? req.headers.authorization.split(' ')[1]
              : null;
            const {authcooditoken, authcoordinatertoken} = req.headers;
            const cookieToken = req.cookies?.coordinatorToken;
            const token = tokenFromBearer || authcooditoken || authcoordinatertoken || cookieToken;
            if(!token){
                return res.status(401).json({success:false, message:'Not authorized. Please login again'})
            }
            const tokenDecode = verifyAuthToken(token)
            if (tokenDecode?.role !== 'coordinator') {
                return res.status(401).json({success:false, message:'Not authorized. Please login again'})
            }
            req.coordinator = tokenDecode;
            req.authRole = tokenDecode.role;
            next();
      }
      catch(error){
         console.log(error);
         return res.status(401).json({success: false, message: 'Session expired. Please login again'})
      }
}
export default authCoodinater;