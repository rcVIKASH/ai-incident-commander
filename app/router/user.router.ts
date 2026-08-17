import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
  userLogin,
  userSignup,
  updateUser,
  deleteUser,
  userLogout,
  getUserProfile
} from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.post("/signup", userSignup);
userRouter.post("/login", userLogin);
userRouter.post("/logout", authMiddleware,userLogout);

userRouter.get("/me", authMiddleware, getUserProfile);

// Update user routes (requires authentication)
userRouter.post("/update", authMiddleware, updateUser);

// Delete user routes (requires authentication)
userRouter.delete("/delete/:id", authMiddleware, deleteUser);


export default userRouter;

