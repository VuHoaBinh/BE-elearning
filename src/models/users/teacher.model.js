const mongoose = require('mongoose');
const Schema = mongoose.Schema

const teacherSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'user',
    },
    payments: {
        accountNumber: { type: String, default: '' },
        cardNumber: { type: String, default: '' },
        name: { type: String, default: '' },
        bankName: { type: String, default: '' },
    },
    description: {
        type: String,
        default: ''
    },
    isVerified: {
        type: Boolean,
        default: false
    }
})



const TeacherModel = mongoose.model('teacher', teacherSchema, 'teachers');
module.exports = TeacherModel