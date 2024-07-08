const BlogModel = require('../models/blog.model')

const fetchBlogs = async (req, res, next) => {
    try {
        var result = await BlogModel.find({ title: { $regex: req.query.title || '', $options: 'i' }})
        return res.status(200).json({ message: 'ok', result })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message })
    }
}

const createBlog = async (req, res, next) => {
    try {
        var result = await BlogModel.create({ ...req.body })
        return res.status(200).json({ message: 'ok', result })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message })
    }
}

const deleteBlog = async (req, res, next) => {
    try {
        const result = await BlogModel.deleteOne({ _id: req.params.id })
        res.status(200).json({ message: 'update ok', result })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message })
    }
}


module.exports = {
    fetchBlogs,
    createBlog,
    deleteBlog,
}