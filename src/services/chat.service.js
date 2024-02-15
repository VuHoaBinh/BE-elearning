class SocketService {

    // connection
    async connection(socket) {
        // lưu user id vào redis với value là socket id
        await _redis.SADD(socket.user._id, socket.id)

        // // test log data
        // const data = await _redis.SMEMBERS(socket.user._id)
        // console.log('data ', data);

        socket.on('disconnect', () => {
            // xoá socket id trong db
            _redis.SREM(socket.user._id, socket.id)
        })
    }
}


module.exports = new SocketService()