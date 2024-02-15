const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const answerSchema = new Schema({
    key: {
        type: String,
        required: true
    },
    value: {
        type: String,
        required: true
    },
    isCorrect: {
        type: Boolean,
        default: false
    }
});

const quizSchema = new Schema({
    lesson: {
        type: Schema.Types.ObjectId,
        ref: 'lesson',
        required: true
    },
    question: {
        type: String,
        required: true
    },
    answers: [answerSchema],
});

const QuizModel = mongoose.model('quiz', quizSchema, 'quizs');

module.exports = QuizModel;
