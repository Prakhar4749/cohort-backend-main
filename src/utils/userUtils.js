import crypto from "crypto";

export const generateRandomPassword = () => {
  return crypto.randomBytes(32).toString("base64url");
};
