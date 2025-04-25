import Inquiry from "../Models/Inquery.js";
import Master from "../models/MasterDB.js";
import axios from "axios";
import jwt from "jsonwebtoken";
import { sendEmail } from "../config/sendEmail.js";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import dotenv from 'dotenv';
import userSchema from "../models/User.js";
import mongoose from "mongoose";
import MESSAGES from "../config/messages.js";

dotenv.config();

const createInquery = async (req, res) => {
    try {
        const { FirstName, LastName, UserEmail, UserMobile, Pass, UserName, CompanyName } = req.body;

        // Check if the user already exists in Inquiry
        const existingInquiry = await Inquiry.findOne({ UserEmail, CompanyName, UserMobile, LastName, FirstName, UserName });

        if (existingInquiry) {
            return res.status(400).json({ message: MESSAGES.ERROR.USER_ALREADY_EXISTS });
        }

        // Dynamically generate values
        const InqueryDate = new Date().toDateString();  // Current timestamp for the inquiry date

        // Get the current time in HH:MM:SS format
        const InqueryTime = new Date().toLocaleTimeString('en-US', { hour12: false });

        const InqueryID = `INQ-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;  // Generate a unique ID (e.g., 'INQ-ABC123XYZ')
        const Verification = 'False';
        const Status = 'InActive';

        // Save in Inquiry Schema
        const inquiry = new Inquiry({
            FirstName,
            LastName,
            UserEmail,
            CompanyName,
            UserMobile,
            Pass,
            InqueryDate,
            InqueryTime,
            InqueryID,
            Verification,
            Status,
            UserName,
        });
        await inquiry.save();

        let master = await Master.findOne({ UserEmail, CompanyName });

        if (!master) {

            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 7);  // Add 7 days
            const ExpiryDate = expiryDate.toDateString(); // Format it as a readable date
            // Create new Master record
            master = new Master({
                UserEmail,
                UserMobile,
                UserName,
                CompanyName,
                InqueryDate,
                companyCode: '',
                ExpiryDate,
                Pass// Assign unique companyCode
            });

            await master.save();
        }
        res.status(201).json({ message: MESSAGES.SUCCESS.INQUIRY_SUBMITTED });
    } catch (error) {
        // Handle any errors and send a response with the error message
        res.status(500).json({ error: error.message });
    }
};


const otpStorage = new Map();

// 🔹 Send OTP via WhatsApp API
const sendOTP = async (mobile, otp) => {
    try {
        const apiUrl = `${process.env.WHATSAPP_API_URL}token=${process.env.WHATSAPP_TOKEN}&instance_id=${process.env.WHATSAPP_INSTANCE_ID}&jid=91${mobile}@s.whatsapp.net&msg=Your+OTP+is:+${otp}`;
        const response = await axios.get(apiUrl);
        return response.data;
    } catch (error) {
        console.error("Error sending OTP:", error.message);
        return null;
    }
};

const requestOTPFor2FA = async (req, res) => {
    try {
        const CompanyCode = req.user["companyCode"];
        if (!CompanyCode) return res.status(400).json({ message: MESSAGES.ERROR.COMPANY_CODE_REQUIRED });

        // Find user
        const user = await Master.findOne({ companyCode: CompanyCode });
        if (!user) return res.status(404).json({ message: MESSAGES.ERROR.USER_NOT_FOUND });

        if (user.twoFAEnabled) {
            return res.status(400).json({ message: MESSAGES.WARNING.TWO_FA_ENABLED });
        }

        // Generate OTP for WhatsApp
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP temporarily
        otpStorage.set(user.UserMobile, otpCode);

        // Send OTP via WhatsApp
        await sendOTP(user.UserMobile, otpCode);

        res.status(200).json({ message: MESSAGES.SUCCESS.OTP_SENT, step: "verify" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const disable2FA = async (req, res) => {
    try {
        const CompanyCode = req.user["companyCode"];

        if (!CompanyCode) return res.status(400).json({ message: MESSAGES.ERROR.COMPANY_CODE_REQUIRED });

        // Find user
        const user = await Master.findOne({ companyCode: CompanyCode });
        if (!user) return res.status(404).json({ message: MESSAGES.ERROR.USER_NOT_FOUND });

        if (!user.twoFAEnabled) {
            return res.status(400).json({ message: MESSAGES.WARNING.TWO_FA_DISABLED });
        }

        // Disable 2FA
        user.twoFAEnabled = false;
        user.twoFASecret = ""; // Optionally remove secret key
        await user.save();

        res.status(200).json({ message: MESSAGES.SUCCESS.TWO_FA_ENABLED });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



const verifyOTPAndEnable2FA = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const CompanyCode = req.user["companyCode"];

        const user = await Master.findOne({ companyCode: CompanyCode });
        if (!user) return res.status(404).json({ message: MESSAGES.ERROR.USER_NOT_FOUND });

        // Get stored OTP from temporary storage
        if (!otp || otp !== otpStorage.get(user.UserMobile)) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // ✅ OTP verified → Remove from temporary storage
        otpStorage.delete(email);

        // ✅ Generate Google Authenticator Secret
        const secret = speakeasy.generateSecret({ length: 20 });

        user.twoFASecret = secret.base32;
        user.twoFAEnabled = true;
        await user.save();

        // ✅ Generate QR Code
        QRCode.toDataURL(secret.otpauth_url, (err, qrCodeUrl) => {
            if (err) return res.status(500).json({ message: MESSAGES.ERROR.QR_CODE_GENERATION_FAILED });

            res.status(200).json({
                message: MESSAGES.SUCCESS.TWO_FA_ENABLED,
                qrCodeUrl, // Google Authenticator QR Code
                secret: secret.base32, // Backup Secret Key
            });
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



const requestOTP = async (req, res) => {
    try {
        const { companyCode, UserName, Pass } = req.body;
  


        // Step 1: Check in Master Database
        let user = await Master.findOne({ companyCode, UserName });

        let userMobile, userEmail;

        // If not found in Master, check in the company's UserSchema
        if (!user) {
            const companyDB = mongoose.connection.useDb(companyCode);
            const UserModel = companyDB.models.User || companyDB.model("User", userSchema);
            user = await UserModel.findOne({ UserName });

            if (!user) return res.status(401).json({ message: MESSAGES.ERROR.USERNAME_COMPANY_CODE_REQUIRED });

            // Verify Password from UserSchema
            if (user.Password !== Pass) return res.status(401).json({ message: MESSAGES.ERROR.PASSWORD_INCORRECT });

            userMobile = user.MobileNumber;
            userEmail = user.Email;
        } else {
            // Verify Password from Master
            if (user.Pass !== Pass) return res.status(401).json({ message: MESSAGES.ERROR.PASSWORD_INCORRECT });

            userMobile = user.UserMobile;
            userEmail = user.UserEmail;
        }

        let otpCode;
        let otpMethod;

        if (user.twoFAEnabled === true) {
            // ✅ Generate OTP from Google Authenticator
            otpCode = speakeasy.totp({
                secret: user.twoFASecret,
                encoding: "base32",
            });
            otpMethod = "Google Authenticator";
        } else {
            otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            console.log("OTP Code:", otpCode);

            // Send OTP via WhatsApp using MobileNumber
            const otpSent = await sendOTP(userMobile, otpCode);
            if (!otpSent) return res.status(500).json({ message: "Failed to send OTP" });
        }

        // Store OTP in temporary storage for validation
        otpStorage.set(userMobile, otpCode);
        otpStorage.set(userEmail, otpCode);

        res.status(200).json({
            message: `OTP sent via ${otpMethod || "WhatsApp"}`,
            step: "verify",
            otpMethod
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// 🔹 Step 2: Verify OTP and Login
const login = async (req, res) => {
    try {
        const { companyCode, UserName, otp } = req.body;

        // Step 1: Check in Master Database
        let user = await Master.findOne({ companyCode, UserName });
        let userMobile;
        let UserGroup;

        // If not found in Master, check in the company's database
        if (!user) {
            const companyDB = mongoose.connection.useDb(companyCode);
            const UserModel = companyDB.models.User || companyDB.model("User", userSchema);
            user = await UserModel.findOne({ UserName });

            if (!user) return res.status(401).json({ message: MESSAGES.ERROR.USERNAME_COMPANY_CODE_REQUIRED });
            UserGroup = user.UserGroup
            userMobile = user.MobileNumber; // Correct field for UserSchema users
        } else {
            userMobile = user.UserMobile; // Correct field for Master users
            UserGroup = user.UserGroup // Correct field for Master users
        }

        // Step 2: Verify OTP using the correct mobile number
        const storedOtp = otpStorage.get(userMobile);
        if (!otp || otp !== storedOtp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // OTP verified, remove it from storage
        otpStorage.delete(userMobile);

        // Step 3: Generate JWT token
        const token = jwt.sign(
            { id: user._id, UserName, companyCode },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.status(200).json({ message: "Login successful", token, UserName, companyCode, UserGroup });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const otpStore = {};

// Forgot Password (Send OTP)
const forgetPassword = async (req, res) => {
    try {
        const { UserEmail, CompanyCode } = req.body;

        const user = await Master.findOne({ UserEmail, companyCode: CompanyCode });

        if (!user) {
            return res.status(404).json({ message: MESSAGES.ERROR.USERNAME_COMPANY_CODE_REQUIRED });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 10 * 60 * 1000;

        otpStore[UserEmail] = { otp, otpExpiry };

        await sendEmail(UserEmail, `Your OTP Code: ${otp}`);

        res.status(200).json({ message: MESSAGES.SUCCESS.OTP_SENT_TO_EMAIL, step: "verify" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Verify OTP and Change Password
const verifyOtpAndChangePassword = async (req, res) => {
    try {
        const { UserEmail, otp, newPassword } = req.body;

        if (!otpStore[UserEmail]) {
            return res.status(400).json({ message: MESSAGES.ERROR.OTP_EXPIRED });
        }

        const { otp: storedOtp, otpExpiry } = otpStore[UserEmail];

        if (storedOtp.toString() !== otp.toString()) {
            return res.status(400).json({ message: MESSAGES.ERROR.OTP_INVALID });
        }

        if (Date.now() > otpExpiry) {
            return res.status(400).json({ message: MESSAGES.ERROR.OTP_EXPIRED });
        }

        const user = await Master.findOne({ UserEmail });

        if (!user) {
            return res.status(404).json({ message: MESSAGES.ERROR.USER_NOT_FOUND });
        }

        const hashedPassword = newPassword;
        user.Pass = hashedPassword;

        await user.save();

        delete otpStore[UserEmail];

        res.status(200).json({ message: MESSAGES.SUCCESS.PASSWORD_CHANGED });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



export { createInquery, login, forgetPassword, verifyOtpAndChangePassword, requestOTP, requestOTPFor2FA, verifyOTPAndEnable2FA, disable2FA };
