import type { Format } from "../types/format.types.js";
import type { NewPhoto } from "../types/photo.types.js";
import { generateVariants } from "./generateVariants.util.js";

export const generateMultipleVariants = async (files: NewPhoto[], variants: Format[]) => {
    const allVariants = await Promise.all(files.map(f => generateVariants(f, variants)));

    return allVariants
}