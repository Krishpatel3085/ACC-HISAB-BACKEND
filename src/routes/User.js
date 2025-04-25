import express from 'express';
import { userCreate, getAllUsers, updateUser, deleteUser } from "../controllers/User.js";
import { authenticateToken } from "../middleware/authMiddleware.js";



export const User_Route = express.Router();

// User routes with improved naming
User_Route.post("/create-user", authenticateToken, userCreate);
User_Route.get("/getUsers", authenticateToken, getAllUsers);
User_Route.put("/update-user/:id", authenticateToken, updateUser);
User_Route.delete("/delete-user/:id", authenticateToken, deleteUser);