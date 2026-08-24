import express, { type Express, type Request, type Response} from 'express'
import multer from 'multer';

const upload = multer({ dest: '.uploads/'})
const app: Express = express();
const port = 3000


type ImageStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

app.get('/health', (req: Request, res: Response) => {
    res.send({ status: 'ok' });
})

app.post('/photo', upload.single('photo'),(req: Request, res: Response) => {
    console.log(req.file);
    res.json({ file: req.file?.filename });
})

app.listen(port);