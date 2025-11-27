import { randomBytes, createHash } from 'crypto';

/**
 * Authentication token
 */
export interface AuthToken {
  token: string;
  createdAt: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

/**
 * API key definition
 */
export interface ApiKey {
  key: string;
  hashedKey: string;
  name: string;
  createdAt: Date;
  enabled: boolean;
  metadata?: Record<string, any>;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  enabled: boolean;
  tokenExpirationMs?: number; // Default: 1 hour
  requireApiKey?: boolean;
}

/**
 * Manages authentication for MCP connections
 * Provides token-based authentication and API key validation
 */
export class AuthManager {
  private tokens = new Map<string, AuthToken>();
  private apiKeys = new Map<string, ApiKey>();
  private config: AuthConfig;

  constructor(config: AuthConfig = { enabled: false }) {
    this.config = {
      tokenExpirationMs: 60 * 60 * 1000, // 1 hour default
      ...config,
    };
  }

  /**
   * Generate a new authentication token
   * @param metadata Optional metadata to associate with the token
   * @returns The generated token
   */
  generateToken(metadata?: Record<string, any>): AuthToken {
    const token = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + (this.config.tokenExpirationMs || 60 * 60 * 1000),
    );

    const authToken: AuthToken = {
      token,
      createdAt: now,
      expiresAt,
      metadata,
    };

    this.tokens.set(token, authToken);
    return authToken;
  }

  /**
   * Validate an authentication token
   * @param token The token to validate
   * @returns True if the token is valid and not expired
   */
  validateToken(token: string): boolean {
    if (!this.config.enabled) {
      return true; // Authentication disabled
    }

    const authToken = this.tokens.get(token);
    if (!authToken) {
      return false;
    }

    // Check if token is expired
    if (new Date() > authToken.expiresAt) {
      this.tokens.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Revoke an authentication token
   * @param token The token to revoke
   * @returns True if the token was found and revoked
   */
  revokeToken(token: string): boolean {
    return this.tokens.delete(token);
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, authToken] of this.tokens.entries()) {
      if (now > authToken.expiresAt) {
        this.tokens.delete(token);
      }
    }
  }

  /**
   * Create an API key
   * @param name Name for the API key
   * @param metadata Optional metadata to associate with the key
   * @returns The created API key (with the unhashed key)
   */
  createApiKey(name: string, metadata?: Record<string, any>): ApiKey {
    const key = randomBytes(32).toString('hex');
    const hashedKey = this.hashApiKey(key);

    const apiKey: ApiKey = {
      key, // Return the unhashed key only once
      hashedKey,
      name,
      createdAt: new Date(),
      enabled: true,
      metadata,
    };

    this.apiKeys.set(hashedKey, apiKey);
    return apiKey;
  }

  /**
   * Validate an API key
   * @param key The API key to validate
   * @returns True if the key is valid and enabled
   */
  validateApiKey(key: string): boolean {
    if (!this.config.enabled || !this.config.requireApiKey) {
      return true; // API key validation disabled
    }

    const hashedKey = this.hashApiKey(key);
    const apiKey = this.apiKeys.get(hashedKey);

    if (!apiKey) {
      return false;
    }

    return apiKey.enabled;
  }

  /**
   * Revoke an API key
   * @param key The API key to revoke
   * @returns True if the key was found and revoked
   */
  revokeApiKey(key: string): boolean {
    const hashedKey = this.hashApiKey(key);
    const apiKey = this.apiKeys.get(hashedKey);

    if (!apiKey) {
      return false;
    }

    apiKey.enabled = false;
    return true;
  }

  /**
   * Delete an API key
   * @param key The API key to delete
   * @returns True if the key was found and deleted
   */
  deleteApiKey(key: string): boolean {
    const hashedKey = this.hashApiKey(key);
    return this.apiKeys.delete(hashedKey);
  }

  /**
   * Get all API keys (without the actual key values)
   * @returns Array of API keys with hashed keys
   */
  getAllApiKeys(): Omit<ApiKey, 'key'>[] {
    return Array.from(this.apiKeys.values()).map(({ key, ...rest }) => rest);
  }

  /**
   * Hash an API key for secure storage
   * @param key The API key to hash
   * @returns The hashed key
   */
  private hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Check if authentication is enabled
   * @returns True if authentication is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if API key validation is required
   * @returns True if API key validation is required
   */
  requiresApiKey(): boolean {
    return this.config.enabled && (this.config.requireApiKey || false);
  }

  /**
   * Get the number of active tokens
   * @returns The number of active tokens
   */
  getActiveTokenCount(): number {
    this.cleanupExpiredTokens();
    return this.tokens.size;
  }

  /**
   * Get the number of API keys
   * @returns The number of API keys
   */
  getApiKeyCount(): number {
    return this.apiKeys.size;
  }

  /**
   * Clear all tokens and API keys
   */
  clear(): void {
    this.tokens.clear();
    this.apiKeys.clear();
  }
}
