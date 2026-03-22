import crypto from 'crypto';

// Use a encryption key from environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-encryption-key-min-32-chars!!';

// Ensure key is 32 bytes for AES-256
const getKey = () => {
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  return key;
};

export const encryptionUtils = {
  /**
   * Encrypt sensitive data (tokens, API keys, etc.)
   */
  encrypt: (text: string): string => {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
      
      let encrypted = cipher.update(text, 'utf-8', 'hex');
      encrypted += cipher.final('hex');
      
      // Return IV + encrypted data, separated by ':'
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  },

  /**
   * Decrypt sensitive data
   */
  decrypt: (encrypted: string): string => {
    try {
      const [ivHex, encryptedData] = encrypted.split(':');
      
      if (!ivHex || !encryptedData) {
        throw new Error('Invalid encrypted format');
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  },

  /**
   * Encrypt credential object (selectively encrypt sensitive fields)
   */
  encryptCredentials: (credentials: Record<string, any>): Record<string, any> => {
    const sensitiveFields = ['apiKey', 'clientSecret', 'accessToken', 'privateKey', 'password'];
    const encrypted = { ...credentials };
    
    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        encrypted[field] = encryptionUtils.encrypt(encrypted[field]);
      }
    }
    
    return encrypted;
  },

  /**
   * Decrypt credential object
   */
  decryptCredentials: (credentials: Record<string, any>): Record<string, any> => {
    const sensitiveFields = ['apiKey', 'clientSecret', 'accessToken', 'privateKey', 'password'];
    const decrypted = { ...credentials };
    
    for (const field of sensitiveFields) {
      if (decrypted[field] && typeof decrypted[field] === 'string' && decrypted[field].includes(':')) {
        try {
          decrypted[field] = encryptionUtils.decrypt(decrypted[field]);
        } catch {
          // If decryption fails, keep original value
          console.warn(`Failed to decrypt field: ${field}`);
        }
      }
    }
    
    return decrypted;
  },
};
