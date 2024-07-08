const WebConfigModel = require('../models/webConfig.model')



const getWebConfig = async (req, res, next) => {
    try {
        var result = await WebConfigModel.findOne({})
        if (!result) {
            result = await WebConfigModel.create({})
        }
        res.status(200).json({ message: 'ok', result })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message })
    }
}


const putWebConfig = async (req, res, next) => {
    try {
        const data = Object.fromEntries(Object.entries(req.body).filter(([_, v]) => v != null));

        if (data.numOfTopCourses) {
            data.numOfTopCourses = parseInt(data.numOfTopCourses)
        }
        if (data.numOfSalesOfBestSellerCourses) {
            data.numOfSalesOfBestSellerCourses = parseInt(data.numOfSalesOfBestSellerCourses)
        }

        const result = await WebConfigModel.findOneAndUpdate({}, data, { new: true })
        res.status(200).json({ message: 'update ok', result })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message })
    }
}


module.exports = {
    getWebConfig,
    putWebConfig
}