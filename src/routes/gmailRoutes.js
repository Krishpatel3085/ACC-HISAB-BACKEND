import express from "express";
import {
    googleLogin,
    googleCallback,
    getEmails,
    sendEmail
} from "../controllers/gmailController.js";

export const gmailRoutes = express.Router();

gmailRoutes.get("/login", googleLogin);
gmailRoutes.get("/callback", googleCallback);
gmailRoutes.get("/:category", getEmails);
gmailRoutes.post("/send", sendEmail);

