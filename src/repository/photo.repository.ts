import { eq } from "drizzle-orm"
import { instance } from "../db/instance.db.js"
import { photos } from "../db/schema.js"
import type { NewPhoto, Photo } from "../types/photo.types.js"

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
        .where(eq(photos.id , id))
    }

    create = async (photo: NewPhoto) => {
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
            .returning()
        }
        catch(err){
            if(err instanceof Error){
                console.error(`ERROR: ${err.message}`);
            }
            console.error(`An unexpected database error ocurred`);
        }
    }

    createMultiple = async (newPhotos: NewPhoto[]) => {
        try{
            return await instance.database
            .insert(photos)
            .values(newPhotos)
        }
        catch(err){
            if(err instanceof Error){
                console.error(`ERROR: ${err.message}`);
            }
            console.error(`An unexpected database error ocurred`);
        }
    }
}
