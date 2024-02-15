var express = require('express');
var chatApis = express.Router();
const passport = require('../middlewares/passport.middleware');
const chatController = require('../controllers/chat.controller');
const { dontStorageUpload } = require('../configs/storage.config');


// api: yêu cầu / chấp nhận kết nối hội thoại bằng user id
chatApis.post('/conversation', passport.jwtAuthentication, chatController.postConversation)

// api: chấp nhận kết nối hội thoại bằng conversation id
chatApis.post('/accept-conversation', passport.jwtAuthentication, chatController.postAcceptConversation)

// api: lấy danh sách hội thoại
chatApis.get('/conversation', passport.jwtAuthentication, chatController.getConversations)

// api: gửi tin nhắn
chatApis.post('/message', passport.jwtAuthentication, dontStorageUpload.fields([{ name: 'images' }]), chatController.postMessage)

// api: lấy tin nhắn của 1 hội thoại
chatApis.get('/conversation/:conversation', passport.jwtAuthentication, chatController.getMessages)

// api: cập nhật - đã xem tin nhắn
chatApis.put('/conversation/:conversation', passport.jwtAuthentication, chatController.updateSeenMessage)

chatApis.post('/chatbot', passport.jwtAuthentication, chatController.postMessageWithBotChat)

module.exports = chatApis