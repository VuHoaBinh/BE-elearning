const mongoose = require('mongoose');
const Schema = mongoose.Schema

const historySearchSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'user',
    },
    historySearchs: {
        type: [String],
        validate: [arrayLimit, '{PATH} exceeds the limit of 10'],
        default: []
    }
})

function arrayLimit(val) {
    return val.length = 10
}

const HistorySearchModel = mongoose.model('historySearch', historySearchSchema, 'historySearchs');
module.exports = HistorySearchModel