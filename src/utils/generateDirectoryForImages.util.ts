import type { Photo } from "../types/photo.types.js";
import path from 'node:path';
import fs from 'node:fs/promises';

export const generateDirectoryForImages = async (file: Photo, miniature: Buffer<ArrayBuffer>) => {
    const absolutePath = path.join(`/app`, `/.uploads/${file.originalName.substring(0, file.originalName.indexOf('.'))}`);
    
    await fs.mkdir(absolutePath);
    await fs.writeFile(`${absolutePath}/${file.originalName}`, miniature, 'base64');
    
    await fs.rename(file.path, `${absolutePath}/${file.originalName}1`);
}