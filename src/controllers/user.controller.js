import { asyncHandler } from "../utils/asyncHandler.js";
import{ ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser }