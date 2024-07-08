const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
    conversation: {
        type: Schema.Types.ObjectId,
        ref: 'conversation',
        required: true
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    type: {
        type: String,
        enum: ['text', 'image'],
        default: 'text'
    },
    text: {
        type: String,
        required: true
    },
    seen: {
        type: Boolean,
        default: false
    },
    seenAt: {
        type: Date
    }
},
    {
        timestamps: true
    }
);

const MessageModel = mongoose.model('message', messageSchema, 'messages');

module.exports = MessageModel;
