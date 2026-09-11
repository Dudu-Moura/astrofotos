import { Router } from "express";
import { PhotoController } from "../controllers/photo.controller.js";
import { photoController } from "../container.js";

const router = Router();

router.get('/', photoController.getPhoto);
router.get('/:id', photoController.getPhotoById);
router.post('/', photoController.createPhoto);

export default router;