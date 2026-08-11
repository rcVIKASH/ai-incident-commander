import wrapAsync from "../utils/warpAsync.js";
import ExpressError from "../utils/expressError.js";
import { prisma } from "../db/config.js";
import bcrypt from "bcryptjs";
import { signupSchema, loginSchema } from "../validators/user.validation.js";
import { generateToken } from "../utils/jwt.js";

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

export const userLogin = wrapAsync(async (req, res) => {
  const data = loginSchema.parse(req.body);

  const { email, password } = data;

  // check for exits>
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ExpressError("Invalid email or password", 401);
  }

  // check for password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ExpressError("Invalid email or password", 401);
  }

  // generate JWT token
  const token = generateToken(user.id, user.role);

  // set token in cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // return safe user data
  res.status(200).json({
    success: true,
    message: "User logged in successfully",
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});
