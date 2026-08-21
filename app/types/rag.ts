export type RetrievedKnowledge = {
    content: string;
    source: string;
    score?: number;
    metadata: {
        companyId: string;
        documentType: string;
        service?: string;
        documentId?: string;
    };
};

export interface IngestDocumentInput {
    document: string;
    metadata: {
        companyId: string;
        documentId: string;
        fileName: string;
        documentType: string;
        service?: string;
    };
}

export interface RetrieveOptions {
    companyId: string;
    service?: string;
    limit?: number;
}

export interface IngestResult {
    success: boolean;
    chunks: number;
}