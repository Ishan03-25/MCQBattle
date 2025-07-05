import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const userMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ msg: "Authorization token missing" });
        return;
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token,process.env.USER_JWT_SECRET_KEY!) as { id: string; username: string };
        req.body.userId = decoded.id; 
        next();
    } catch (err) {
        console.log(err);
        res.status(401).json({ msg: "Invalid or expired token" });
        return;
    }
};
