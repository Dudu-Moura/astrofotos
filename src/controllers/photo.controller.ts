import type { PhotoService } from "../service/photo.service.js";
import type { Photo } from "../types/photo.types.js";

export class PhotoController {
    constructor(private photoService: PhotoService){};

    getPhoto = async () => {
        return this.photoService.getPhotos();
    }

    getPhotoById = async (id: string) => {
        return this.photoService.getPhotoById(id);
    }

    createPhoto = async (photo: Photo) => {
        return this.photoService.createPhoto(photo);
    }
}