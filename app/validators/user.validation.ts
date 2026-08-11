
import z from "zod";

export const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(40),
  firstName: z.string().min(2).max(28),
  lastName: z.string().min(2).max(28),
  organizationId: z.string().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;  