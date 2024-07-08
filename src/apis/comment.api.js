var express = require('express');
var commentApis = express.Router();
const passport = require('../middlewares/passport.middleware');
const commentController = require('../controllers/comment.controller');

commentApis.get('/', commentController.getComments)
commentApis.post('/', passport.jwtAuthentication, commentController.createComment)
commentApis.put('/:id', passport.jwtAuthentication, commentController.updateComment)
commentApis.delete('/:id', passport.jwtAuthentication, commentController.deleteComment)

module.exports = commentApis