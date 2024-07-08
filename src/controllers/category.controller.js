
const CategoryModel = require('../models/courses/category.model');
const CourseModel = require('../models/courses/course.model')
var fs = require('fs');

// fn: tạo category
const postCategory = async (req, res, next) => {
    try {
        const { account } = req
        if (account.role == 'admin') {
            req.body.publish = true
            req.body.isPending = false
        }
        await CategoryModel.create(req.body)
        return res.status(201).json({ message: 'ok' })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error })
    }
}

// fn: lấy category
const getCategories = async (req, res, next) => {
    try {
        const { name, publish = 'true', limit, page, isPending, used } = req.query
        let aQuery = [
            {
                $match: {
                    ...(name && { $text: { $search: name }, publish: publish == 'true' }),
                    ...(!name && { publish: publish == 'true' }),
                    ...(isPending && { isPending: isPending == 'true' }),
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: '_id',
                    foreignField: 'category',
                    as: 'used'
                }
            },
            (used && {
                $match: {
                    used: used == 'true' ? { $ne: [] } : { $eq: [] }
                },
            }),
            (name && {
                $sort: {
                    score: { '$meta': 'textScore' }
                }
            }),
            {
                $project: {
                    name: 1,
                    slug: 1,
                    publish: 1,
                    isPending: 1,
                    used: {
                        $cond: {
                            if: {
                                $eq: [{ $size: '$used' }, 0]
                            },
                            then: false,
                            else: true
                        }
                    }
                }
            }
        ]

        aCountQuery = aQuery.filter(item => item != undefined)
        aCountQuery.push({ $count: 'total' })
        aQuery = aQuery.filter(item => item != undefined)

        if (page && limit) {
            const nskip = (parseInt(page) - 1) * parseInt(limit)
            aQuery.push({ $skip: nskip }, { $limit: parseInt(limit) })
        }

        const totalCount = await CategoryModel.aggregate(aCountQuery)
        const total = totalCount[0]?.total || 0

        const categories = await CategoryModel.aggregate(aQuery)
        return res.status(200).json({ message: 'ok', total, categories })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error })
    }
}
// fn: lấy category
const getCategory = async (req, res, next) => {
    try {
        const { slug } = req.params

        const category = await CategoryModel.findOne({ slug })
        return res.status(200).json({ message: 'ok', category })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error })
    }
}


// fn: cập nhật category
const putCategory = async (req, res, next) => {
    try {
        const { slug } = req.params

        const newCategory = req.body
        await CategoryModel.updateOne({ slug: slug }, newCategory)
        return res.status(200).json({ message: 'ok' })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error })
    }
}

// fn: xoá category
const deleteCategory = async (req, res, next) => {
    try {
        const { slug } = req.params
        const { account } = req
        if (account.role !== 'admin') {
            return res.status(401).json({ message: 'Not permitted' })
        }
        const category = await CategoryModel.findOne({ slug })
        const course = await CourseModel.findOne({ category })
        if (course) {
            return res.status(400).json({ message: 'không được xoá' })
        }
        await CategoryModel.deleteOne({ slug: slug })
        return res.status(200).json({ message: 'ok' })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error })
    }
}

// fn: xoá category
const deleteManyCategory = async (req, res, next) => {
    try {
        const { slugs } = req.body
        const { account, user } = req
        let logs = ''
        if (account.role !== 'admin') {
            return res.status(401).json({ message: 'Not permitted' })
        }

        for (let i = 0; i < slugs.length; i++) {
            const slug = slugs[i];
            const category = await CategoryModel.findOne({ slug })
            if (category) {
                console.log('có cate', category.name);
                const course = await CourseModel.findOne({ category })
                if (course) {
                    console.log('cos coursee', course.name);
                    logs += `category ${slug} không thể xoá \n`
                } else {
                    await CategoryModel.deleteOne({ slug })
                }
            }
        }

        if (logs != '') {
            let file = Date.now()
            fs.appendFileSync(`./src/public/logs/${file}.txt`, logs);
            return res.status(400).json({ message: 'có lỗi', urlLogs: `/logs/${file}.txt` })
        }

        return res.status(200).json({ message: 'delete ok' })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error })
    }
}


module.exports = {
    postCategory,
    getCategories,
    getCategory,
    putCategory,
    deleteCategory,
    deleteManyCategory,
}