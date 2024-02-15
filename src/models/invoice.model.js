const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const invoiceSchema = new Schema({
    _id: {
        type: String,
        unique: true,
        required: true,
    },
    transactionId: {
        type: String,
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    totalDiscount: {
        type: Number,
        required: true,
    },
    paymentMethod: {
        type: String,
        required: true,
        default: 'VNpay'
    },
    paymentPrice: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['Unpaid', 'Paid', 'Refund', 'Cancel'],
        default: 'Unpaid',
    }
},
    {
        timestamps: true
    }
);

const InvoiceModel = mongoose.model('invoice', invoiceSchema, 'invoices');

module.exports = InvoiceModel;
