const { safeStorage } = require("electron");
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const ENC_PREFIX = "VESGEN_ENC_V1::";

/**
 * Encrypts sensitive text using Electron's safeStorage if available,
 * otherwise falls back to AES-256-GCM.
 */
function encrypt(text) {
  if (!text) return "";

  try {
    // Try reliable safeStorage first
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = safeStorage.encryptString(text);
      return ENC_PREFIX + buffer.toString("base64");
    }
  } catch (err) {
    console.error("safeStorage encryption failed, falling back:", err);
  }

  // Fallback to basic crypto (Note: In a real production app, 
  // we would need a proper machine-specific key for this)
  try {
    const iv = crypto.randomBytes(12);
    // Using a fixed-but-not-ideal key for fallback if safeStorage is missing 
    // to at least keep the format consistent. In practice, this would 
    // be derived from system info.
    const key = crypto.scryptSync("VESGEN_FALLBACK_SECRET", "salt", 32); 
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag().toString("base64");
    
    return `${ENC_PREFIX}FALLBACK:${iv.toString("base64")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("Encryption failed entirely:", err);
    return text;
  }
}

/**
 * Decrypts text encrypted with the encrypt() function.
 */
function decrypt(encryptedText) {
  if (!encryptedText || !encryptedText.startsWith(ENC_PREFIX)) {
    return encryptedText;
  }

  const data = encryptedText.replace(ENC_PREFIX, "");

  // Check if it's the fallback format
  if (data.startsWith("FALLBACK:")) {
    try {
      const parts = data.split(":");
      const iv = Buffer.from(parts[1], "base64");
      const authTag = Buffer.from(parts[2], "base64");
      const encrypted = parts[3];
      
      const key = crypto.scryptSync("VESGEN_FALLBACK_SECRET", "salt", 32);
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, "base64", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (err) {
      console.error("Fallback decryption failed:", err);
      return "";
    }
  }

  // standard safeStorage decryption
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(data, "base64");
      return safeStorage.decryptString(buffer);
    }
  } catch (err) {
    console.error("safeStorage decryption failed:", err);
  }

  return "";
}

module.exports = {
  encrypt,
  decrypt
};
