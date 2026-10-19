import mongoose, {Schema} from 'mongoose'
import { User } from './user.model'

const subscriptionSchema = new Schema({
        subscriber: {
            type: Schema.Types.ObjectId,
            ref: User
        },
        channel: {
            type: Schema.Types.ObjectId,
            ref: User
        },
        
    },
    {timestamps: true}
)

export const Subscription = mongoose.model( "Subscription", subscriptionSchema )

//* In database "Subscription" will be stored as "subscriptions"
//* it is converted into lowerCase and its plural form