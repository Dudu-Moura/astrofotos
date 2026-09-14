import type { Request, Response, NextFunction } from "express";
import type { PhotoService } from "../service/photo.service.js";
import type { Photo } from "../types/photo.types.js";
import fs from 'node:fs';
import exifr from 'exifr'

export class PhotoController {
    constructor(private photoService: PhotoService){};

    getPhoto = async (req: Request, res: Response, next: NextFunction) => {
        const photos = await this.photoService.getPhotos();
    }

    getPhotoById = async (req: Request, res: Response, _: NextFunction) => {
        const id = String(req.params.id);
        const photo = await this.photoService.getPhotoById(id);

        const metadata = await exifr.parse(`.uploads/${photo.fileName}`);
        console.log(metadata);

        const readPhoto = fs.readFileSync(photo.path);

        res.status(200).type(photo.mimeType).send({photo: readPhoto, data: metadata});
    }

    createPhoto = async (req: Request<{}, {}, Photo>, res: Response, _: NextFunction) => {
        const photo = await this.photoService.createPhoto(req.body);

        res.status(201).json({ message: `Image created -  ${photo}`});
    }
}