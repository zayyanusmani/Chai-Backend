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
            httpsOnly: true,
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
    .json(
        new ApiResponse(
            200,
            {}, 
        "Current User fetched successfully"
         ) )
})

const updateAccountDetails = asyncHandler( async(req, res) => {
    const { fullName, email } = req.body 

    if(!fullName || !email){
        throw new ApiError(400, "Full name and email are required!")
    }

    const user = await User.findByIdAndUpdate(
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

const getUserChannelProfile = asyncHandler( async( res, req) => {

    // params sey islye kr rhey hn q k url sey ayega
    const {username} = req.params

    if (!username?.trim()){
        throw new ApiError(400, "Username is required")
    }
        const channel = await User.aggregate([
            {
                $match: { // match is being used to match the username in db
                    username: username?.toLowerCase()
                },
            },
            {    // channel k subscriber kitney hn ye dekhney k liye lookup laga rhey hn
                $lookup: {
                    from: "subscriptions", // Not Subscription bcs model me sari cheeen lowercase aur plural me convert hjati hn
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            { // ab is channel ney ktney channels ko subscribe kia hua h wo nikalney k 
                // k liye ek aur pipeline aur ismey bhi lookup use krengey
                $lookup: {
                    from: "subscriptions", // Not Subscription bcs model me sari cheeen lowercase aur plural me convert hjati hn
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {   // ye opar wali 2 fileds tou agayi hmarey pas, 
                // ab hmey inhe add krna prega 
                
                //add fields ye krta h k jtni hmarey pas values hn unko rkhta h pr 
                //  pr additional fields bhi add krdega
                $addFields: {
                    subscriberCount: {
                        $size: "$subscribers" // $size is used to count
                    },
                    channelsSubscribedToCount: {
                        $size: "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                            then: true,
                            else: false
                        },
                    },
                    
                }
            },
            { // $project is used for Reshapes each document by including or excluding fields,
                //  as well as adding computed fields.
                $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                    subscriberCount: 1,
                    channelsSubscribedToCount: 1,
                    isSubscribed: 1,
                    coverImage: 1,
                    email: 1

                }
            }
    
    ])

    // checking if channel does no exist
    if(!channel?.length){
        throw new ApiError(404, "Channel not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "Channel found successfully"))

    // hmey watch history nikalney me nested lookup use krna prega 
    // watch history ki array me video ids hngi ussey hm video sey
    // documents nikal lengey ab un documents ka owner hm nikalengey
    // user waley table sey lookup nested kr k 


})

const getWatchHistory = asyncHandler( async(req,res) => {
   
   
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        { // idhr watchhistory me sub/nested pipeline lgayengey
            // taa k owners access kr sken
            $lookup:{
            from: "videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchHistory",
            pipeline: [ //owners ka hmey sara data nhi chahye tou isliye 
                        // ek aur nested pipeline me project use kr k required ley rhey hn
                    {
                    $lookup: {
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner,",
                        pipeline: [
                            {
                            $project: {
                                fullName: 1,
                                username: 1,
                                avatar: 1
                            }
                        }
                        ]
                    }
                    }, // ab ye neechey wali pipeline optional hai
                    //  ye srf frontend ki sahulat k liye hai k usko 
                    // loop laga k at first index p data nikalney k bjaye
                    // direct mil jaye
                    {
                        // hmara data opar owner me save hau wa hai
                        // pr yaha bhi hmney field add me dbara owner
                        //  lelia taa k field overwrite hjaye
                        $addFields: {
                            owner: {
                                $first: "$owner" // field me sey nikalney k liye $ with owner
                            }
                        }
                    }
            ]
            }
        }
    ])

    return res.status(200)
    .json(                    // idhr poora user bhi bhej sktey they pr jo FE dev usmey sey watchhistory nikalleta, pr jb watch history mangi h srf to [0]
        new ApiResponse(200, user[0].watchHistory, "Watch history found successfully")
    )

})

  export { registerUser,
        loginUser, 
        logoutUser, 
        refreshAccessToken, 
        changeCurrentPassword, 
        getCurrentUser, 
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage,
        getUserChannelProfile,
        getWatchHistory
}