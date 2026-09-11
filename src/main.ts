import express, { type Express, type Request, type Response} from 'express'
import multer from 'multer';
import photoRouter from './routes/photo.routes.js'


const app: Express = express();
const port = 3000

const upload = multer({ dest: '.uploads/', fileFilter: (_, file, cb) => {
    if(file.mimetype.substring(0,5) !== 'image'){
        cb(new Error('File type not accepted'));
    }
    else{
        cb(null, true);
    }
} })

app.get('/health', (_: Request, res: Response) => {
    res.send({ status: 'ok' });
})

app.use('/photos', photoRouter);


app.listen(port);