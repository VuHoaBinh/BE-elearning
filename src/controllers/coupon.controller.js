const CouponModel = require('../models/coupon.model');
const helper = require('../helper');
const CodeModel = require('../models/code.model');
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId;
var fs = require('fs');
const { google } = require('googleapis');
const { GoogleSpreadsheet } = require('google-spreadsheet');


// fn: lấy danh sách mã và phân trang
const getCoupons = async (req, res, next) => {
    try {
        const { page, limit, active, title } = req.query
        const { account, user } = req

        let aQuery = [
            {
                $match: {
                    ...(active && active === 'true' && {
                        'expireDate': { $gte: new Date() }
                    }),
                    ...(active && active === 'false' && {
                        'expireDate': { $lte: new Date() }
                    }),
                    ...(title && {
                        title: new RegExp(title, 'img')
                    }),
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            {
                $unwind: '$author'
            },
            {
                $lookup: {
                    from: 'codes',
                    localField: '_id',
                    foreignField: 'coupon',
                    as: 'codes'
                }
            },
            {
                $project: {
                    _id: 1,
                    'title': 1,
                    'type': 1,
                    'apply': 1,
                    'amount': 1,
                    'startDate': {
                        $dateToString: {
                            date: '$startDate',
                            format: '%Y-%m-%dT%H:%M:%S',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                    'expireDate': {
                        $dateToString: {
                            date: '$expireDate',
                            format: '%Y-%m-%dT%H:%M:%S',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                    'maxDiscount': {
                        $cond: {
                            if: { $eq: [Infinity, '$maxDiscount'] },
                            then: null,
                            else: '$maxDiscount'
                        }
                    },
                    'minPrice': 1,
                    'number': 1,
                    'remain': { $size: { $filter: { 'input': '$codes', 'cond': { $eq: ['$$this.isActive', true] } } } },
                    'author._id': 1,
                    'author.fullName': 1,
                }
            }
        ]

        if (account.role == 'teacher') {
            aQuery.splice(2, 0, { $match: { 'author._id': user._id } })
        }
        aQuery.push({ $count: 'total' })
        const totalCount = await CouponModel.aggregate(aQuery)
        const total = totalCount[0]?.total || 0
        aQuery.pop()
        if (page && limit) {
            aQuery.push(
                { $skip: (parseInt(page) - 1) * parseInt(limit) },
                { $limit: parseInt(limit) },
            )
        }

        const coupons = await CouponModel.aggregate(aQuery)

        let data = coupons.map(item => {
            let now = new Date()
            let expireDate = new Date(item.expireDate)
            if (expireDate > now) {
                item.isActive = true
            } else {
                item.isActive = false
            }
            return item
        })

        return res.status(200).json({ message: 'ok', total, coupons: data })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

// fn: lấy chi tiết mã
const getCoupon = async (req, res, next) => {
    try {
        const { id } = req.params
        const data = await CouponModel.aggregate([
            { $match: { _id: ObjectId(id) } },
            {
                $lookup: {
                    from: 'codes',
                    localField: '_id',
                    foreignField: 'coupon',
                    as: 'codes'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            {
                $unwind: '$author'
            },
            {
                $project: {
                    _id: 1,
                    'title': 1,
                    'type': 1,
                    'apply': 1,
                    'amount': 1,
                    'startDate': {
                        $dateToString: {
                            date: '$startDate',
                            format: '%Y-%m-%dT%H:%M:%S',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                    'expireDate': {
                        $dateToString: {
                            date: '$expireDate',
                            format: '%Y-%m-%dT%H:%M:%S',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                    'maxDiscount': {
                        $cond: {
                            if: { $eq: [Infinity, '$maxDiscount'] },
                            then: 'Không giới hạn',
                            else: '$maxDiscount'
                        }
                    },
                    'minPrice': 1,
                    'number': 1,
                    'remain': { $size: { $filter: { 'input': '$codes', 'cond': { $eq: ['$$this.isActive', true] } } } },
                    'author._id': 1,
                    'author.fullName': 1,
                    'codes.code': 1,
                    'codes.isActive': 1,
                }
            }
        ])
        if (data.length == 0) {
            return res.status(400).json({ message: 'coupon không tồn tại' })
        }
        return res.status(200).json({ message: 'ok', coupon: data[0] })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

// fn: tạo mới mã
const postCoupon = async (req, res, next) => {
    try {
        const { user, account } = req
        const { title, type, apply, amount, startDate, expireDate, maxDiscount, minPrice, number } = req.body
        req.body.author = user._id
        let data = Object.fromEntries(Object.entries(req.body).filter(([_, v]) => v != null));
        if (account.role == 'admin') {
            data.apply = 'all'
        }
        if (type == 'percent') {
            if (amount > 100 || amount <= 0) {
                return res.status(400).json({ message: 'amount phải > 0 và <= 100' })
            }
        } else if (type == 'money') {
            if (amount <= 0) {
                return res.status(400).json({ message: 'amount phải là số dương' })
            }
        }

        if (startDate && new Date(startDate) < new Date()) {
            return res.status(400).json({ message: 'startDate không hợp lệ' })
        }

        if (expireDate && new Date(expireDate) < new Date()) {
            return res.status(400).json({ message: 'expireDate không hợp lệ' })
        }

        if (maxDiscount && maxDiscount <= 0) {
            return res.status(400).json({ message: 'maxDiscount phải là số dương' })
        }

        if (minPrice && minPrice < 0) {
            return res.status(400).json({ message: 'minPrice phải là số dương' })
        }

        if (number && number <= 0) {
            return res.status(400).json({ message: 'number phải là số dương' })
        }

        const coupon = await CouponModel.create(data)
        res.status(201).json({ message: 'oke' })
        const codes = helper.generateDiscountCode(10, parseInt(number) || 100)
        for (let i = 0; i < codes.length; i++) {
            const code = codes[i];
            await CodeModel.create({
                coupon, code
            })
        }
        return
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })

    }
}

// fn: cập nhật mã
const updateCoupon = async (req, res, next) => {
    try {
        const { id } = req.params
        const { user } = req
        const newCoupon = req.body
        if (newCoupon.maxDiscount === null) {
            newCoupon.maxDiscount = Infinity
        }
        await CouponModel.updateOne({ _id: id, author: user._id }, newCoupon)
        return res.status(200).json({ message: 'update ok' })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

// fn: xoá mã
const deleteCoupon = async (req, res, next) => {
    try {
        const { id } = req.params
        const { account, user } = req
        if (account.role === 'admin') {
            await CouponModel.deleteOne({ _id: id })
        } else {
            await CouponModel.deleteOne({ _id: id, author: user._id })
        }
        await CodeModel.deleteMany({ coupon: id })
        return res.status(200).json({ message: 'delete ok' })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

// fn: xoá nhiều mã
const deleteManyCoupon = async (req, res, next) => {
    try {
        let { ids } = req.body
        const { account, user } = req
        ids = ids.map(id => ObjectId(id))
        let logs = ''
        let success = 0
        let coupons = null
        if (account.role === 'admin') {
            coupons = await CouponModel.aggregate([
                { $match: { _id: { $in: ids } } },
                {
                    $lookup: {
                        from: 'codes',
                        localField: '_id',
                        foreignField: 'coupon',
                        as: 'codes'
                    }
                },
                {
                    $project: {
                        'title': 1,
                        'number': 1,
                        'remain': { $size: { $filter: { 'input': '$codes', 'cond': { $eq: ['$$this.isActive', true] } } } },
                    }
                }
            ])
        } else {
            coupons = await CouponModel.aggregate([
                { $match: { _id: { $in: ids } } },
                { $match: { author: user._id } },
                {
                    $lookup: {
                        from: 'codes',
                        localField: '_id',
                        foreignField: 'coupon',
                        as: 'codes'
                    }
                },
                {
                    $project: {
                        'title': 1,
                        'number': 1,
                        'remain': { $size: { $filter: { 'input': '$codes', 'cond': { $eq: ['$$this.isActive', true] } } } },
                    }
                }
            ])
        }

        for (let i = 0; i < coupons.length; i++) {
            const coupon = coupons[i];
            if (coupon.number == coupon.remain) {
                await CouponModel.deleteOne({ _id: coupon._id })
                await CodeModel.deleteMany({ coupon: coupon._id })
                success++
            } else {
                logs += `id:${coupon._id}, title: ${coupon.title} mã đã có người dùng.\n`
            }
        }

        if (logs != '') {
            let file = Date.now()
            fs.appendFileSync(`./src/public/logs/${file}.txt`, logs);
            return res.status(200).json({ message: `delete ${success}/${coupons.length}`, urlLogs: `/logs/${file}.txt` })
        }

        return res.status(200).json({ message: `delete ${success}/${coupons.length}` })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

// fn: tạo url login with google
const postLoginGoogle = (req, res, next) => {
    try {
        const host = req.get('host')
        let uri = `http://${host}/api/coupons/google/callback`
        if (host != 'localhost:3000') {
            uri = `https://${host}/api/coupons/google/callback`
        }
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            uri
        );
        const scopes = [
            'https://www.googleapis.com/auth/spreadsheets',
        ];
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
        });

        // res.writeHead(302, {
        //     'Location': url
        // });
        res.status(200).json({ location: url })
        return res.end();
    } catch (error) {
        console.log(error);
        next(error)
    }
}

//fn : google callback
const getGoogleCallback = async (req, res, next) => {
    try {
        const host = req.get('host')
        let uri = `http://${host}/api/coupons/google/callback`
        if (host != 'localhost:3000') {
            uri = `https://${host}/api/coupons/google/callback`
        }
        const { code } = req.query
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            uri
        );
        //lấy access_token
        const { tokens } = await oauth2Client.getToken(code)
        req.tokens = tokens
        return res.status(200).json({ message: 'oke', tokens })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

// fn: tạo sheet và ghi data
const postCreateGoogleSheet = async (req, res) => {
    try {
        const { access_token, refresh_token, expiry_date, id } = req.body
        const host = req.get('host')
        let uri = `http://${host}/api/coupons/google/callback`
        if (host != 'localhost:3000') {
            uri = `https://${host}/api/coupons/google/callback`
        }
        // xác thực oauth2 cho google-spreadsheet
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            uri
        );
        oauth2Client.credentials.access_token = access_token;
        oauth2Client.credentials.refresh_token = 'refresh_token';
        oauth2Client.credentials.expiry_date = expiry_date;

        // lấy mã giảm giá
        const coupon = await CouponModel.aggregate([
            { $match: { _id: ObjectId(id) } },
            {
                $lookup: {
                    from: 'codes',
                    localField: '_id',
                    foreignField: 'coupon',
                    as: 'codes'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            {
                $unwind: '$author'
            },
            {
                $project: {
                    title: 1,
                    type: 1,
                    apply: 1,
                    amount: 1,
                    number: 1,
                    startDate: {
                        $dateToString: {
                            date: '$startDate',
                            format: '%H:%M:%S %d-%m-%Y',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                    expireDate: {
                        $dateToString: {
                            date: '$expireDate',
                            format: '%H:%M:%S %d-%m-%Y',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                    maxDiscount: 1,
                    minPrice: 1,
                    author: 1,
                    codes: { code: 1, isActive: 1 },
                    sheetId: 1,
                }
            }
        ])

        let doc
        // trường hợp: user 1 đã exports sheet rồi => tồn tại sheetId.
        // nếu user 2 exports lại => k có quyền chỉnh sửa (vì sheet của user 1) => tạo sheet mới
        if (coupon[0].sheetId) {
            try {
                // lấy id sheet
                doc = new GoogleSpreadsheet(coupon[0].sheetId);
                // xác thực
                doc.useOAuth2Client(oauth2Client);
                await doc.loadInfo()
            } catch (error) { // có thể do login 1 acc khác nên đã có sheet id => k có quyền sửa => tạo 1 file mới
                // tạo sheet mới
                doc = new GoogleSpreadsheet();
                // xác thực
                doc.useOAuth2Client(oauth2Client);
                // set thông tin sheet
                await doc.createNewSpreadsheetDocument({ title: `${coupon[0].number} Mã ${coupon[0].title}` });
                await CouponModel.updateOne({ _id: id }, { sheetId: doc.spreadsheetId })
                await doc.loadInfo()
            }
        } else {
            // tạo sheet mới
            doc = new GoogleSpreadsheet();
            // xác thực
            doc.useOAuth2Client(oauth2Client);
            // set thông tin sheet
            await doc.createNewSpreadsheetDocument({ title: `${coupon[0].number} Mã ${coupon[0].title}` });
            await CouponModel.updateOne({ _id: id }, { sheetId: doc.spreadsheetId })
            await doc.loadInfo()
        }

        await doc.updateProperties({ title: `${coupon[0].number} Mã ${coupon[0].title}` });
        // lấy sheet 1
        const sheet = doc.sheetsByIndex[0]
        // clear data cũ
        await sheet.clearRows()

        // #region format và ghi data
        await sheet.mergeCells({
            'startRowIndex': 0,
            'endRowIndex': 1,
            'startColumnIndex': 0,
            'endColumnIndex': 12
        })
        await sheet.mergeCells({
            'startRowIndex': 1,
            'endRowIndex': 2,
            'startColumnIndex': 0,
            'endColumnIndex': 7
        })
        await sheet.mergeCells({
            'startRowIndex': 2,
            'endRowIndex': 3,
            'startColumnIndex': 0,
            'endColumnIndex': 7
        })
        await sheet.mergeCells({
            'startRowIndex': 3,
            'endRowIndex': 4,
            'startColumnIndex': 0,
            'endColumnIndex': 7
        })

        await sheet.setHeaderRow([`${coupon[0].number} MÃ ${coupon[0].title.toUpperCase()} (Updated at: ${new Date().toLocaleString()})`], 1);
        await sheet.setHeaderRow([`Giảm ${coupon[0].amount}${coupon[0].type == 'money' ? ' VNĐ' : '%'}. Áp dụng toàn bộ khoá học${coupon[0].apply == 'all' ? ' trên hệ thống' : ` của tác giả ${coupon[0].author.fullName}`}.`], 2);
        await sheet.setHeaderRow([`Hiệu lực từ: ${coupon[0].startDate} đến ${coupon[0].expireDate})`], 3);
        await sheet.setHeaderRow([`Áp dụng ${coupon[0].maxDiscount == Infinity ? '' : `giảm giá tối đa ${coupon[0].maxDiscount} vnđ`} cho khoá học từ ${coupon[0].minPrice} vnđ`], 4);
        await sheet.setHeaderRow(['code', 'isActive'], 5);

        // load data sẵn
        await sheet.loadCells({ // GridRange object
            startRowIndex: 0, endRowIndex: coupon[0].number + 5, startColumnIndex: 0, endColumnIndex: 4
        });
        var cellA1 = sheet.getCell(0, 0)
        cellA1.textFormat = {
            'fontSize': 16,
            'bold': true
        }
        cellA1.padding = {
            'top': 5,
            'right': 5,
            'bottom': 5,
            'left': 5
        }
        for (let i = 1; i < 4; i++) {
            let cellA1 = sheet.getCell(i, 0)
            cellA1.textFormat = {
                'fontSize': 14,
            }
            cellA1.padding = {
                'top': 5,
                'right': 5,
                'bottom': 5,
                'left': 5
            }
        }
        await sheet.addRows(coupon[0].codes);

        //#endregion

        return res.status(200).json({ message: 'ok', link: 'https://docs.google.com/spreadsheets/d/' + doc.spreadsheetId + '/edit?usp=sharing' })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}


module.exports = {
    getCoupons,
    getCoupon,
    postCoupon,
    updateCoupon,
    deleteCoupon,
    deleteManyCoupon,
    postLoginGoogle,
    getGoogleCallback,
    postCreateGoogleSheet,
}