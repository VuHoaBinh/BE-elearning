const mongoose = require('mongoose')
const Schema = mongoose.Schema

const myCourseSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'user',
    },
    course: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'course',
    },
    progress: {
      type: [Object],
      lessonId: {
        type: Schema.Types.ObjectId,
        ref: 'lesson',
      },
      timeline: {
        type: Number,
        default: 0,
      },
      complete: { type: Boolean, default: false },
    },
    // bài giảng mà user xem lần gần nhất
    lastView: {
      type: String,
      default: null,
    },
<<<<<<< HEAD
    progressPaid: {
      type: [Object],
      datePaid: {
        type: Date,
        default: Date.now,
      },
      amount: {
        type: Number,
        default: 0,
      },
=======
    isPaid: {
      type: Boolean,
      default: false,
>>>>>>> 1fd8259f43ec7cf4f04b0dbe5db9559277f79dda
    },
  },
  { timestamps: true }
)

const MyCourseModel = mongoose.model('myCourse', myCourseSchema, 'myCourses')
module.exports = MyCourseModel
