const NotificationModel = require('../models/notification.model');


module.exports = {
    createNotification: async (userId, { title, content, data }) => {
        try {
            // create notification
            const notification = await NotificationModel.create({ user: userId, title, content, data });

            // get socketIds of user
            const socketIds = await _redis.SMEMBERS(JSON.parse(JSON.stringify(userId)))

            // emit notification to user
            socketIds.forEach(socketId => {
                _io.to(socketId).emit('push-notification', notification);
            })

            return notification;
        } catch (error) {
            console.log(error);
            throw error;
        }
    },
}
