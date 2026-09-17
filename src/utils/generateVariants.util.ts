import type { Format } from "../types/format.types.js";
import type { NewPhoto } from "../types/photo.types.js";
import sharp from 'sharp'

export const generateVariants = async (file: NewPhoto, variants: Format[]) => {
    console.time('Variant Transformation');
    const allVariants = await Promise.all(variants.map(async v => {
        const buffer = await sharp(file.path)
            .resize({
                width: v.width,
                height: v.height
            })
            .webp({
                quality: v.quality
            })
            .toBuffer()

        return { id: v.id, buffer }
    }))

    console.timeEnd('Variant Transformation');
    return allVariants
}