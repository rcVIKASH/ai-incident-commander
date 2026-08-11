import { AuthUser } from "./userType.js";
import { Organization } from "../db/generated/prisma/index.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      organization?: Organization;
    }
  }
}

export {};
