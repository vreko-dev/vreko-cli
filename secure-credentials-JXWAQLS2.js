#!/usr/bin/env node
import { __name } from './chunk-EWOJGXRX.js';
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'crypto';
import { existsSync, readFileSync, mkdirSync, writeFileSync, chmodSync } from 'fs';
import { unlink, readFile, mkdir, writeFile } from 'fs/promises';
import { homedir, hostname, platform, userInfo } from 'os';
import { join, dirname } from 'path';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';
var SERVICE_NAME = "vreko-cli";
var ACCOUNT_NAME = "default";
var ENCRYPTION_ALGORITHM = "aes-256-gcm";
var KEY_LENGTH = 32;
var IV_LENGTH = 12;
var AUTH_TAG_LENGTH = 16;
var SALT_LENGTH = 32;
var GLOBAL_DIR = join(homedir(), ".vreko");
var CREDENTIALS_FILE = join(GLOBAL_DIR, "credentials.json");
var ENCRYPTED_CREDENTIALS_FILE = join(GLOBAL_DIR, "credentials.enc");
var PER_INSTALL_SECRET_FILE = join(GLOBAL_DIR, ".cred-key");
var PER_INSTALL_SECRET_LENGTH = 32;
async function createKeytarProvider() {
  try {
    const keytar = await import('keytar');
    return {
      name: "keytar",
      async isAvailable() {
        try {
          await keytar.getPassword("__vreko_test__", "__test__");
          return true;
        } catch {
          return false;
        }
      },
      async getPassword(service, account) {
        return keytar.getPassword(service, account);
      },
      async setPassword(service, account, password) {
        await keytar.setPassword(service, account, password);
      },
      async deletePassword(service, account) {
        return keytar.deletePassword(service, account);
      }
    };
  } catch {
    return null;
  }
}
__name(createKeytarProvider, "createKeytarProvider");
function getOrCreatePerInstallSecret() {
  try {
    if (existsSync(PER_INSTALL_SECRET_FILE)) {
      const existing = readFileSync(PER_INSTALL_SECRET_FILE);
      if (existing.length >= PER_INSTALL_SECRET_LENGTH) {
        return existing;
      }
    }
  } catch {
  }
  const secret = randomBytes(PER_INSTALL_SECRET_LENGTH);
  mkdirSync(dirname(PER_INSTALL_SECRET_FILE), {
    recursive: true
  });
  writeFileSync(PER_INSTALL_SECRET_FILE, secret, {
    mode: 384
  });
  try {
    chmodSync(PER_INSTALL_SECRET_FILE, 384);
  } catch {
  }
  return secret;
}
__name(getOrCreatePerInstallSecret, "getOrCreatePerInstallSecret");
function machineDataString() {
  return [
    hostname(),
    platform(),
    userInfo().username,
    homedir(),
    // Add some entropy from process info
    process.arch,
    process.platform
  ].join("|");
}
__name(machineDataString, "machineDataString");
function deriveKeyFromSecret(salt, perInstallSecret) {
  const keyMaterial = Buffer.concat([
    Buffer.from(machineDataString(), "utf8"),
    Buffer.from("|", "utf8"),
    perInstallSecret
  ]);
  return scryptSync(keyMaterial, salt, KEY_LENGTH);
}
__name(deriveKeyFromSecret, "deriveKeyFromSecret");
function deriveMachineKey(salt) {
  return deriveKeyFromSecret(salt, getOrCreatePerInstallSecret());
}
__name(deriveMachineKey, "deriveMachineKey");
function encryptCredentials(credentials, salt) {
  const key = deriveMachineKey(salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const plaintext = JSON.stringify(credentials);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([
    salt,
    iv,
    authTag,
    encrypted
  ]);
}
__name(encryptCredentials, "encryptCredentials");
function decryptCredentials(data) {
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const key = deriveMachineKey(salt);
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  return JSON.parse(decrypted.toString("utf8"));
}
__name(decryptCredentials, "decryptCredentials");
function createEncryptedFileProvider() {
  return {
    name: "encrypted-file",
    async isAvailable() {
      return true;
    },
    async getPassword(_service, _account) {
      try {
        const data = await readFile(ENCRYPTED_CREDENTIALS_FILE);
        const credentials = decryptCredentials(data);
        return JSON.stringify(credentials);
      } catch {
        return null;
      }
    },
    async setPassword(_service, _account, password) {
      const credentials = JSON.parse(password);
      const salt = randomBytes(SALT_LENGTH);
      const encrypted = encryptCredentials(credentials, salt);
      await mkdir(dirname(ENCRYPTED_CREDENTIALS_FILE), {
        recursive: true
      });
      await writeFile(ENCRYPTED_CREDENTIALS_FILE, encrypted);
    },
    async deletePassword(_service, _account) {
      try {
        await unlink(ENCRYPTED_CREDENTIALS_FILE);
        return true;
      } catch {
        return false;
      }
    }
  };
}
__name(createEncryptedFileProvider, "createEncryptedFileProvider");
var SecureCredentialsManager = class SecureCredentialsManager2 {
  static {
    __name(this, "SecureCredentialsManager");
  }
  provider = null;
  initialized = false;
  /**
  * Initialize the credentials manager
  * Selects the best available provider
  */
  async initialize() {
    if (this.initialized) {
      return;
    }
    const keytarProvider = await createKeytarProvider();
    if (keytarProvider && await keytarProvider.isAvailable()) {
      this.provider = keytarProvider;
      this.initialized = true;
      return;
    }
    this.provider = createEncryptedFileProvider();
    this.initialized = true;
  }
  /**
  * Get the name of the active provider
  */
  getProviderName() {
    return this.provider?.name ?? "none";
  }
  /**
  * Get stored credentials
  */
  async getCredentials() {
    await this.initialize();
    if (!this.provider) {
      return null;
    }
    const stored = await this.provider.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    if (!stored) {
      const legacy = await this.getLegacyCredentials();
      if (legacy) {
        await this.setCredentials(legacy);
        try {
          await unlink(CREDENTIALS_FILE);
        } catch {
        }
        return legacy;
      }
      return null;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  /**
  * Get legacy plain-text credentials for migration
  */
  async getLegacyCredentials() {
    try {
      const content = await readFile(CREDENTIALS_FILE, "utf8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  /**
  * Save credentials securely
  */
  async setCredentials(credentials) {
    await this.initialize();
    if (!this.provider) {
      throw new Error("No credentials provider available");
    }
    await this.provider.setPassword(SERVICE_NAME, ACCOUNT_NAME, JSON.stringify(credentials));
  }
  /**
  * Clear stored credentials
  */
  async clearCredentials() {
    await this.initialize();
    if (!this.provider) {
      return;
    }
    await this.provider.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    try {
      await unlink(CREDENTIALS_FILE);
    } catch {
    }
    try {
      await unlink(ENCRYPTED_CREDENTIALS_FILE);
    } catch {
    }
  }
  /**
  * Check if user is logged in
  */
  async isLoggedIn() {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      return false;
    }
    if (credentials.expiresAt) {
      const expiresAt = new Date(credentials.expiresAt);
      if (expiresAt < /* @__PURE__ */ new Date()) {
        return false;
      }
    }
    return true;
  }
};
var secureCredentialsManager = null;
function getSecureCredentials() {
  if (!secureCredentialsManager) {
    secureCredentialsManager = new SecureCredentialsManager();
  }
  return secureCredentialsManager;
}
__name(getSecureCredentials, "getSecureCredentials");
async function getCredentialsSecure() {
  return getSecureCredentials().getCredentials();
}
__name(getCredentialsSecure, "getCredentialsSecure");
async function saveCredentialsSecure(credentials) {
  return getSecureCredentials().setCredentials(credentials);
}
__name(saveCredentialsSecure, "saveCredentialsSecure");
async function clearCredentialsSecure() {
  return getSecureCredentials().clearCredentials();
}
__name(clearCredentialsSecure, "clearCredentialsSecure");
async function isLoggedInSecure() {
  return getSecureCredentials().isLoggedIn();
}
__name(isLoggedInSecure, "isLoggedInSecure");

export { SecureCredentialsManager, clearCredentialsSecure, deriveKeyFromSecret, getCredentialsSecure, getSecureCredentials, isLoggedInSecure, saveCredentialsSecure };
//# sourceMappingURL=secure-credentials-JXWAQLS2.js.map
//# sourceMappingURL=secure-credentials-JXWAQLS2.js.map