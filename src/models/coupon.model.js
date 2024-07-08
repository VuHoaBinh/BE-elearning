const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const couponSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['percent', 'money'],
        require: true,
    },
    apply: {
        type: String,
        enum: ['all', 'author', 'category', 'new user'],
        default: 'author'
    },
    amount: {
        type: Number, // if type == percent,then amount <= 100 ,else it’s amount of discount
        required: true,
        min: 0,
    },
    startDate: {
        type: Date,
        required: true,
        default: new Date()
    },
    expireDate: {
        type: Date,
        require: true,
        default: new Date().setDate(new Date().getDate() + 7)
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    maxDiscount: {
        type: Number,
        default: Infinity
    },
    minPrice: {
        type: Number,
        default: 0,
        min: 0,

    },
    number: {
        type: Number,
        default: 100,
        min: 1,
    },
    // id google sheet để share code giảm giá
    sheetId: {
        type: String,
        default: null
    }
},
    {
        timestamps: true
    }
);

const CouponModel = mongoose.model('coupon', couponSchema, 'coupons');

module.exports = CouponModel;
