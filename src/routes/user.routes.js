import { Router } from "express";
import { getUserChannelProfile, loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { refreshAccessToken } from "../controllers/user.controller.js";

const router = Router()

// This route handles a POST request to the /register endpoint. 
// It allows file uploads for two fields—avatar and coverImage—with a 
// maximum of one file each. Once the files are uploaded, 
// the registerUser controller function is executed.

router.route("/register").post(
    upload.fields([
        { 
            name: "avatar",
            maxCount: 1 },
        { 
            name: "coverImage", 
            maxCount: 1 
        }
    ]),
    registerUser
);

router.route("/login").post(loginUser)


// secured routes     // verifyJWT un routes p bhej hey hn jin k liye users ka login hna zaruri h
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails) // idhr post nhi patch rkhengey wrna sari details update hjayengi

// idhr phley verifyJWT ka middleware ayega phr multer ka ayega q k yha file bhi reeive ho rhi hgi
// ye upload directly nhi hga, multiple methods sey arrays wghera, hmey chahye ek file. isi liye whan files nhi file tha
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/coverImage").patch(verifyJWT, upload.single("coverImage"),updateUserCoverImage)

// params lkhney k liye
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
router.route("/history").get(verifyJWT, getUserHistory)

export default router;