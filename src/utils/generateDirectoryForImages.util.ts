import type { NewPhoto } from "../types/photo.types.js";
import path from 'node:path';
import fs from 'node:fs/promises';

export const generateDirectoryForImages = async (
    file: NewPhoto, 
    variants: {
        id: string,
        buffer: Buffer<ArrayBuffer>
    }[]
) => {
    const absolutePath = path.join(`/app`, `/.uploads/${file.originalName.substring(0, file.originalName.indexOf('.'))}`);

    const variantsBuffer = variants.map(v => v.buffer);
    
    await fs.mkdir(absolutePath);
    await variants.forEach(v => fs.writeFile(`${absolutePath}/${file.originalName.substring(0, file.originalName.indexOf('.'))}${v.id}`, v.buffer , 'base64'));
    
    await fs.rename(file.path, `${absolutePath}/${file.originalName}1`);

    return
}