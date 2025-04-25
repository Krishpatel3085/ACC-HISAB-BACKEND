import express from 'express';
import {
    createUserGroupWithPermissions,
    updateUserPermissions,
    fetchUserPermissions,
    fetchUserGroups
} from "../controllers/UserPermission.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

export const UserPermission_router = express.Router()

UserPermission_router.post('/createUserGroup', authenticateToken, createUserGroupWithPermissions)
UserPermission_router.put('/updateUserGroup', authenticateToken, updateUserPermissions)
UserPermission_router.get('/fetchUserPermissions/:userGroup', authenticateToken, fetchUserPermissions)
UserPermission_router.get('/fetchUserGroups', authenticateToken, fetchUserGroups)


