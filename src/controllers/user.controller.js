import { asyncHandler } from "../utils/asyncHandler.js";
import{ ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens =  async(userId) => {
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}

    } catch(error){ 
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens!")
    }

}

const registerUser = asyncHandler( async (req,res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const {fullName, email, username, password } = req.body
    console.log("email: ", email);


    // Following if condition checks if any of the fields (fullName, email, username, or password) 
    // are either empty or consist of only whitespace. It uses .some() to evaluate each field, 
    // trimming whitespace and comparing it to an empty string. If any field is empty, 
    // the condition returns true.
    if ( 
        [fullName, email, username, password].some((field) =>
        field?.trim() === "")
        ){
            throw new ApiError(400, "All fields are required")
        }


        //Following query searches for a user in the database where 
        // either the username or the email matches the provided 
        // values. It uses the $or operator to check both fields simultaneously.
        const existedUser = await User.findOne({
            $or: [{username}, {email}]
        })

        if (existedUser){
            throw new ApiError(409, "User with email or name already exists")
        }  


        const avatarLocalPath = req.files?.avatar[0]?.path;
        // const coverImageLocalPath = req.files?.coverImage[0]?.path;

        let coverImageLocalPath;
        if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
            coverImageLocalPath = req.files.coverImage[0].path
        }

        // yha hm check kr rhey hn k images upload to krli hain multer sey
        // pr check kr rhey hn k aya bhi h ya nhi

        // coverImage check nhi ki q k its not compulsary to add

        if(!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is required");
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        // ab cloudinary p check krengey k upload hua bhi h ya nhi localStorage sey 
        // wrna db phatega

        if(!avatar) {
            throw new ApiError(400, "Avatar file is required");
        }


        // User is being used to talk to the db
        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        })
        
        // ye jo select() method hai ye usmey sab ata hai pr aap
        // jis field k sath - laga den wo nhi ata
        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the user")
        }

        return res.status(201).json(
            new ApiResponse(200, createdUser, "User registered Succesfully!")
        )

})

const loginUser = asyncHandler( async (req, res) => {
    // req body => data
    // username or email
    // find the user
    // password check
    // generate access and refresh tokens
    // send cookie

    const {email, username, password } = req.body;

    if(!username && !email){
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User not found")
    }

                                // idhe user tmhara variable hai aur User with a capital U 
                                // mongoDB wala variable hai. both are diff
    const isPasswordCorrect = await user.isPasswordCorrect(password)

    if (!isPasswordCorrect) {    
        throw new ApiError(401, "Invalid credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
   
    // cookies k liye kuch options set krney prtey hn
    // cookies ko by default koi bhi modify kr skta hai front end pey
    // pr jb aap httpOnly: true aur secure: true
    // krdetey ho tou wo srf server sey modify ho skti hai

    const options = {
        httpsOnly: true,
        secure: true
    }

    // ab sawal ye h k jb accessToken aur refreshToken bhej diye
    // tou phr json object me alag sey q bhej rhey hn?
    // answer is, yha hm wo case access kr rhey hn jab user 
    // khud save krna chah rha ho in local storage ya wo mobile
    // app bana rha ho wha chahye ho...
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Succesfully"
        )

    )
})

// logout krtey time sbsey phley aap cookies delete krtey hn
// us k baad refresh tokens ko reset
const logoutUser = asyncHandler( async (req, res) => {
   
    // auth ka middleware phley verify krega k user h ya nhi

     await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
                new: true
            
        } 
        )

        const options =  {
            httpsOnly: true,
            secure: true
        }

        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged Out Succesfully"
            )
        )
   
   
    // User.findByIdAndUpdate(
    //     req.user._id,
    //     {
    //         refreshToken: ""
    //     },
    //     {
    //         new: true
    //     }
    // )
    // return res.status(200).json(
    //     new ApiResponse(200, null, "User logged Out Succesfully")
    // )
})

const refreshAccessToken = asyncHandler(async (req, res) =>
{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    // HITESH HAS MADE A MISTAKE HERE, HE DID NOT ADD !
    if (!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }
try {
    
        // idhr hmney incomingToken ko decodedToken me convert krdia
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
        
        // below one to check agr hmara refreshToken expire hgya hai ya invalid hai to
        if(incomingRefreshToken !== !user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpsOnlu: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                 accessToken, refreshToken: newRefreshToken
                },
                "Access Token Refreshed"
            )
        )
} catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token")
}

})

const changeCurrentPassword = asyncHandler( async(req, res) =>{

    // ye check FE p bhi hjati h pr BE p bhi krwa sktey hn
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Old password is incorrect")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully"
        )
    ) 
})

const getCurrentUser = asyncHandler( async(req, res) => {
    // const user = await User.findById(req.user._id) // this line by Supermaven only
    return res
    .status(200)
    .json(200, req.user, "Current User fetched successfully"
    )
})

const updateAccountDetails = asyncHandler( async(req, res) => {
    const { fullName, email } = req.body 

    if(!fullName || !email){
        throw new ApiError(400, "Full name and email are required!")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true // issey jo updated information hti h wo return bhi ati hai
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully") )
})

// Now talking about updating files
// 1. Use multer middleware to accept files
// 2. Only he who is logged in, can update the file
// have to keep this in mind while routing

const updateUserAvatar = asyncHandler( async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    // agar upload hgya h aur url nhi mila h tou check to throw error
    if(!avatar.url) {
        throw new ApiError(400, "Error while uploading the avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
        $set:{
            avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "User avatar updated successfully"))
})


const updateUserCoverImage = asyncHandler( async(req, res) => {
    
    
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // agar upload hgya h aur url nhi mila h tou check to throw error
    if(!coverImage.url) {
        throw new ApiError(400, "Error while uploading the Cover Image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
        $set:{
            coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"))
})


export { registerUser,
        loginUser, 
        logoutUser, 
        refreshAccessToken, 
        changeCurrentPassword, 
        getCurrentUser, 
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage
}