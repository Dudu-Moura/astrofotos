import express, { type Express, type Request, type Response} from 'express'
import photoRouter from './routes/photo.routes.js'


const app: Express = express();
const port = 3000

app.use(express.json());
app.use(express.static('public'));

app.get('/health', (_: Request, res: Response) => {
    res.send({ status: 'ok' });
})

app.use('/photo', photoRouter);


app.listen(port);