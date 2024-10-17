import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
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


// secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

export default router;