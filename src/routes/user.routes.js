import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

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

export default router;