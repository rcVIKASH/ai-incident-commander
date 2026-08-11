import wrapAsync from "../utils/warpAsync.js";
import ExpressError from "../utils/expressError.js";
import { prisma } from "../db/config.js";
import bcrypt from "bcryptjs";
import { signupSchema } from "../validators/user.validation.js";

export const userSignup = wrapAsync(async (req, res) => {
  // 1. Validate request body
  const data = signupSchema.parse(req.body);

  const { email, password, firstName, lastName, organizationId } = data;

  // 2. Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ExpressError("User already exists", 409);
  }

  // 3. Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // 4. Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      organizationId: organizationId ?? null,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 5. Return safe user data
  res.status(201).json({
    success: true,
    message: "User created successfully",
    user,
  });
});
