const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chapterSchema = new Schema({
    course: {
        type: Schema.Types.ObjectId,
        ref: 'course',
        required: true
    },
    number: {
        type: Number,
        required: true,
        min: 0,
    },
    name: {
        type: String,
        trim: true,
        required: true
    }
});

const ChapterModel = mongoose.model('chapter', chapterSchema, 'chapters');

module.exports = ChapterModel;
