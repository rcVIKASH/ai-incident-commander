import { Request, Response } from "express";
import { knowledgeService } from "../services/knowledge.service.js";
import { z } from "zod";

// Temporary placeholder for auth
const DEFAULT_COMPANY_ID = "company-demo";

const uploadSchema = z.object({
    documentType: z.string(),
    service: z.string().optional()
});

const searchSchema = z.object({
    query: z.string(),
    service: z.string().optional(),
    limit: z.number().optional()
});

export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ error: "No file uploaded. Please send a 'file' in multipart/form-data." });
            return;
        }

        const parsedBody = uploadSchema.safeParse(req.body);
        if (!parsedBody.success) {
            res.status(400).json({ error: "Invalid form data", details: parsedBody.error });
            return;
        }

        const documentContent = req.file.buffer.toString("utf-8");
        const companyId = DEFAULT_COMPANY_ID; // TODO: Get from auth token
        const documentId = `doc_${Date.now()}`;

        const result = await knowledgeService.ingestDocument({
            document: documentContent,
            metadata: {
                companyId,
                documentId,
                fileName: req.file.originalname,
                documentType: parsedBody.data.documentType,
                service: parsedBody.data.service
            }
        });

        res.status(200).json({
            message: "Document ingested successfully",
            documentId,
            chunksProcessed: result.chunks
        });
    } catch (error: any) {
        console.error("Error uploading document:", error);
        res.status(500).json({ error: "Internal server error during ingestion", details: error.message });
    }
};

export const searchKnowledge = async (req: Request, res: Response): Promise<void> => {
    try {
        const parsedBody = searchSchema.safeParse(req.body);
        if (!parsedBody.success) {
            res.status(400).json({ error: "Invalid request body", details: parsedBody.error });
            return;
        }

        const companyId = DEFAULT_COMPANY_ID; // TODO: Get from auth token

        const results = await knowledgeService.retrieveKnowledge(parsedBody.data.query, {
            companyId,
            service: parsedBody.data.service,
            limit: parsedBody.data.limit || 5
        });

        res.status(200).json({ results });
    } catch (error: any) {
        console.error("Error searching knowledge:", error);
        res.status(500).json({ error: "Internal server error during search", details: error.message });
    }
};
