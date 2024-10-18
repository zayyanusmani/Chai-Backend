import mongoose, {Schema} from "mongoose";


// channel bhi ek user hai aur subscriber bhi user hai
const subscriptionSchema = new Schema({
    Subscriber: {
        type: Schema.Types.ObjectId, //One who is subscribing
        ref: "User",
    },
    channel: {
        type: Schema.Types.ObjectId, // one to whom 'subscriber' is subscribing
        ref: "User"

    }
},{timestamps: true})

export const Subscription = mongoose.model("Subscription", subscriptionSchema)