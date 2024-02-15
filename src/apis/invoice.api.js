var express = require('express');
var invoiceApis = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const passport = require('../middlewares/passport.middleware');
const accessControl = require('../middlewares/access_control.middleware')


// api: lấy danh sách hoá đơn và phân trang
invoiceApis.get('/', passport.jwtAuthentication, passport.isAdmin, invoiceController.getInvoices)

// api: lấy thông tin chi tiết hoá đơn
invoiceApis.get('/:id', invoiceController.getDetailInvoice)

// api: cập nhật status hoá đơn
invoiceApis.put('/:id', passport.jwtAuthentication, passport.isAdmin, invoiceController.putInvoice)



module.exports = invoiceApis