import express from "express";
import {
    createItem,
    FetchItem,
    fetchOnlineItems,
    updateItem,
    deleteItem
} from "../controllers/Item.js";
import { authenticateToken } from "../middleware/authMiddleware.js";


export const Item_router = express.Router();

// Protected Routes
Item_router.post("/createItem", authenticateToken, createItem);
Item_router.put("/updateItem/:id", authenticateToken, updateItem);
Item_router.delete("/deleteItem/:id", authenticateToken, deleteItem);
Item_router.get("/fetchItem", authenticateToken, FetchItem);

// Public Route
Item_router.get("/fetch-onlineItem", fetchOnlineItems);


