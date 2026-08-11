import z from "zod";

export const generateApiKeySchema = z.object({
  name: z
    .string({ message: "Key name is required" })
    .trim()
    .min(1, "Key name cannot be empty")
    .max(100, "Key name cannot exceed 100 characters"),
  organizationId: z.string({ message: "Organization ID is required" }),
  expiresInDays: z.number().positive().optional(),
});

export type GenerateApiKeyInput = z.infer<typeof generateApiKeySchema>;