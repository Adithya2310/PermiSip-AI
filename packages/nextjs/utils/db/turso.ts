/**
 * Turso Database Client
 *
 * Uses @libsql/client to connect to Turso (libSQL) database
 * Environment variables:
 * - NEXT_PUBLIC_TURSO_DB_URL: The database URL
 * - NEXT_PUBLIC_TURSO_DB_ACCESS_KEY: The authentication token
 */
import { Client, createClient } from "@libsql/client";

// Lazy-initialize the Turso client to avoid errors during build
let _tursoClient: Client | null = null;

function getTursoClient(): Client | null {
  if (_tursoClient) return _tursoClient;

  const url = process.env.NEXT_PUBLIC_TURSO_DB_URL;
  const authToken = process.env.NEXT_PUBLIC_TURSO_DB_ACCESS_KEY;

  if (!url || !authToken) {
    console.log("Turso not configured - missing NEXT_PUBLIC_TURSO_DB_URL or NEXT_PUBLIC_TURSO_DB_ACCESS_KEY");
    return null;
  }

  try {
    _tursoClient = createClient({
      url,
      authToken,
    });
    return _tursoClient;
  } catch (error) {
    console.error("Failed to create Turso client:", error);
    return null;
  }
}

// Export a getter for the turso client
export const turso = {
  async execute(query: { sql: string; args?: any[] } | string) {
    const client = getTursoClient();
    if (!client) {
      throw new Error("Turso database not configured");
    }
    return client.execute(query);
  },
};

// Initialize database tables if they don't exist
export async function initializeDatabase() {
  const client = getTursoClient();
  if (!client) {
    console.log("Skipping database initialization - Turso not configured");
    return false;
  }

  try {
    // Create SIP plans table (users can have multiple SIPs)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS sip_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_address TEXT NOT NULL,
        goal TEXT NOT NULL,
        monthly_amount TEXT NOT NULL,
        risk_level TEXT NOT NULL CHECK(risk_level IN ('low', 'medium', 'high')),
        strategy_aave INTEGER NOT NULL DEFAULT 0,
        strategy_compound INTEGER NOT NULL DEFAULT 0,
        strategy_uniswap INTEGER NOT NULL DEFAULT 0,
        ai_spend_limit TEXT DEFAULT '0',
        rebalancing INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        total_deposited TEXT DEFAULT '0',
        created_at TEXT NOT NULL,
        last_execution TEXT,
        updated_at TEXT NOT NULL
      )
    `);

    // Create index on user_address for faster lookups
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_sip_plans_user_address ON sip_plans(user_address)
    `);

    // Create spend permissions table (for ERC-7715 MetaMask permissions)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS spend_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER,
        user_address TEXT NOT NULL,
        session_account_address TEXT NOT NULL,
        permission_type TEXT NOT NULL DEFAULT 'sip' CHECK(permission_type IN ('sip', 'agent')),
        permission_data TEXT NOT NULL,
        revoked INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (plan_id) REFERENCES sip_plans(id)
      )
    `);

    // Create index on permission_type for faster lookups
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_spend_permissions_type ON spend_permissions(permission_type)
    `);

    // Create executions history table (linked to specific SIP plans)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS sip_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER NOT NULL,
        user_address TEXT NOT NULL,
        amount TEXT NOT NULL,
        tx_hash TEXT,
        status TEXT NOT NULL CHECK(status IN ('pending', 'success', 'failed')),
        error_message TEXT,
        executed_at TEXT NOT NULL,
        FOREIGN KEY (plan_id) REFERENCES sip_plans(id)
      )
    `);

    // Create sessions table for ERC-7715 session accounts
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_address TEXT NOT NULL UNIQUE,
        session_account_address TEXT NOT NULL,
        session_private_key TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    console.log("Database tables initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    return false;
  }
}

// Helper function to check if database is configured
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURSO_DB_URL && process.env.NEXT_PUBLIC_TURSO_DB_ACCESS_KEY);
}
