import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true            
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true       
        },
        avatar: {
            type: String, // cloudinary string
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        refreshToken: {
            type: String
        }
    },
    {
        timestamps: true
    }
)

userSchema.pre("save", async function (next) {
    //ab hmey condition lgani hai k ye srf tb hi next krey jb 
    // password modify ho. hr save p encrypt na krta rhey
    if(!this.isModified("password")){
        return next();
    }

    this.password = bcrypt.hash(this.password,10) // 10 is the number of rounds of encryption algorithm
    next();
}) 

//Following to check if the password is correct

// userSchema me methods htey hn neechey jesey
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}
        // idhr "save" ka matlab h data jb bhi save ho
        // ussy phley encrypt krwana h pwd

        //isko async kia hai q k ismey time lgta hai

        // ismy next ka flag use kia ha taak btaye k bhai hgya agey barho jab hjaye tou

userSchema.methods.generateAccessToken = async function(){

    return jwt.sign({id: this._id}, process.env.JWT_SECRET, {
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName, 
        expiresIn: process.env.JWT_EXPIRES_IN
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
) 
}

// ismey async nhi lgaya h q k ye jaldi hjata hai. laga bhi sktey hn masla nhi
userSchema.methods.generateRefreshToken = function(){

    return jwt.sign({id: this._id}, process.env.JWT_SECRET, {
        _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
) 
}

export const User = mongoose.model("User", userSchema)