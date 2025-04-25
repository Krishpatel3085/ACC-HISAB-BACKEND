import { sendEmail } from './sendEmail.js';
import { OTP_DATA } from './mailTemp.js';

// In-memory OTP store with expiration
const otpStore = {}; // { [email]: { otp, expiresAt } }

// Generate random 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP
const SendOtp = async (req, res) => {
    try {
        const to = req.body.email;
        if (!to) return res.status(400).json({ msg: "Email is required" });

        const otp = generateOTP();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

        otpStore[to] = { otp, expiresAt };

        const subject = OTP_DATA.OTP_SUBJECT;
        const msg = OTP_DATA.OTP_TEXT;
        const html = `${OTP_DATA.OTP_HTML_1}${otp}${OTP_DATA.OTP_HTML_2}`;

        await sendEmail(to, subject, msg, html);
        res.status(200).json({ msg: "OTP sent successfully" });
    } catch (error) {
        console.error("SendOtp error:", error);
        res.status(500).json({ msg: "Failed to send OTP" });
    }
};

// Verify OTP
const VerifyOtp = (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ msg: "Email and OTP are required" });

    const record = otpStore[email];
    if (!record) return res.status(400).json({ msg: "No OTP found for this email" });

    const isExpired = Date.now() > record.expiresAt;
    if (isExpired) {
        delete otpStore[email];
        return res.status(400).json({ msg: "OTP expired" });
    }

    if (record.otp !== otp.toString()) {
        return res.status(400).json({ msg: "Invalid OTP" });
    }

    delete otpStore[email]; // Remove OTP on successful verification
    res.status(200).json({ msg: "OTP verified successfully" });
};

export { SendOtp, VerifyOtp };
