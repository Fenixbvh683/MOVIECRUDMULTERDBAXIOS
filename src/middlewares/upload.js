const multer = require('multer');
const path = require('path');
const {v4: uuidv4} = require('uuid');

const storage = multer.diskStorage({
    destination : function (req,file,callback) {
        callback(null, 'public/img')
    },
    filename : function (req,file,callback){
        callback(null, `${uuidv4()}${path.extname(file.originalname)}`)
    }
})

const uploadOneImage = multer ({
    storage
})

module.exports = {
    uploadOneImage
}