const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    lesson: {
        type: Schema.Types.ObjectId,
        ref: 'lesson',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    replies: {
        type: [
            {
                author: {
                    type: Schema.Types.ObjectId,
                    ref: 'user',
                    required: true
                },
                lesson: {
                    type: Schema.Types.ObjectId,
                    ref: 'lesson',
                    required: true
                },
                content: {
                    type: String,
                    required: true
                },
                createdAt: {
                    type: Date,
                    default: Date.now()
                }
            }
        ],
    },

},
    {
        timestamps: true
    }
);


const CommentModel = mongoose.model('comment', commentSchema, 'comments');

module.exports = CommentModel;
