import { PhotoController } from "./controllers/photo.controller.js";
import { PhotoRepository } from "./repository/photo.repository.js";
import { PhotoService } from "./service/photo.service.js";

const photoRepository = new PhotoRepository();
const photoService = new PhotoService(photoRepository);
export const photoController = new PhotoController(photoService)