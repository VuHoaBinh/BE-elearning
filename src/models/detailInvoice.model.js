const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const detailInvoiceSchema = new Schema({
    invoice: {
        type: String,
        ref: 'invoice',
        required: true,
    },
    courseId: { type: Schema.Types.ObjectId, ref: 'course', required: true },
    courseSlug: { type: String },
    courseName: { type: String, required: true },
    courseThumbnail: { type: String, default: 'https://res.cloudinary.com/dtbazi1zt/image/upload/v1655482821/thumbnail/62ac78a2fc912b78554ddbe6.png', required: true },
    courseCurrentPrice: { type: Number, required: true },
    courseAuthor: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    couponCode: {
        type: String,
        default: ''
    },
    amount: { type: Number, required: true },
    discount: { type: Number, required: true },
    status: { type: String, default: '' },
    payForAuthor: {
        type: Boolean,
        default: false
    }
},
    {
        timestamps: true
    }
);

const DetailInvoiceModel = mongoose.model('detailInvoice', detailInvoiceSchema, 'detailInvoices');

module.exports = DetailInvoiceModel;
