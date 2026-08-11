import { Router } from "express";
import { userSignup } from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.post("/signup", userSignup);

export default userRouter;
