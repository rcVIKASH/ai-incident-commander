import wrapAsync from "../utils/warpAsync.js";
import ExpressError from "../utils/expressError.js";
import { prisma } from "../db/config.js";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  updateUserRoleSchema,
  updateOwnerSchema,
} from "../validators/organization.validation.js";

export const createOrganization = wrapAsync(async (req, res) => {
  // 1. Validate request body
  const data = createOrganizationSchema.parse(req.body);
  const { name, slug, description } = data;

  // 2. Check if organization slug already exists
  const existingOrg = await prisma.organization.findUnique({
    where: { slug },
  });

  if (existingOrg) {
    throw new ExpressError("Organization with this slug already exists", 409);
  }

  // 3. Create organization
  const organization = await prisma.organization.create({
    data: {
      name,
      slug,
      description,
    },
  });

  // 4. If user is authenticated, associate user with organization as OWNER
  if (req.user?.userId) {
    await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        organizationId: organization.id,
        role: "OWNER",
      },
    });
  }

  // 5. Return created organization
  res.status(201).json({
    success: true,
    message: "Organization created successfully",
    organization,
  });
});

export const updateOrganization = wrapAsync(async (req, res) => {
  // 1. Determine target organization ID (from params, user context, or body)
  const orgId = req.params.id || req.user?.organizationId || req.body.id;

  if (!orgId) {
    throw new ExpressError("Organization ID is required", 400);
  }

  // 2. Check if organization exists
  const existingOrg = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!existingOrg) {
    throw new ExpressError("Organization not found", 404);
  }

  // 3. Parse & validate update payload
  const updateData = updateOrganizationSchema.parse(req.body);

  // 4. If slug is being updated, check uniqueness
  if (updateData.slug && updateData.slug !== existingOrg.slug) {
    const slugExists = await prisma.organization.findFirst({
      where: {
        slug: updateData.slug,
        id: { not: orgId },
      },
    });

    if (slugExists) {
      throw new ExpressError("Organization with this slug already exists", 409);
    }
  }

  // 5. Update organization
  const updatedOrg = await prisma.organization.update({
    where: { id: orgId },
    data: updateData,
  });

  // 6. Return response
  res.status(200).json({
    success: true,
    message: "Organization updated successfully",
    organization: updatedOrg,
  });
});

export const updateUserRole = wrapAsync(async (req, res) => {
  const rawOrgId = req.params.orgId;
  const rawUserId = req.params.userId;

  if (!rawOrgId || typeof rawOrgId !== "string") {
    throw new ExpressError("Organization ID parameter is required", 400);
  }

  if (!rawUserId || typeof rawUserId !== "string") {
    throw new ExpressError("User ID parameter is required", 400);
  }

  const orgId = rawOrgId;
  const userId = rawUserId;

  // 1. Parse & validate body role payload
  const { role } = updateUserRoleSchema.parse(req.body);

  // 2. Verify authenticated requester
  const requesterId = req.user?.userId;
  if (!requesterId) {
    throw new ExpressError("Unauthorized access", 401);
  }

  const requester = await prisma.user.findUnique({
    where: {
      id: requesterId,
    },
  });

  if (!requester) {
    throw new ExpressError("Requester user not found", 404);
  }

  // 3. Only OWNER can assign roles
  if (requester.role !== "OWNER") {
    throw new ExpressError(
      "Only the organization owner can assign roles",
      403
    );
  }

  // 4. Requester must belong to this organization
  if (!requester.organizationId || requester.organizationId !== orgId) {
    throw new ExpressError(
      "You do not have access to this organization",
      403
    );
  }

  // 5. Find target user INSIDE this organization
  const targetUser = await prisma.user.findFirst({
    where: {
      id: userId,
      organizationId: orgId,
    },
  });

  if (!targetUser) {
    throw new ExpressError(
      "User is not a member of this organization",
      404
    );
  }

  // 6. Never change OWNER through normal role assignment
  if (targetUser.role === "OWNER") {
    throw new ExpressError(
      "Owner role cannot be changed here",
      403
    );
  }

  // 7. Update role
  const updatedUser = await prisma.user.update({
    where: {
      id: targetUser.id,
    },
    data: {
      role,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      organizationId: true,
      updatedAt: true,
    },
  });

  res.status(200).json({
    success: true,
    message: "User role updated successfully",
    user: updatedUser,
  });
});

export const updateOwner = wrapAsync(async (req, res) => {
  const rawOrgId = req.params.orgId || req.params.id;

  if (!rawOrgId || typeof rawOrgId !== "string") {
    throw new ExpressError("Organization ID parameter is required", 400);
  }

  const orgId = rawOrgId;

  // 1. Determine new owner user ID (from params or request body)
  let newOwnerId: string | undefined;
  if (req.params.userId && typeof req.params.userId === "string") {
    newOwnerId = req.params.userId;
  } else if (req.body.newOwnerId || req.body.userId) {
    const data = updateOwnerSchema.parse({
      newOwnerId: req.body.newOwnerId || req.body.userId,
    });
    newOwnerId = data.newOwnerId;
  }

  if (!newOwnerId) {
    throw new ExpressError("New owner user ID is required", 400);
  }

  // 2. Verify authenticated requester
  const requesterId = req.user?.userId;
  if (!requesterId) {
    throw new ExpressError("Unauthorized access", 401);
  }

  const requester = await prisma.user.findUnique({
    where: {
      id: requesterId,
    },
  });

  if (!requester) {
    throw new ExpressError("Requester user not found", 404);
  }

  // 3. ONLY the organization OWNER can transfer ownership
  if (requester.role !== "OWNER") {
    throw new ExpressError(
      "Only the current organization owner can transfer ownership",
      403
    );
  }

  // 4. Requester must belong to this organization
  if (!requester.organizationId || requester.organizationId !== orgId) {
    throw new ExpressError(
      "You do not have access to this organization",
      403
    );
  }

  // 5. Cannot transfer ownership to yourself
  if (requester.id === newOwnerId) {
    throw new ExpressError(
      "You are already the owner of this organization",
      400
    );
  }

  // 6. Find target user INSIDE this organization
  const targetUser = await prisma.user.findFirst({
    where: {
      id: newOwnerId,
      organizationId: orgId,
    },
  });

  if (!targetUser) {
    throw new ExpressError(
      "Target user is not a member of this organization",
      404
    );
  }

  // 7. Atomic transaction: Demote current owner to ADMIN, promote target user to OWNER
  const [previousOwner, newOwner] = await prisma.$transaction([
    prisma.user.update({
      where: { id: requester.id },
      data: { role: "ADMIN" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
      },
    }),
    prisma.user.update({
      where: { id: targetUser.id },
      data: { role: "OWNER" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
      },
    }),
  ]);

  res.status(200).json({
    success: true,
    message: "Organization ownership transferred successfully",
    previousOwner,
    newOwner,
  });
});

