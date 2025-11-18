import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

// Create OAuth client
export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

// Temporary token storage (no database)
export let SAVED_TOKENS = {};

// Save tokens in memory
export const saveTokens = (tokens) => {
  SAVED_TOKENS = tokens;
  oauth2Client.setCredentials(tokens);
};
