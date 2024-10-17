import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"


// export const verifyJWT = asyncHandler(async (req, _, next) => {
    // res jb na ho tb aao uski jaga underscore _ bhi laga skte hn

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try { 
        
        // ? isliye lgaya h q k ho skta hai cookies me acess token na ho
        // q k user mobile app sey le rha ho custom header sey
        req.cookies?.accessToken || req.header
        ("Authorization")?.replace("Bearer", "")
    
        if(!token){
            throw new ApiError(401, "Unauthorized Request");
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await  User.findById(decodedToken?._id).select("-password -refreshToken");
    
        if(!user){
            throw new ApiError(401, "Invalid Access Token");
        }
    
        // ab jb pata chal gaya h k user exist krta h
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid Access Token")
        
    }
})