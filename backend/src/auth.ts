import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextFunction, RequestHandler, Response } from "express";
import { config } from "./config.js";
import type { AuthUser } from "./types.js";

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, config.jwtSecret, { expiresIn: "7d" });
}

export const requireAuth: RequestHandler = (request, response: Response, next: NextFunction) => {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    response.status(401).json({ message: "No autorizado" });
    return;
  }

  try {
    const token = header.replace("Bearer ", "");
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser;
    request.user = payload;
    next();
  } catch {
    response.status(401).json({ message: "Sesion invalida" });
  }
};

export function requireRole(roles: AuthUser["role"][]) {
  const handler: RequestHandler = (request, response: Response, next: NextFunction) => {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json({ message: "Permisos insuficientes" });
      return;
    }

    next();
  };

  return handler;
}
