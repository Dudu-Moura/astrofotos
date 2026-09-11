import { eq } from "drizzle-orm"
import { instance } from "../db/instance.db.js"
import { photos } from "../db/schema.js"

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

    create = async (photo) => {
        try{
            return await instance.database
            .insert(photos)
            .values({
                originalName: photo.originalname,
                fileName: photo.filename,
                mimeType: photo.mimetype,
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
