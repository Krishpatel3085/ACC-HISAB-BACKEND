import express from 'express';
import { createMasterDB, updateProfile, changePassword, fetchMasterDb, fetchProfile } from "../controllers/MasterDB.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

export const Master_router = express.Router();

Master_router.patch('/master/:id', createMasterDB);
Master_router.put('/password', authenticateToken, changePassword);
Master_router.get('/master-db', fetchMasterDb);
Master_router.put('/profile', authenticateToken, updateProfile);
Master_router.get('/profiles', authenticateToken, fetchProfile);