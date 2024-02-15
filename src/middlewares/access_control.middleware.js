const MyCourseModel = require('../models/users/myCourse.model');
const ac = require('../configs/role.config');


const grantAccess = function (action, resource) {
    return async (req, res, next) => {
        try {
            const account = req.account
            const permission = ac.can(account.role)[action](resource)
            if (!permission.granted) {
                return res.status(401).json({ message: 'Unauthorized' })
            }
            next()
        } catch (error) {
            next(error)
        }
    }
}




module.exports = {
    grantAccess,
}
