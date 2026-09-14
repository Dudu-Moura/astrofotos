import { Router } from "express";
import { PhotoController } from "../controllers/photo.controller.js";
import { photoController } from "../container.js";
import { upload } from "../middlewares/upload.js";

const router = Router();

router.get('/', photoController.getPhoto);
router.get('/:id', upload.single('photo'), photoController.getPhotoById);
router.post('/', photoController.createPhoto);

export default router;