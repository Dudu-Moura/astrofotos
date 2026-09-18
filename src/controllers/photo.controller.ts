import type { Request, Response } from "express";
import type { PhotoService } from "../service/photo.service.js";
import { readMultiplePhoto } from "../utils/readMultiplePhoto.util.js";
import { readPhoto } from "../utils/readPhoto.util.js";
import { generateVariants } from "../utils/generateVariants.util.js";
import { generateDirectoryForImages } from "../utils/generateDirectoryForImages.util.js";
import { generateMultipleVariants } from "../utils/generateMultipleVariants.util.js";
import { generateMultipleDirectoryForImages } from "../utils/generateMultipleDirectoryForImages.util.js";
import { miniatureFormat, webFormat } from "../constants/format.constants.js";


export class PhotoController {
    constructor(private photoService: PhotoService){};

    getPhoto = async (_: Request, res: Response) => {
        const { photos, metadatas, files } = await this.photoService.getPhotos();

        res.status(200).json({
            photos: photos.map(p => p.toString('base64')),
            metadatas: metadatas,
            mimeType: files.map(f => f.mimeType)
        })
    }

    getPhotoById = async (req: Request, res: Response) => {
        const id = String(req.params.id);
        const { photo, metadata, file } = await this.photoService.getPhotoById(id);

        res.status(200).json({
            photo: photo.toString('base64'), 
            data: metadata,
            mimeType: file.mimeType
        });
    }

    createPhoto = async (req: Request, res: Response) => {
        const file = req.file!;

        const photo = await this.photoService.createPhoto(file);

        res.status(201).json({ message: `Image created - ${JSON.stringify(photo.originalName)}`});
    }

    createMultiplePhotos = async (req: Request, res: Response) => {
        const files = req.files as Express.Multer.File[];

        const photos = await this.photoService.createMultiplePhotos(files);

        res.status(201).json({ message: `${photos.length} images created` });
    }
}