var express = require('express');
var blogApis = express.Router();
const blogController = require('../controllers/blog.controller');
const passport = require('../middlewares/passport.middleware');

blogApis.get('/', blogController.fetchBlogs)
blogApis.post('/', passport.jwtAuthentication, passport.isAdminOrTeacher, blogController.createBlog)
blogApis.delete('/:id', passport.jwtAuthentication, passport.isAdminOrTeacher, blogController.deleteBlog)

module.exports = blogApis