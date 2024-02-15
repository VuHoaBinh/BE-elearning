const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const rateSchema = new Schema({
    course: {
        type: Schema.Types.ObjectId,
        ref: 'course',
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    rate: {
        type: Number,
        enum: [1, 2, 3, 4, 5],
        required: true,
        default: 5
    },
    content: {
        type: String,
        default: 'Good',
    }
},
    {
        timestamps: true
    }
);


const RateModel = mongoose.model('rate', rateSchema, 'rates');

module.exports = RateModel;
