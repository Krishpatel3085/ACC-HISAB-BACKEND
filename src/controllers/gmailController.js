import { oauth2Client, saveTokens, SAVED_TOKENS } from "../config/googleAuth.js";
import { google } from "googleapis";
import base64url from "base64url";

// 1. LOGIN URL
export const googleLogin = (req, res) => {
    const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify", // Needed for Trash/Drafts sometimes
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: scopes,
    });

    res.json({ url });
};

// 2. GOOGLE CALLBACK
export const googleCallback = async (req, res) => {
    try {
        const code = req.query.code;
        const { tokens } = await oauth2Client.getToken(code);
        console.log("TOKENS:", tokens);
        saveTokens(tokens);
        res.send("Gmail Connected Successfully! You can close this tab.");
    } catch (err) {
        console.error(err);
        res.status(500).send("OAuth Error");
    }
};

// 3. GET EMAILS (Dynamic: Inbox, Sent, Drafts, Trash)
export const getEmails = async (req, res) => {
    try {
        // Get category from URL (e.g., /api/google/sent -> category = "sent")
        const { category } = req.params;

        // Map frontend names to Google's Label IDs
        let labelId = "INBOX";
        if (category === "sent") labelId = "SENT";
        if (category === "drafts") labelId = "DRAFT";
        if (category === "trash") labelId = "TRASH";

        oauth2Client.setCredentials({
            access_token: SAVED_TOKENS.access_token,
            refresh_token: SAVED_TOKENS.refresh_token,
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Fetch list based on Label
        const response = await gmail.users.messages.list({
            userId: "me",
            labelIds: [labelId],
            maxResults: 20,
        });

        if (!response.data.messages) return res.json([]);

        // Helper: Decode Base64
        const decodeBase64 = (str) =>
            Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64")
                .toString("utf8");

        // Helper: Extract HTML Body (Priority: HTML > Plain Text)
        const getBody = (payload) => {
            if (!payload) return "";

            // 1. Direct body
            if (payload.body && payload.body.data) {
                return decodeBase64(payload.body.data);
            }

            // 2. Multipart body
            if (payload.parts && payload.parts.length > 0) {
                // Priority A: Look for HTML
                for (const part of payload.parts) {
                    if (part.mimeType === "text/html" && part.body?.data) {
                        return decodeBase64(part.body.data);
                    }
                }
                // Priority B: Look for Plain Text
                for (const part of payload.parts) {
                    if (part.mimeType === "text/plain" && part.body?.data) {
                        return decodeBase64(part.body.data);
                    }
                }
                // Priority C: Recursive (Nested parts)
                for (const part of payload.parts) {
                    const nested = getBody(part);
                    if (nested) return nested;
                }
            }
            return "";
        };

        const emails = await Promise.all(
            response.data.messages.map(async (msg) => {
                const full = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id,
                });

                const payload = full.data.payload;
                const headers = payload.headers || [];

                const findHeader = (name) =>
                    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
                        ?.value || "";

                return {
                    id: msg.id,
                    from: findHeader("From"),
                    to: findHeader("To"),
                    subject: findHeader("Subject"),
                    time: findHeader("Date"),
                    body: getBody(payload),
                };
            })
        );

        res.json(emails);
    } catch (err) {
        console.error("Error loading emails:", err);
        res.status(500).json({ error: "Failed to load emails" });
    }
};

// 4. SEND EMAIL
export const sendEmail = async (req, res) => {
    try {
        if (!SAVED_TOKENS.access_token) {
            return res.status(401).json({ error: "Gmail not connected." });
        }

        oauth2Client.setCredentials(SAVED_TOKENS);
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        const message = [
            `To: ${req.body.to}`,
            `Subject: ${req.body.subject}`,
            "",
            req.body.message, // Note: This sends plain text. For HTML sending, more complex MIME construction is needed.
        ].join("\n");

        const encodedMessage = Buffer.from(message)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        const response = await gmail.users.messages.send({
            userId: "me",
            requestBody: { raw: encodedMessage },
        });

        res.json(response.data);
    } catch (err) {
        console.log("Send Error:", err);
        res.status(500).json({ error: "Failed to send email" });
    }
};