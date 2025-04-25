import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false,
    },
});

export const sendEmail = async (to, subject, msg, html) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text: msg,
            html,
        });
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email");
    }
};
