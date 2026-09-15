import type { Request, Response, NextFunction } from "express";
import type { PhotoService } from "../service/photo.service.js";
import fs, { readFile } from 'node:fs/promises';
import exifr from 'exifr'
import sharp from 'sharp'
import path from 'node:path'


export class PhotoController {
    constructor(private photoService: PhotoService){};

    getPhoto = async (_: Request, res: Response) => {
        const photos = await this.photoService.getPhotos();

        const metadatas = await Promise.all(photos.map(p => exifr.parse(`${p.path}`)));

        const readFiles = await Promise.all(photos.map(p => readFile(p.path)));
        res.status(200).json({
            photos: readFiles.map( rF => rF.toString('base64')),
            metadatas: metadatas,
            mimeType: photos.map(p => p.mimeType)
        })

    }

    getPhotoById = async (req: Request, res: Response) => {
        const id = String(req.params.id);
        const photo = await this.photoService.getPhotoById(id);

        const metadata = await exifr.parse(`.uploads/${photo.fileName}`);
        console.log(metadata);

        const readPhoto = await fs.readFile(photo.path);

        res.status(200).json({
            photo: readPhoto.toString('base64'), 
            data: metadata,
            mimeType: photo.mimeType
        });
    }

    createPhoto = async (req: Request, res: Response) => {
        const file = req.file!;
        const photo = {
            path: file.path,
            originalName: file.originalname,
            fileName: file.filename,
            mimeType: file.mimetype,
            size: file.size,
        };

        const miniatureFormat = await sharp(`${photo.path}`)
        .resize({
            width: 300,
            height: 300 
        })
        .toFormat('webp')
        .webp({
            quality: 80,
            nearLossless: true
        })
        .toBuffer();

        const absolutePath = path.join(`/app`, `/.uploads/${photo.originalName.substring(0, photo.originalName.indexOf('.'))}`);

        await fs.mkdir(absolutePath);
        await fs.writeFile(`${absolutePath}/${photo.originalName}` , miniatureFormat, 'base64');

        await fs.rename(photo.path, `${absolutePath}/${photo.originalName}1`);
        await this.photoService.createPhoto(photo);

        res.status(201).json({ message: `Image created -  ${JSON.stringify(photo)}`});
    }

    createMultiplePhotos = async (req: Request, res: Response) => {
        const files = req.files as Express.Multer.File[];
        const photos = files.map(f => ({
            path: f.path,
            originalName: f.originalname,
            fileName: f.filename,
            mimeType: f.mimetype,
            size: f.size,
        }));

        await this.photoService.createMultiplePhotos(photos);

        res.status(201).json({ message: `${photos.length} images created` });
    }
}