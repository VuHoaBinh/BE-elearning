const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const conversationSchema = new Schema({
    members: {
        type: [Schema.Types.ObjectId],
        ref: 'user',
        required: true
    },
    // lưu ý, không dùng được trong group chat (members.length > 2)
    pending: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    recentAt: {
        type: Date,
        default: new Date()
    }
},
    {
        timestamps: true
    }
);

const ConversationModel = mongoose.model('conversation', conversationSchema, 'conversations');

module.exports = ConversationModel;
