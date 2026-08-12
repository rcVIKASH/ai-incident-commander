import z from "zod";

export const createOrganizationSchema = z.object({
  name: z
    .string({ message: "Organization name is required" })
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name cannot exceed 100 characters"),
  slug: z
    .string({ message: "Slug is required" })
    .trim()
    .toLowerCase()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug cannot exceed 50 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain only lowercase letters, numbers, and single hyphens without leading or trailing hyphens"
    ),
  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = createOrganizationSchema.partial();

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const updateUserRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"], {
    message: "Role must be either ADMIN or MEMBER",
  }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const updateOwnerSchema = z.object({
  newOwnerId: z
    .string({ message: "New owner ID is required" })
    .trim()
    .min(1, "New owner ID cannot be empty"),
});

export type UpdateOwnerInput = z.infer<typeof updateOwnerSchema>;

