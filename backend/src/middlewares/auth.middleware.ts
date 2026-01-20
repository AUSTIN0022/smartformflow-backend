import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { UserRepository } from "../repositories/user.repo";

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
        const userRepository = new UserRepository();
        
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new Error("Unauthorized");
        }

        const token = authHeader.split(" ")[1];
        if(!token) {
            throw new Error("Unauthorized");
        }

        const payload = verifyToken(token);
        
        const user = await userRepository.findById(payload.userId);

        if (!user) {
            throw new Error("Unauthorized");
        }

        req.user = user;
        next();
    } catch(error) {
        next(error);
    }
};
