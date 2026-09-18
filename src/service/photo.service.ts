import { miniatureFormat, webFormat } from "../constants/format.constants.js";
import { PhotoRepository } from "../repository/photo.repository.js";
import { generateDirectoryForImages } from "../utils/generateDirectoryForImages.util.js";
import { generateMultipleDirectoryForImages } from "../utils/generateMultipleDirectoryForImages.util.js";
import { generateMultipleVariants } from "../utils/generateMultipleVariants.util.js";
import { generateVariants } from "../utils/generateVariants.util.js";
import { readMultiplePhoto } from "../utils/readMultiplePhoto.util.js";
import { readPhoto } from "../utils/readPhoto.util.js";

export class PhotoService {
    constructor(private photoRepository: PhotoRepository){};

    getPhotos = async () => {
        const files = await this.photoRepository.findAll();

        const { photos, metadatas } = await readMultiplePhoto(files);

        return { photos, metadatas, files };
    }

    getPhotoById = async (id: string) => {
        const [file] = await this.photoRepository.findOne(id);

        if(!file){
            console.error(`Photo does not exist ${id}`);
            throw new Error(`Photo does not exits`);
        }

        const { photo, metadata } = await readPhoto(file);

        return { photo, metadata, file};
    }

    createPhoto = async (file: Express.Multer.File) => {
        const photo = {
            path: file.path,
            originalName: file.originalname,
            fileName: file.filename,
            mimeType: file.mimetype,
            size: file.size,
        };
        
        await this.photoRepository.create(photo);
        const variants = await generateVariants(photo, [miniatureFormat, webFormat]);
        
        await generateDirectoryForImages(photo, variants);

        return photo;
    }

    createMultiplePhotos = async (files: Express.Multer.File[]) => {
        const photos = files.map(f => ({
            path: f.path,
            originalName: f.originalname,
            fileName: f.filename,
            mimeType: f.mimetype,
            size: f.size,
        }));
        
        const variants = await generateMultipleVariants(photos, [miniatureFormat, webFormat]);
        
        await generateMultipleDirectoryForImages(photos, variants);

        await this.photoRepository.createMultiple(photos);

        return photos;
    }
}