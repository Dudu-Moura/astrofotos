import type { NewPhoto } from "../types/photo.types.js";
import sharp from 'sharp'

export const generateMiniature = async (file: NewPhoto) => {
    const miniatureFormat = await sharp(file.path)
            .resize({
                width: 300,
                height: 300 
            })
            .toFormat('webp')
            .webp({
                quality: 80,
                nearLossless: true
            })
            .toBuffer();

    return miniatureFormat;
}