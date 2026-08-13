import z from "zod";

export const signupSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(40),
  firstName: z.string().min(2, "First name must be at least 2 characters").max(28),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(28),
});

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(40),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(2).max(28).optional(),
  lastName: z.string().min(2).max(28).optional(),
  email: z.email("Invalid email address").optional(),
  password: z.string().min(6).max(40).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;