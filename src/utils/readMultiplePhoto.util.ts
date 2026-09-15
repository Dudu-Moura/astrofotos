import type { Photo } from "../types/photo.types.js";
import exifr from 'exifr';
import { readFile } from 'node:fs/promises';


export const readMultiplePhoto = async (files: Photo[]) => {
    const metadatas = await Promise.all(files.map(f => exifr.parse(f.path)));

    const photos = await Promise.all(files.map(f => readFile(f.path)));

    return { photos, metadatas };
}