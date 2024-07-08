const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const lessonSchema = new Schema({
    chapter: {
        type: Schema.Types.ObjectId,
        ref: 'chapter',
        required: true
    },
    // số thứ tự bài học
    number: {
        type: Number,
        required: true,
        min: 0,
    },
    // tiêu đề bài học
    title: {
        type: String,
        trim: true,
        required: true
    },
    // loại bài học : video, text hay slide show
    type: {
        type: String,
        enum: ['undefined', 'video', 'text', 'slide', 'quiz'],
        default: 'undefined'
    },
    video: {
        type: [String],
        default: null
    },
    text: {
        type: String,
        default: null
    },
    slide: {
        type: String,
        default: null
    },
    description: {
        type: String,
        default: null
    },
    saveIn: {
        type: String,
        enum: ['youtube', 'local', 'cloudinary'],
        default: 'cloudinary'
    },
    publish: {
        type: Boolean,
        default: false
    },
    // thời lượng của video (nếu có)
    duration: {
        type: String,
        default: null
    },
    // tài nguyên kèm theo
    resource: {
        type: String,
        default: null
    },
    videoInfo: {
        type: Object,
    }
});

const LessonModel = mongoose.model('lesson', lessonSchema, 'lessons');

module.exports = LessonModel;
