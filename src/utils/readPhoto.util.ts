import type { Photo } from "../types/photo.types.js";
import fs from 'node:fs/promises';
import exifr from 'exifr'

export const readPhoto = async (file: Photo) => {
    const metadata = await exifr.parse(`.uploads/${file.fileName}`);

    const photo = await fs.readFile(file.path);

    return { photo, metadata }; 
}