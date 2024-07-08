const mongoose = require('mongoose');
var slug = require('mongoose-slug-updater');
mongoose.plugin(slug);
const Schema = mongoose.Schema;

const categorySchema = new Schema({
    name: {
        type: String,
        trim: true,
        required: true
    },
    slug: {
        type: String,
        slug: 'name',
        unique: true,
        slugPaddingSize: 2,
    },
    publish: {
        type: Boolean,
        default: false
    },
    isPending: {
        type: Boolean,
        default: true
    }
});

categorySchema.index({ name: 'text', slug: 'text' })

const CategoryModel = mongoose.model('category', categorySchema, 'categorys');

module.exports = CategoryModel;
