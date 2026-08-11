import jwt from "jsonwebtoken";

interface JwtPayload {
  userId: string;
  role: string;
}

export const generateToken = (userId: string, role: string) => {
  const payload: JwtPayload = { userId, role };
  const secret = process.env.JWT_SECRET || "default_secret_not_setin_env";

  const options: any = {
    expiresIn: "7d",
  };

  return jwt.sign(payload, secret, options);
};
