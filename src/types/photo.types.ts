import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { photos } from "../db/schema.js";

export type Photo = InferSelectModel<typeof photos>
export type NewPhoto = InferInsertModel<typeof photos>