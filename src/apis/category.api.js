var express = require('express');
var categoryApis = express.Router();
const categoryController = require('../controllers/category.controller');
const passport = require('../middlewares/passport.middleware');

// api: tạo danh mục 
categoryApis.post('/', passport.jwtAuthentication, categoryController.postCategory)

// api: xem danh mục 
categoryApis.get('/', categoryController.getCategories)

// api: xem chi tiết danh mục
categoryApis.get('/:slug', categoryController.getCategory)

// api: cập nhật danh mục bằng slug
categoryApis.put('/:slug', passport.jwtAuthentication, passport.isAdmin, categoryController.putCategory)

// api: xoá danh mục bằng slug
categoryApis.delete('/:slug', passport.jwtAuthentication, passport.isAdmin, categoryController.deleteCategory)

// api: xoá nhiều danh mục
categoryApis.delete('/', passport.jwtAuthentication, passport.isAdmin, categoryController.deleteManyCategory)


module.exports = categoryApis