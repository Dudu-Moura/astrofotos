import express, { type Express, type Request, type Response} from 'express'
import multer from 'multer';
import fs from 'node:fs' 

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
});

app.get('/photo', (req: Request, res: Response) => {
    const photo = fs.readFileSync('.uploads/9236b836b0fc0e431f561987a18e9d59');
    res.type(`jpeg`)
    res.send(photo);
})


app.listen(port);