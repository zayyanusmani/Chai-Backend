import mongoose, {Schema} from "mongoose";

const videoSchema = new Schema(
    {
        videoFile:{
            type: String, // cloudinary url
            required: true
        },
        thumbnail: {
            type: String, // cloudinary url
            required: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        duration: {
            type: Number, // duration cloud sey ayega calculate ho k
            required: true
        },
        views: {
            type: Number,
            default: 0
        },
        isPublished:{
            type: Boolean,
            default: true
        },
        // likes: {
        //     type: Number,
        //     default: 0
        // },
        // dislikes: {
        //     type: Number,
        //     default: 0
        // },        
        // createdAt: {
        //     type: Date,
        //     default: Date.now
        // },
        // updatedAt: {
        //     type: Date,
        //     default: Date.now
        // },        
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        // category: {
        //     type: Schema.Types.ObjectId,
        //     ref: "Category"
        // }
    },
    {
        timestamps: true
    }
)    

export const Video = mongoose.model("Video", videoSchema)