import { PhotoRepository } from "../repository/photo.repository.js";
import type { NewPhoto, Photo } from "../types/photo.types.js";

export class PhotoService {
    constructor(private photoRepository: PhotoRepository){};

    getPhotos = async () => {
        return this.photoRepository.findAll();
    }

    getPhotoById = async (id: string): Promise<Photo> => {
        const [photo] = await this.photoRepository.findOne(id);

        if(!photo){
            console.error(`Photo does not exist ${id}`);
            throw new Error(`Photo does not exits`);
        }

        return photo;
    }

    createPhoto = async (photo: NewPhoto) => {
        await this.photoRepository.create(photo);
        return;
    }

    createMultiplePhotos = async (photos: NewPhoto[]) => {
        await this.photoRepository.createMultiple(photos);
        return;
    }
}