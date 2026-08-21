import { Router } from "express";
import multer from "multer";
import { uploadDocument, searchKnowledge } from "../controllers/knowledge.controller.js";

const router = Router();

// Store files in memory so we can read them directly from req.file.buffer
const upload = multer({ storage: multer.memoryStorage() });

router.post("/documents", upload.single("file"), uploadDocument);
router.post("/search", searchKnowledge);

export { router as knowledgeRouter };
