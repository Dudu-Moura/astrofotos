import { eq } from "drizzle-orm"
import { instance } from "../db/instance.db.js"
import { photos } from "../db/schema.js"
import type { Photo } from "../types/photo.types.js"

export class PhotoRepository {
    findAll = async () => {
        return await instance.database
        .select()
        .from(photos)
    }

    findOne = async (id: string) => {
        return await instance.database
        .select()
        .from(photos)
        .where(eq(photos.fileName , id))
    }

    create = async (photo: Photo) => {
        try{
            return await instance.database
            .insert(photos)
            .values({
                originalName: photo.originalName,
                fileName: photo.fileName,
                mimeType: photo.mimeType,
                size: photo.size,
                path: photo.path,
            })
        }
        catch(err){
            if(err instanceof Error){
                console.error(`ERROR: ${err.message}`);
            }
            console.error(`An unexpected database error ocurred`);
        }
    }
}
