const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blogSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    purpose: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
},
    {
        timestamps: true
    }
);

const BlogModel = mongoose.model('blog', blogSchema, 'blogs');

module.exports = BlogModel;
