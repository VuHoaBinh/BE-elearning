const DetailInvoiceModel = require('../models/detailInvoice.model');
const InvoiceModel = require('../models/invoice.model')
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId;
const helper = require('../helper')

// fn: get all invoice và phân trang
const getInvoices = async (req, res, next) => {
    try {
        const { page, limit, sort, status, transaction, user } = req.query
        let query = [
            {
                $match: { status: { $ne: 'Unpaid' } }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $project: {
                    'transactionId': 1,
                    'totalPrice': 1,
                    'totalDiscount': 1,
                    'paymentPrice': 1,
                    'status': 1,
                    'paymentMethod': 1,
                    // 'user': 1
                    'user': { '_id': 1, 'fullName': 1, 'phone': 1, 'avatar': 1 },
                    'createdAt': {
                        $dateToString: {
                            date: '$createdAt',
                            format: '%Y-%m-%dT%H:%M:%S',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                }
            },

        ]
        let countQuery = [
            {
                $match: { status: { $ne: 'Unpaid' } }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $project: {
                    'transactionId': 1,
                    'totalPrice': 1,
                    'totalDiscount': 1,
                    'paymentPrice': 1,
                    'status': 1,
                    'paymentMethod': 1,
                    // 'user': 1
                    'user': { '_id': 1, 'fullName': 1, 'phone': 1, 'avatar': 1 },
                    'createdAt': {
                        $dateToString: {
                            date: '$createdAt',
                            format: '%Y-%m-%dT%H:%M:%S',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                }
            },

        ]
        if (status) {
            query.unshift({ $match: { status: status } })
            countQuery.unshift({ $match: { status: status } })
        }
        if (transaction) {
            query.unshift({ $match: { transactionId: transaction } })
            countQuery.unshift({ $match: { transactionId: transaction } })
        }
        if (user) {
            query.unshift({ $match: { user: ObjectId(user) } })
            countQuery.unshift({ $match: { user: ObjectId(user) } })
        }
        if (limit && page) {
            query.push(
                { $skip: (parseInt(page) - 1) * parseInt(limit) },
                { $limit: parseInt(limit) },
            )
        }
        // sắp xếp và thống kê
        if (sort) {
            let [f, v] = sort.split('-')
            let sortBy = {}
            sortBy[f] = v == 'asc' || v == 1 ? 1 : -1
            query.push({ $sort: sortBy })
        }

        const invoices = await InvoiceModel.aggregate(query)
        countQuery.push({ $count: 'total' })
        const totalCount = await InvoiceModel.aggregate(countQuery)
        const total = totalCount[0]?.total || 0
        return res.status(200).json({ message: 'ok', total, invoices, page, limit })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error })
    }
}


//fn : get detail invoice
const getDetailInvoice = async (req, res, next) => {
    try {
        const CLIENT_URL = `${process.env.FRONTEND_URL}/invoice/`
        const { id } = req.params
        const invoice = await InvoiceModel.findOne({ _id: id }).populate('user', '_id fullName').lean()
        if (!invoice) {
            return res.status(404).json({ message: 'Not found' })
        }
        const detailInvoices = await DetailInvoiceModel.find({ invoice: id }).populate('courseAuthor', '_id fullName').lean()
        invoice.detailInvoices = detailInvoices
        invoice.qrcode = await helper.generateQR(CLIENT_URL + id)
        return res.status(200).json({ message: 'ok', invoice })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

//fn: cập nhật hoá đơn
const putInvoice = async (req, res, next) => {
    try {
        const { id } = req.params
        const { status } = req.body

        await InvoiceModel.updateOne({ _id: id }, { status })
        return res.status(200).json({ message: 'update ok' })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error })
    }
}


module.exports = {
    getInvoices,
    getDetailInvoice,
    putInvoice
}