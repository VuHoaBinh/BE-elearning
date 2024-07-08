const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const codeSchema = new Schema({
    coupon: {
        type: Schema.Types.ObjectId,
        ref: 'coupon',
        required: true,
    },
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
},
    {
        timestamps: true
    }
);

const CodeModel = mongoose.model('code', codeSchema, 'codes');

module.exports = CodeModel;
