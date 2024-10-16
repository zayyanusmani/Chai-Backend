import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import path from "path"
import dotenv from "dotenv"
dotenv.config()

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null
        //upload the file to cloudinary
        const response = await cloudinary.uploader.upload
        (localFilePath, {
            resource_type: "auto",
        })
        //file has been uploaded successfully
        // console.log("File is uploaded on Cloudinary",response.url);

        // issey agar file upload hjayegi tou bhi remove hjayegi 
        // localstorage sey aur error agaya agar tou bhi 
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error){
        fs.unlinkSync(localFilePath) // remove the locally saved
        // temporary file as the upload opaeration got failed
        return null;
    }
}



export {uploadOnCloudinary}

