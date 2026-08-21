import { embeddingModel } from "../../llm.js";


export const generateEmbeddings = async (chunks: string[]) => {
    return await embeddingModel.embedDocuments(chunks);
};
