import type { Request, Response, NextFunction } from "express";
import type { PhotoService } from "../service/photo.service.js";
import fs, { readFile } from 'node:fs/promises';
import exifr from 'exifr';
import sharp from 'sharp';
import path from 'node:path';
import { readMultiplePhoto } from "../utils/readMultiplePhoto.util.js";
import { readPhoto } from "../utils/readPhoto.util.js";
import { generateVariants, miniatureFormat, webFormat } from "../utils/generateVariants.util.js";
import { generateDirectoryForImages } from "../utils/generateDirectoryForImages.util.js";


export class PhotoController {
    constructor(private photoService: PhotoService){};

    getPhoto = async (_: Request, res: Response) => {
        const files = await this.photoService.getPhotos();

        const { photos, metadatas } = await readMultiplePhoto(files);

        res.status(200).json({
            photos: photos.map( p => p.toString('base64')),
            metadatas: metadatas,
            mimeType: files.map(f => f.mimeType)
        })

    }

    getPhotoById = async (req: Request, res: Response) => {
        const id = String(req.params.id);
        const file = await this.photoService.getPhotoById(id);

        const { photo, metadata } = await readPhoto(file);

        res.status(200).json({
            photo: photo.toString('base64'), 
            data: metadata,
            mimeType: file.mimeType
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

        const variants = await generateVariants(photo, [miniatureFormat, webFormat]);

        await generateDirectoryForImages(photo, variants);
        await this.photoService.createPhoto(photo);

        res.status(201).json({ message: `Image created - ${JSON.stringify(photo.originalName)}`});
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