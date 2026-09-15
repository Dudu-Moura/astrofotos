import type { NewPhoto } from "../types/photo.types.js";
import sharp from 'sharp'

export type Format = {
    id: string
    width: number,
    height: number,
    quality: number
}

export const miniatureFormat: Format = {
    id: 'M',
    width: 300,
    height: 300,
    quality: 80
}

export const webFormat: Format = {
    id: 'W',
    width: 1600,
    height: 1600,
    quality: 100
}

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