import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { readFileSync } from "fs";


export const chunkMarkdown = async (mdContent: string) => {
    const splitter = new RecursiveCharacterTextSplitter({
        separators: ["\n\n", "\n", ".", " "],
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    return splitter.splitText(mdContent);
};
