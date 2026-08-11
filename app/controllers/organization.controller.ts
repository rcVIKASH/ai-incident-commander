import wrapAsync from "../utils/warpAsync.js";
import ExpressError from "../utils/expressError.js";
import { prisma } from "../db/config.js";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
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

