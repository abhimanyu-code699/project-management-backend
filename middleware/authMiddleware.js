const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

exports.verifyToken = async(req,res,next) =>{
    try {
        const token = req.header("Authorization")
        if (!token) {
            return res.status(401).json({ message: "No token, authorization denied" })
        }
        const decode = jwt.verify(token,process.env.JWT_SECRET);
        if(!decode){
            return res.status(409).json({message:'Invalid token'})
        }

        req.user = decode;
        next();
    } catch (error) {
        res.status(401).json({ message: "Token is not valid" })
    }
}

exports.authorize = (...role) =>{
    return (req,res,next) =>{
        if(!role.includes(req.user.role)){
            return res.status(403).json({ message: "Permission denied" })
        }
        next()
    }
}