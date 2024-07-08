const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const webConfigSchema = new Schema({
    numOfTopCourses: {
        type: Number,
        required: true,
        default: 15
    },
    numOfSalesOfBestSellerCourses: {
        type: Number,
        required: true,
        default: 5
    }
});

const WebConfigModel = mongoose.model('webConfig', webConfigSchema, 'webConfigs');

module.exports = WebConfigModel;
