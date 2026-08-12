import wrapAsync from "../utils/warpAsync.js";
import ExpressError from "../utils/expressError.js";
import { prisma } from "../db/config.js";
import bcrypt from "bcryptjs";
import {
  signupSchema,
  loginSchema,
  updateUserSchema,
} from "../validators/user.validation.js";
import { generateToken } from "../utils/jwt.js";

export const userSignup = wrapAsync(async (req, res) => {
  // 1. Validate request body
  const data = signupSchema.parse(req.body);

  const { email, password, firstName, lastName } = data;

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
  const token = generateToken(user.id, user.role, user.organizationId);

  // set token in cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
    token,
  });
});

export const updateUser = wrapAsync(async (req, res) => {
  // 1. Determine target user ID
  const userId = req.user?.userId;

  if (!userId && typeof userId !== "string") {
    throw new ExpressError("User ID is required", 400);
  }

  // 2. Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new ExpressError("User not found", 404);
  }

  // 3. Parse and validate payload
  const updateData = updateUserSchema.parse(req.body);

  // 4. Check email uniqueness if email is changing
  if (updateData.email && updateData.email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email: updateData.email },
    });

    if (emailExists) {
      throw new ExpressError("Email is already in use", 409);
    }
  }

  // 5. Hash password if updated
  let hashedPassword: string | undefined;
  if (updateData.password) {
    hashedPassword = await bcrypt.hash(updateData.password, 12);
  }

  // 6. Update user in database
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(updateData.firstName && { firstName: updateData.firstName }),
      ...(updateData.lastName && { lastName: updateData.lastName }),
      ...(updateData.email && { email: updateData.email }),
      ...(hashedPassword && { password: hashedPassword }),
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

  // 7. Return safe user object
  res.status(200).json({
    success: true,
    message: "User updated successfully",
    user: updatedUser,
  });
});

export const deleteUser = wrapAsync(async (req, res) => {
  const targetUserId = req.params.id;

  if (!targetUserId || typeof targetUserId !== "string") {
    throw new ExpressError("User ID is required", 400);
  }

  const requesterId = req.user?.userId || req.body.requesterId;

  if (!requesterId || typeof requesterId !== "string") {
    throw new ExpressError("Unauthorized access", 401);
  }

  // 1. Get requester
  const requester = await prisma.user.findUnique({
    where: {
      id: requesterId,
    },
  });

  if (!requester) {
    throw new ExpressError("Requester not found", 404);
  }

  // 2. Only OWNER and ADMIN can delete users
  if (
    requester.role !== "OWNER" &&
    requester.role !== "ADMIN"
  ) {
    throw new ExpressError(
      "You do not have permission to delete users",
      403
    );
  }

  // 3. Get target user
  const targetUser = await prisma.user.findUnique({
    where: {
      id: targetUserId,
    },
  });

  if (!targetUser) {
    throw new ExpressError("User not found", 404);
  }

  // 4. Make sure target belongs to same organization
  if (
    !requester.organizationId ||
    requester.organizationId !== targetUser.organizationId
  ) {
    throw new ExpressError(
      "You cannot delete a user from another organization",
      403
    );
  }

  // 5. Never allow OWNER to be deleted
  if (targetUser.role === "OWNER") {
    throw new ExpressError(
      "Cannot delete the organization OWNER. Assign ownership to another user first.",
      403
    );
  }

  // 6. ADMIN cannot delete another ADMIN
  if (
    requester.role === "ADMIN" &&
    targetUser.role === "ADMIN"
  ) {
    throw new ExpressError(
      "ADMIN cannot delete another ADMIN",
      403
    );
  }

  // 7. Prevent deleting yourself
  if (requester.id === targetUser.id) {
    throw new ExpressError(
      "You cannot delete yourself",
      403
    );
  }

  // 8. Delete user
  await prisma.user.delete({
    where: {
      id: targetUserId,
    },
  });

  // 9. Response
  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

export const userLogout = wrapAsync(async (req, res) => {
  // Clear the token cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  // Return success response
  res.status(200).json({
    success: true,
    message: "User logged out successfully",
  });
});
