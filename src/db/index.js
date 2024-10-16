import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected !! DB HOST: 
        ${connectionInstance.connection.host}`); // ye isliye log kraya hai taa k dekhlen production DB me hain ya development
    } catch (error){
        console.log("MONGODB conection error ", error);
        process.exit(1)
    }
}


export default connectDB    