const RateModel = require('../models/courses/rate.model');
const CourseModel = require('../models/courses/course.model')
const MyCourseModel = require('../models/users/myCourse.model')


// fn: tạo mới đánh giá
const postRate = async (req, res, next) => {
    try {
        var { slug, rate, content } = req.body
        const { user } = req
        content = content.replace(/href="https?:\/\/.+"/, 'href="#"')

        // thông tin khoá học
        const course = await CourseModel.findOne({ slug }).lean()
        // kiểm tra đã mua khoá học?
        const isBought = await MyCourseModel.findOne({ user: user._id, course: course._id })
        if (!isBought) return res.status(403).json({ message: 'Không được phép đánh giá! Chưa mua khoá học này.' })

        // tạo/ cập nhật rate
        await RateModel.findOneAndUpdate(
            { author: user._id, course: course._id },
            { rate: parseInt(rate), content },
            { upsert: true }
        )
        res.status(200).json({ message: 'ok' })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message })
    }
}

// fn: cập nhật đánh giá
const putRate = async (req, res, next) => {
    try {
        const { id } = req.params
        const { user } = req

        const rating = await RateModel.findById(id).lean()
        if (!rating) return res.status(400).json({ message: 'id không hợp lệ' })
        console.log(user._id, '!=', rating.author);
        if (JSON.stringify(user._id) != JSON.stringify(rating.author)) return res.status(401).json({ message: 'không được phép' })
        await RateModel.updateOne({ _id: id }, req.body)
        res.status(200).json({ message: 'update rate ok' })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message })
    }
}

module.exports = {
    postRate,
    putRate,
}