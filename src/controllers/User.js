import mongoose from "mongoose";
import bcrypt from "bcrypt";
import UserSchema from "../models/User.js";
import Master from "../models/MasterDB.js";
import MESSAGES from "../config/messages.js";

// Helper to get dynamic UserModel
const getUserModel = async (companyCode) => {
    const masterUser = await Master.findOne({ companyCode });
    if (!masterUser) throw new Error("Company not found");

    const companyDB = mongoose.connection.useDb(companyCode);
    return companyDB.model("User", UserSchema);
};

// Create a new user for a specific company
const userCreate = async (req, res) => {
    try {
        const { FirstName, LastName, Email, UserName, UserGroup, MobileNumber, Password, Avatar } = req.body;
        const CompanyCode = req.user["companyCode"];

        if (!FirstName || !LastName || !Email || !UserName || !MobileNumber || !Password) {
            return res.status(400).json({ success: false, message: MESSAGES.ERROR.ALL_FIELDS_REQUIRED });
        }

        const UserModel = await getUserModel(CompanyCode);

        const existingUser = await UserModel.findOne({ $or: [{ Email }, { UserName }] });
        if (existingUser) {
            return res.status(409).json({ success: false, message: MESSAGES.ERROR.USER_ALREADY_EXISTS });
        }

        const hashedPassword = await bcrypt.hash(Password, 10);

        const newUser = new UserModel({
            FirstName,
            LastName,
            Email,
            UserName,
            UserGroup,
            MobileNumber,
            Password: hashedPassword,
            Avatar
        });

        await newUser.save();

        return res.status(201).json({ success: true, message: MESSAGES.SUCCESS.USER_CREARTED, data: newUser });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

// Get all users for a specific company (with pagination)
const getAllUsers = async (req, res) => {
    try {
        const CompanyCode = req.user["companyCode"];
       
        const UserModel = await getUserModel(CompanyCode);

        const users = await UserModel.find();
     
        return res.status(200).json({
            success: true,
            data: users,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

// Update a specific user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { FirstName, LastName, Email, UserName, UserGroup, MobileNumber, Avatar } = req.body;
        const CompanyCode = req.user["companyCode"];

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid User ID" });
        }

        const UserModel = await getUserModel(CompanyCode);

        const updatedUser = await UserModel.findByIdAndUpdate(
            id,
            { FirstName, LastName, Email, UserName, UserGroup, MobileNumber, Avatar },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: MESSAGES.ERROR.USER_NOT_FOUND });
        }

        return res.status(200).json({ success: true, message: MESSAGES.SUCCESS.USER_UPDATED, data: updatedUser });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

// Delete a specific user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const CompanyCode = req.user["companyCode"];

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid User ID" });
        }

        const UserModel = await getUserModel(CompanyCode);

        const deletedUser = await UserModel.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, message: MESSAGES.SUCCESS.USER_DELETED, data: deletedUser });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

export { userCreate, getAllUsers, updateUser, deleteUser };
