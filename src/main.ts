import express, { type Express, type Request, type Response} from 'express'
import multer from 'multer';
import fs from 'node:fs' 
import { instance } from './db/instance.db.js';
import { photos } from './db/schema.js';
import { eq } from 'drizzle-orm';
import exifr from 'exifr'

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


type ImageStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

app.get('/health', (_: Request, res: Response) => {
    res.send({ status: 'ok, testing dev' });
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
    const photo = fs.readFileSync('.uploads/');
    res.type(`jpeg`) 
    res.send(photo);
})

app.get('/photo/:id', async (req: Request, res: Response) => {

    const photoDB = await instance.database
    .select( { fileName: photos.fileName, mimeType: photos.mimeType } )
    .from(photos)
    .where(eq(photos.fileName, String(req.params.id)));

    console.log(photoDB[0]?.fileName);
    const output = await exifr.parse(`.uploads/${photoDB[0]?.fileName}`);
    console.log(output);

    const photo = fs.readFileSync(`.uploads/${photoDB[0]?.fileName}`);
    try{
        res.type(photoDB[0]!.mimeType).send(photo);
    } catch(err){
        if(err instanceof Error){
            console.error(err.message);
        }
        console.error(err);
    };
})


app.listen(port);