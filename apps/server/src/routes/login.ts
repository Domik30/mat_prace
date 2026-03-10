import { Router } from "express";
import { login } from "../controllers/login.controller.js";
import { register } from "../controllers/register.controller.js";

export const loginRoutes = Router();

loginRoutes.post("/", login);
loginRoutes.post("/register", register);