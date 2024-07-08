const multer = require('multer')

const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    let extension = file.originalname.substring(
      file.originalname.lastIndexOf('.'),
      file.originalname.length
    )
    cb(null, file.fieldname + '-' + Date.now() + '.' + extension)
  },
})

const dontStorageUpload = multer({ storage: storage })

module.exports = { dontStorageUpload }
