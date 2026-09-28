import { Router } from "express";
import { photoController } from "../container.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

router.get('/', photoController.getPhoto);
router.get('/:id', photoController.getPhotoById);
router.post('/', upload.single('photo'), photoController.createPhoto);
router.post('/multiple', upload.array('photos'), photoController.createMultiplePhotos);

export default router;