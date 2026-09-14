import type { Request, Response, NextFunction } from "express";
import type { PhotoService } from "../service/photo.service.js";
import type { Photo } from "../types/photo.types.js";
import fs, { readFileSync } from 'node:fs';
import exifr from 'exifr'
import path from "node:path";

export class PhotoController {
    constructor(private photoService: PhotoService){};

    getPhoto = async (req: Request, res: Response, next: NextFunction) => {
        const photos = await this.photoService.getPhotos();

        const metadatas = await Promise.all(photos.map(p => exifr.parse(`${p.path}`)));

        const readFiles = photos.map(p => readFileSync(p.path));
        res.status(200).json({
            photos: readFiles.map(rF => rF.toString('base64')),
            metadatas: metadatas,
            mimeType: photos.map(p => p.mimeType)
        })

    }

    getPhotoById = async (req: Request, res: Response, _: NextFunction) => {
        const id = String(req.params.id);
        const photo = await this.photoService.getPhotoById(id);

        const metadata = await exifr.parse(`.uploads/${photo.fileName}`);
        console.log(metadata);

        const readPhoto = fs.readFileSync(photo.path);

        res.status(200).json({
            photo: readPhoto.toString('base64'), 
            data: metadata,
            mimeType: photo.mimeType
        });
    }

    createPhoto = async (req: Request, res: Response, _: NextFunction) => {
        const file = req.file!;
        const photo = {
            path: file.path,
            originalName: file.originalname,
            fileName: file.filename,
            mimeType: file.mimetype,
            size: file.size,
        };

        await this.photoService.createPhoto(photo);

        res.status(201).json({ message: `Image created -  ${JSON.stringify(photo)}`});
    }

    createMultiplePhotos = async (req: Request, res: Response, _: NextFunction) => {
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