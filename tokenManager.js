const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const keytar = require('keytar');

class TokenManager {
  constructor(userDataPath) {
    if (!userDataPath) {
      throw new Error('TokenManager requires userDataPath parameter');
    }
    this.tokenFile = path.join(userDataPath, 'tokens.json');
    this.serviceName = 'Worthier-Desktop';
    this.keyName = 'encryption-key';
    this.encryptionKey = null; // Will be loaded asynchronously
  }

  async getOrCreateEncryptionKey() {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    try {
      console.log('Attempting to retrieve encryption key from OS keychain...');
      
      // Try to get existing key from OS keychain
      let key = await keytar.getPassword(this.serviceName, this.keyName);
      
      if (!key) {
        console.log('No existing key found, generating new encryption key...');
        // Generate new key and store in OS keychain
        key = crypto.randomBytes(32).toString('hex');
        await keytar.setPassword(this.serviceName, this.keyName, key);
        console.log('New encryption key stored in OS keychain');
      } else {
        console.log('Encryption key retrieved from OS keychain');
      }
      
      this.encryptionKey = key;
      return key;
    } catch (error) {
      console.error('Error accessing OS keychain:', error);
      throw new Error('Failed to access secure key storage. Please ensure your system keychain is available.');
    }
  }

  async encrypt(text) {
    const key = await this.getOrCreateEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  async decrypt(encryptedText) {
    const key = await this.getOrCreateEncryptionKey();
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Store tokens after successful login (single profile only)
  async storeTokens(tokenData) {
    try {
      const profileData = {
        ...tokenData,
      };

      const encryptedTokens = await this.encrypt(JSON.stringify(profileData));
      fs.writeFileSync(this.tokenFile, encryptedTokens);
      console.log('Profile stored securely');
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  }

  // Get stored profile (single profile only)
  async getTokens() {
    try {
      if (!fs.existsSync(this.tokenFile)) {
        return null;
      }

      const encryptedData = fs.readFileSync(this.tokenFile, 'utf8');
      const profileData = JSON.parse(await this.decrypt(encryptedData));

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

  // Clear encryption key from keychain (for complete reset)
  async clearEncryptionKey() {
    try {
      await keytar.deletePassword(this.serviceName, this.keyName);
      this.encryptionKey = null;
      console.log('Encryption key cleared from OS keychain');
    } catch (error) {
      console.error('Error clearing encryption key:', error);
    }
  }
}

module.exports = TokenManager;
