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
    console.time('Folder generation');
    const absolutePath = path.join(`/app`, `/.uploads/${file.originalName.substring(0, file.originalName.indexOf('.'))}`);
    
    await fs.mkdir(absolutePath);
    await Promise.all(variants.map(v => fs.writeFile(`${absolutePath}/${file.originalName.substring(0, file.originalName.indexOf('.'))}${v.id}`, v.buffer , 'base64')));
    
    await fs.rename(file.path, `${absolutePath}/${file.originalName}1`);

    console.timeEnd('Folder generation');
    return
}