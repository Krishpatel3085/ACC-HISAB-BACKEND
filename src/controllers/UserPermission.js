import mongoose from "mongoose";
import Master from "../models/MasterDB.js";
import permissionSchema from "../models/UserPermission.js";
import MESSAGES from "../config/messages.js";

const createUserGroupWithPermissions = async (req, res) => {
    try {
        const { userGroup } = req.body;
        const companyCode = req?.user?.companyCode;

        if (!companyCode) {
            return res.status(400).json({ message: MESSAGES.ERROR.COMPANY_CODE_REQUIRED });
        }

        if (!userGroup || typeof userGroup !== "string") {
            return res.status(400).json({ message: MESSAGES.ERROR.INVALID_USERGROUP });
        }

        // Step 1: Verify company exists
        const company = await Master.findOne({ companyCode });
        if (!company) {
            return res.status(404).json({ message: MESSAGES.ERROR.COMPANY_NOT_FOUND });
        }

        // Step 2: Use company-specific DB
        const companyDB = mongoose.connection.useDb(companyCode);
        const Permission = companyDB.models.Permissions || companyDB.model("Permissions", permissionSchema);

        // Step 3: Check if group already exists
        const existingGroup = await Permission.findOne({ userGroup });
        if (existingGroup) {
            return res.status(409).json({ error: `User group '${userGroup}' already exists.` });
        }

        // Step 4: Define default permissions
        const defaultPermissions = [
            // Place your full permission list here. Truncated for brevity:
            { formName: "DashBoard", view: true, insert: true, update: true, delete: true },
            { formName: "PurchaseBill", view: true, insert: true, update: true, delete: true },
            { formName: "PurchaseReturn", view: true, insert: true, update: true, delete: true },
            { formName: "SaleInvoice", view: true, insert: true, update: true, delete: true },
            { formName: "SaleOrder", view: true, insert: true, update: true, delete: true },
            { formName: "OnlineOrder", view: true, insert: true, update: true, delete: true },
            { formName: "SaleReturn", view: true, insert: true, update: true, delete: true },
            { formName: "Expense", view: true, insert: true, update: true, delete: true },
            { formName: "ExpenseCategory", view: true, insert: true, update: true, delete: true },
            { formName: "Item", view: true, insert: true, update: true, delete: true },
            { formName: "ItemCategory", view: true, insert: true, update: true, delete: true },
            { formName: "Party", view: true, insert: true, update: true, delete: true },
            { formName: "PaymentIn", view: true, insert: true, update: true, delete: true },
            { formName: "PaymentOut", view: true, insert: true, update: true, delete: true },
            { formName: "BankAccount", view: true, insert: true, update: true, delete: true },
            { formName: "CashInHand", view: true, insert: true, update: true, delete: true },
            { formName: "Cheque", view: true, insert: true, update: true, delete: true },
            { formName: "General", view: true, insert: true, update: true, delete: true },
            { formName: "Tax&GST", view: true, insert: true, update: true, delete: true },
            { formName: "WhatsappMessage", view: true, insert: true, update: true, delete: true },
            { formName: "GeneralMessage", view: true, insert: true, update: true, delete: true },
            { formName: "Print", view: true, insert: true, update: true, delete: true },
            { formName: "User", view: true, insert: true, update: true, delete: true },
            { formName: "UserManagement", view: true, insert: true, update: true, delete: true },
            { formName: "Reports", view: true, insert: true, update: true, delete: true },

        ];

        // Step 5: Create user group with permissions
        const newGroup = new Permission({
            userGroup,
            permissions: userGroup === "Admin"
                ? [{ tabCode: "ALL", formCode: "ALL", tabName: "All", formName: "All", view: true, insert: true, update: true, delete: true }]
                : defaultPermissions,
        });

        await newGroup.save();

        return res.status(201).json({ message: `User group '${userGroup}' created successfully.` });
    } catch (error) {
        console.error("Error in createUserGroupWithPermissions:", error);
        return res.status(500).json({ error: "Server error. Please try again later." });
    }
};

// Utility function to get company-specific DB and Permission model
const getCompanyPermissionModel = async (companyCode) => {
    const user = await Master.findOne({ companyCode });
    if (!user) throw new Error(MESSAGES.ERROR.USER_NOT_FOUND);

    const companyDB = mongoose.connection.useDb(user.companyCode);
    const Permission = companyDB.models.Permissions || companyDB.model("Permissions", permissionSchema);

    return Permission;
};

// Update User Permissions
const updateUserPermissions = async (req, res) => {
    try {
        const { userGroup, permissions } = req.body;
        const companyCode = req.user.companyCode;

        if (!userGroup || !permissions) {
            return res.status(400).json({ message: MESSAGES.ERROR.USER_GROUP_PERMISSION_REQUIRED });
        }

        const Permission = await getCompanyPermissionModel(companyCode);

        const updatedPermission = await Permission.findOneAndUpdate(
            { userGroup },
            { permissions },
            { new: true }
        );

        if (!updatedPermission) {
            return res.status(404).json({ message: MESSAGES.ERROR.INVALID_USERGROUP });
        }

        res.status(200).json({ message: MESSAGES.SUCCESS.PERMISSION, updatedPermission });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Fetch User Permissions by Group
const fetchUserPermissions = async (req, res) => {
    try {
        const { userGroup } = req.params;
        const companyCode = req.user.companyCode;

        if (!userGroup) {
            return res.status(400).json({ message: MESSAGES.ERROR.INVALID_USERGROUP });
        }

        const Permission = await getCompanyPermissionModel(companyCode);
        const permissions = await Permission.findOne({ userGroup });

        if (!permissions) {
            return res.status(404).json({ message: MESSAGES.ERROR.PERMISSION_NOT_FOUND_USER_GROUP });
        }

        res.status(200).json({ permissions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Fetch All User Groups
const fetchUserGroups = async (req, res) => {
    try {
        const companyCode = req.user.companyCode;
        const Permission = await getCompanyPermissionModel(companyCode);
        const userGroups = await Permission.distinct("userGroup");

        res.status(200).json({ userGroups });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export {
    createUserGroupWithPermissions,
    updateUserPermissions,
    fetchUserPermissions,
    fetchUserGroups
}