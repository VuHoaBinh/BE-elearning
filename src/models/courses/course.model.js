const mongoose = require('mongoose')
const Schema = mongoose.Schema
var slug = require('mongoose-slug-updater')
mongoose.plugin(slug)

const courseSchema = new Schema(
  {
    slug: {
      type: String,
      slug: 'name',
      unique: true,
      slugPaddingSize: 2,
    },
    name: {
      type: String,
      trim: true,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'category',
      required: true,
    },
    thumbnail: {
      type: String,
      default:
        'https://res.cloudinary.com/dtbazi1zt/image/upload/v1655526230/thumbnail/62ac7fcf5e9692dfc35dc211.jpg',
    },
    description: {
      type: String,
      required: true,
    },
    lang: {
      type: String,
      default: 'vi',
    },
    // dành cho đối tượng nào?
    intendedLearners: {
      type: [String],
    },
    requirements: {
      type: [String],
    },
    targets: {
      type: [String],
      required: true,
    },
    level: {
      type: String,
      enum: ['all', 'beginer', 'intermediate', 'expert'],
      default: 'all',
    },
    currentPrice: {
      type: Number,
      default: 0,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      default: 0,
      required: true,
      min: 0,
    },
    saleOff: {
      type: Number,
      default: 0,
    },
    author: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'user',
    },
    sellNumber: {
      type: Number,
      default: 0,
    },
    //ex: #nodejs, #expressjs
    hashtags: {
      type: [String],
    },
    publish: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'updating', 'update denied', 'denied'],
      default: 'draft',
    },
    type: {
      type: String,
      default: null,
      enum: ['Hot', 'Bestseller', null],
    },
  },
  {
    timestamps: true,
  }
)

courseSchema.index({ name: 'text', slug: 'text' })

const CourseModel = mongoose.model('course', courseSchema, 'courses')

module.exports = CourseModel
