const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const examSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    lesson: {
      type: Schema.Types.ObjectId,
      ref: 'lesson',
      required: true,
    },
    scores: {
      type: Number,
      default: 0,
    },
    maxScores: {
      type: Number,
      default: 0,
    },
    answered: [
      {
        _id: {
          type: Schema.Types.ObjectId,
          ref: 'quiz',
        },
        question: {
          type: String,
          required: true,
        },
        answers: [
          {
            _id: {
              type: String,
            },
            key: {
              type: String,
            },
            value: {
              type: String,
            },
            isCorrect: {
              type: Boolean,
            },
            isChosen: {
              type: Boolean,
            }
          }
        ]
      }
    ],
  },
  {
    timestamps: true,
  }
);

const ExamModel = mongoose.model('exam', examSchema, 'exams');

module.exports = ExamModel;

