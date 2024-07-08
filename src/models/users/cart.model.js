const mongoose = require('mongoose');
const Schema = mongoose.Schema

const cartSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'user',
    },
    course: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'course',
    },
    coupon: {
        type: String,
        default: null
    },
    wishlist: {
        type: Boolean,
        default: false
    }
})

const CartModel = mongoose.model('cart', cartSchema, 'carts');
module.exports = CartModel