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

  // Store tokens after successful login
  storeTokens(provider, tokenData) {
    let tokens = {};
    try {
      if (fs.existsSync(this.tokenFile)) {
        const encryptedData = fs.readFileSync(this.tokenFile, 'utf8');
        tokens = JSON.parse(this.decrypt(encryptedData));
      }
    } catch (error) {
      console.log('No existing tokens found or error reading tokens');
    }

    tokens[provider] = {
      ...tokenData,
      timestamp: Date.now()
    };

    const encryptedTokens = this.encrypt(JSON.stringify(tokens));
    fs.writeFileSync(this.tokenFile, encryptedTokens);
    console.log(`Tokens stored for ${provider}`);
  }

  // Get stored tokens
  getTokens(provider = null) {
    try {
      if (!fs.existsSync(this.tokenFile)) {
        return null;
      }

      const encryptedData = fs.readFileSync(this.tokenFile, 'utf8');
      const tokens = JSON.parse(this.decrypt(encryptedData));

      if (provider) {
        // Check both capitalized and lowercase versions
        const variations = [provider, provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase()];
        for (const variation of variations) {
          if (tokens[variation]) {
            return tokens[variation];
          }
        }
        return null;
      }
      return tokens;
    } catch (error) {
      console.error('Error reading tokens:', error);
      return null;
    }
  }

  // Check if tokens are expired (1 hour = 3600000ms)
  isTokenExpired(tokenData, expiryTime = 3600000) {
    if (!tokenData || !tokenData.timestamp) {
      return true;
    }
    return (Date.now() - tokenData.timestamp) > expiryTime;
  }

  // Remove tokens for a provider
  clearTokens(provider = null) {
    try {
      if (provider) {
        const tokens = this.getTokens();
        if (tokens && tokens[provider]) {
          delete tokens[provider];
          const encryptedTokens = this.encrypt(JSON.stringify(tokens));
          fs.writeFileSync(this.tokenFile, encryptedTokens);
        }
      } else {
        // Clear all tokens
        if (fs.existsSync(this.tokenFile)) {
          fs.unlinkSync(this.tokenFile);
        }
      }
      console.log(`Tokens cleared for ${provider || 'all providers'}`);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // Check which providers have valid tokens
  getValidProviders() {
    const allTokens = this.getTokens();
    const validProviders = [];

    if (allTokens) {
      // Check both capitalized and lowercase versions of provider names
      const providerVariations = {
        'microsoft': ['microsoft', 'Microsoft'],
        'google': ['google', 'Google'], 
        'apple': ['apple', 'Apple']
      };

      Object.keys(providerVariations).forEach(baseProvider => {
        const variations = providerVariations[baseProvider];
        let foundTokens = null;
        
        // Check all variations for this provider
        for (const variation of variations) {
          if (allTokens[variation]) {
            foundTokens = allTokens[variation];
            break;
          }
        }

        if (foundTokens && !this.isTokenExpired(foundTokens)) {
          validProviders.push(baseProvider); // Always return lowercase for consistency
        }
      });
    }

    return validProviders;
  }
}

module.exports = TokenManager;
