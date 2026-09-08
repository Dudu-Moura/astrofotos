import express, { type Express, type Request, type Response} from 'express'
import multer from 'multer';
import fs from 'node:fs' 
import { instance } from './db/instance.db.js';
import { photos } from './db/schema.js';



const upload = multer({ dest: '.uploads/', fileFilter: (_, file, cb) => {
    if(file.mimetype.substring(0,5) !== 'image'){
        cb(new Error('File type not accepted'));
    }
    else{
        cb(null, true);
    }
} })

const app: Express = express();
const port = 3000

type ImageStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

app.get('/health', (_: Request, res: Response) => {
    res.send({ status: 'ok' });
})

app.post('/photo', upload.single('photo'), async (req: Request, res: Response) => {
    console.log(req.file);

        try{ await instance.database
            .insert(photos)
            .values({
                originalName: req.file!.originalname,
                fileName: req.file!.filename,
                mimeType: req.file!.mimetype,
                size: req.file!.size,
                path: req.file!.path,
            });
        }
        catch(error) {
                console.error(error);
        }

        res.json({ file: req.file?.filename });
});

app.get('/photo', (_: Request, res: Response) => {
    const photo = fs.readFileSync('.uploads/3d81f7295dd39c71d0493970a3729603');
    res.type(`jpeg`)
    res.send(photo);
})


app.listen(port);