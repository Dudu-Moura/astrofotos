import type { NewPhoto } from "../types/photo.types.js";
import { generateDirectoryForImages } from "./generateDirectoryForImages.util.js";

export const generateMultipleDirectoryForImages = async (
    files: NewPhoto[],
    variants: {
        id: string,
        buffer: Buffer<ArrayBuffer>
    }[][]
) => {
    await Promise.all(files.map((f, i) => generateDirectoryForImages(f, variants[i]!)));
}