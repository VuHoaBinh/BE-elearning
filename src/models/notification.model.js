const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationModel = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    data: {
        type: Object
    }
},
    {
        timestamps: true
    }
);


const NotificationModel = mongoose.model('notification', notificationModel, 'notifications');

module.exports = NotificationModel;
