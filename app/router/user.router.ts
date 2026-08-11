import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  userLogin,
  userSignup,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.post("/signup", userSignup);
userRouter.post("/login", userLogin);

// Update user routes (requires authentication)
userRouter.post("/update/:id", authMiddleware, updateUser);

// Delete user routes (requires authentication)
userRouter.delete("/delete/:id", authMiddleware, deleteUser);

export default userRouter;
