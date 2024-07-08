const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema(
  {
    account: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'account',
    },
    fullName: {
      type: String,
      trim: true,
      required: true,
    },
    birthday: {
      type: String,
      default: null,
    },
    gender: {
      type: String,
    },
    phone: {
      type: String,
      default: null,
    },
    avatar: {
      type: String,
      default:
        'https://res.cloudinary.com/dhbcvnavp/image/upload/v1707009592/e5omssdkjsosuhoauu5x.png',
    },
  },
  {
    timestamps: true,
  }
)

const UserModel = mongoose.model('user', userSchema, 'users')
module.exports = UserModel
