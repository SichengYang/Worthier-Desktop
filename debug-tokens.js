const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const keytar = require('keytar');
const os = require('os');

class DebugTokenManager {
  constructor() {
    // Use the same path as Electron app would use
    const userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'worthier-desktop');
    this.tokenFile = path.join(userDataPath, 'tokens.json');
    this.serviceName = 'Worthier-Desktop';
    this.keyName = 'encryption-key';
    this.encryptionKey = null;
  }

  async getOrCreateEncryptionKey() {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    try {
      console.log('Attempting to retrieve encryption key from OS keychain...');
      
      let key = await keytar.getPassword(this.serviceName, this.keyName);
      
      if (!key) {
        console.log('No existing key found');
        return null;
      } else {
        console.log('Encryption key retrieved from OS keychain');
      }
      
      this.encryptionKey = key;
      return key;
    } catch (error) {
      console.error('Error accessing OS keychain:', error);
      return null;
    }
  }

  async decrypt(encryptedText) {
    const key = await this.getOrCreateEncryptionKey();
    if (!key) return null;
    
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

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
}

async function checkStoredTokens() {
    const tokenManager = new DebugTokenManager();
    
    try {
        const tokens = await tokenManager.getTokens();
        if (tokens) {
            console.log('Stored token data:');
            console.log('- User:', tokens.user);
            console.log('- Has access_token:', !!tokens.access_token);
            console.log('- Has refresh_token:', !!tokens.refresh_token);
            console.log('- Access token (first 50 chars):', tokens.access_token?.substring(0, 50) + '...');
            if (tokens.refresh_token) {
                console.log('- Refresh token (first 50 chars):', tokens.refresh_token.substring(0, 50) + '...');
            } else {
                console.log('- Refresh token: Not available');
            }
        } else {
            console.log('No stored tokens found');
        }
    } catch (error) {
        console.error('Error checking tokens:', error);
    }
}

checkStoredTokens();
