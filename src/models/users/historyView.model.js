const mongoose = require('mongoose');
const Schema = mongoose.Schema

const historyViewSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'user',
    },
    historyViews: {
        type: [Schema.Types.ObjectId],
        validate: [arrayLimit, '{PATH} exceeds the limit of 10'],
        default: [],
    }
})

function arrayLimit(val) {
    return val.length = 10
}

const HistoryViewModel = mongoose.model('historyView', historyViewSchema, 'historyViews');
module.exports = HistoryViewModel