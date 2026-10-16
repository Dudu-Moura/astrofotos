import type { Photo } from "../types/photo.types.js";
import fs from 'node:fs/promises';
import exifr from 'exifr'

export const readPhoto = async (file: Photo) => {
    const photo = await fs.readFile(file.path);

    if(photo.length === 0){
        throw new Error(`Cannot read empty file`);
    }

    const metadata = await exifr.parse(file.path);


    return { photo, metadata }; 
}