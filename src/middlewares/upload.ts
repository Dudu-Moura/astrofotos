import multer from 'multer';

export const upload = multer({ dest: '.uploads/', fileFilter: (_, file, cb) => {
    if(file.mimetype.substring(0,5) !== 'image'){
        cb(new Error('File type not accepted'));
    }
    else{
        cb(null, true);
    }
} })
