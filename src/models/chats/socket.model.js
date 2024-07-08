const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const socketSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    socketIds: {
        type: [String],
    }
});

const SocketModel = mongoose.model('socket', socketSchema, 'sockets');

module.exports = SocketModel;
