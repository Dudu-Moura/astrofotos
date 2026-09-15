import type { Format } from "../types/format.types.js";
import type { NewPhoto } from "../types/photo.types.js";
import sharp from 'sharp'

export const generateVariants = async (file: NewPhoto, variants: Format[]) => {
    const allVariants = await Promise.all(variants.map(async v => {
        const buffer = await sharp(file.path)
            .resize({
                width: v.width,
                height: v.height
            })
            .toFormat('webp')
            .webp({
                quality: v.quality,
                lossless: true
            })
            .toBuffer()

        return { id: v.id, buffer }
    }))

    return allVariants
}