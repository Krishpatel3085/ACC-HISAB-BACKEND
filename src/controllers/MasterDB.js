import bcrypt from "bcryptjs";
import Master from "../models/MasterDB.js";
import { sendEmail } from "../config/sendEmail.js";
import Inquiry from "../models/Inquery.js";
import MESSAGES from "../config/messages.js";


// This function creates a new master database entry based on the inquiry data.
const createMasterDB = async (req, res) => {
    try {
        const { Status, Type } = req.body;
        const inquiry = await Master.findById(req.params.id);
        if (!inquiry) return res.status(404).json({ message: MESSAGES.ERROR.INQUIRY_NOT_FOUND });

        if (Status) inquiry.Status = Status;
        if (Type) inquiry.Type = Type;

        const email = inquiry.UserEmail;
        if (!email) return res.status(400).json({ message: MESSAGES.ERROR.EMAIL_NOT_FOUND });

        if (Status.toLowerCase() !== "decline") {
            let companyCode;
            do {
                companyCode = Math.random().toString(36).substr(2, 5).toUpperCase();
            } while (await Master.exists({ companyCode }));

            inquiry.companyCode = companyCode;  // Assign only if Status is not decline
        }

        await inquiry.save();

        const subject = Status.toLowerCase() === "decline" ? "Your Request Rejected" : "Your Request Accepted";
        const msg = Status.toLowerCase() === "decline"
            ? `Unfortunately, your request has been rejected.`
            : `You have successfully registered. Your Company Code is: ${inquiry.companyCode}`;

        const html = Status.toLowerCase() === "decline"
            ? `<p>Dear User,</p><p>We regret to inform you that your registration request has been declined.</p>`
            : `<p>Thank you for registering with us! Your Company Code: <strong>${inquiry.companyCode}</strong></p>`;

        try {
            await sendEmail(email, subject, msg, html);
            return res.status(200).json({ message: MESSAGES.SUCCESS.INQUIRY_ACCEPTED, companyCode: inquiry.companyCode || null });
        } catch (error) {
            console.error("Error sending email:", error);
            return res.status(500).json({ message: MESSAGES.ERROR.FAILED_EMAIL, companyCode: inquiry.companyCode || null });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// This function changes the password of the user in the master database and inquiry database.
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) return res.status(400).json({ error: "Both old and new passwords are required" });

        const CompanyCode = req.user["companyCode"];
        const user = await Master.findOne({ companyCode: CompanyCode });

        if (!user) return res.status(404).json({ error: MESSAGES.ERROR.USER_NOT_FOUND });

        // 🔒 Compare hashed password
        const isMatch = await bcrypt.compare(oldPassword, user.Pass);
        if (!isMatch) return res.status(400).json({ error: MESSAGES.ERROR.PASSWORD_INCORRECT });

        // 🔐 Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.Pass = hashedPassword;
        await user.save();

        // Update password in InquiryDB if user exists there
        const inquiry = await Inquiry.findOne({ UserEmail: user.UserEmail });
        if (inquiry) {
            inquiry.Pass = hashedPassword;
            await inquiry.save();
        }

        res.status(200).json({ message: MESSAGES.SUCCESS.PASSWORD_UPDATED });
    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ error: MESSAGES.ERROR.SERVER_ERROR });
    }
};

// This function updates the profile of the user in the master database.
const updateProfile = async (req, res) => {
    try {
        const profileData = req.body;
        const CompanyCode = req.user["companyCode"];

        if (!CompanyCode) return res.status(400).json({ error: "Company code is required" });

        const user = await Master.findOne({ companyCode: CompanyCode });
        if (!user) return res.status(404).json({ error: "User not found" });

        user.Profile = [{ ...user.Profile[0], ...profileData }];

        await user.save();
        res.status(200).json({ message: MESSAGES.PROFILE_UPDATED, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const fetchMasterDb = async (req, res) => {
    try {
        const filters = req.query || {};

        // Optional: sanitize allowed filter keys (e.g., status, email)
        const allowedFilters = ['status', 'email', 'companyCode'];
        const sanitizedFilters = {};
        for (const key of allowedFilters) {
            if (filters[key]) {
                sanitizedFilters[key] = filters[key];
            }
        }

        const inquiries = await Master.find(sanitizedFilters);

        if (!inquiries || inquiries.length === 0) {
            return res.status(404).json({ message: MESSAGES.ERROR.INQUIRY.NOT_FOUND });
        }

        return res.status(200).json(inquiries);
    } catch (error) {
        console.error("Fetch Master DB Error:", error);
        return res.status(500).json({ message: MESSAGES.ERROR.SERVER.ERROR, error: error.message });
    }
};

const fetchProfile = async (req, res) => {
    try {
        const CompanyCode = req.user?.companyCode;

        if (!CompanyCode) {
            return res.status(400).json({ message: MESSAGES.ERROR.VALIDATION.COMPANY_CODE_REQUIRED });
        }

        const user = await Master.findOne({ companyCode: CompanyCode });

        if (!user) {
            return res.status(404).json({ message: MESSAGES.ERROR.USER.NOT_FOUND });
        }

        // Remove sensitive fields before sending (if any)
        const safeUser = user.toObject();
        delete safeUser.password; // Example, if exists

        return res.status(200).json({ profile: safeUser, profile2: safeUser.Profile });
    } catch (error) {
        console.error("Fetch Profile Error:", error);
        return res.status(500).json({ message: MESSAGES.ERROR.SERVER.ERROR, error: error.message });
    }
};
export { createMasterDB, changePassword, updateProfile, fetchMasterDb, fetchProfile };
