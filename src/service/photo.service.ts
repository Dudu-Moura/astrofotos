import { PhotoRepository } from "../repository/photo.repository.js";
import type { Photo } from "../types/photo.types.js";

export class PhotoService {
    constructor(private photoRepository: PhotoRepository){};

    getPhotos = async () => {
        return this.photoRepository.findAll();
    }

    getPhotoById = async (id: string) => {
        return this.photoRepository.findOne(id)
    }

    createPhoto = async (photo: Photo) => {
        return this.photoRepository.create(photo);
    }
}