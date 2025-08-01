const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class TokenManager {
  constructor() {
    this.tokenFile = path.join(app.getPath('userData'), 'tokens.json');
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  getOrCreateEncryptionKey() {
    const keyFile = path.join(app.getPath('userData'), 'key.txt');
    try {
      return fs.readFileSync(keyFile, 'utf8');
    } catch (error) {
      const key = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(keyFile, key);
      return key;
    }
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedText) {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Store tokens after successful login (single profile only)
  storeTokens(tokenData) {
    const profileData = {
      ...tokenData,
    };

    const encryptedTokens = this.encrypt(JSON.stringify(profileData));
    fs.writeFileSync(this.tokenFile, encryptedTokens);
    console.log('Profile stored');
  }

  // Get stored profile (single profile only)
  getTokens() {
    try {
      if (!fs.existsSync(this.tokenFile)) {
        return null;
      }

      const encryptedData = fs.readFileSync(this.tokenFile, 'utf8');
      const profileData = JSON.parse(this.decrypt(encryptedData));

      return profileData;
    } catch (error) {
      console.error('Error reading profile:', error);
      return null;
    }
  }

  // Remove tokens (clear profile)
  clearTokens() {
    try {
      // Always clear the entire profile since we only store one
      if (fs.existsSync(this.tokenFile)) {
        fs.unlinkSync(this.tokenFile);
      }
      console.log('Profile cleared');
    } catch (error) {
      console.error('Error clearing profile:', error);
    }
  }
}

module.exports = TokenManager;
