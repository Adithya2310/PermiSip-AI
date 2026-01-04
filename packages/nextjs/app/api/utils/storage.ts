// import { Hex } from "viem";

// Simplified in-memory storage for demo purposes
// Using a singleton pattern to ensure the same instance is used across all API routes

interface PermissionData {
  permissions: any;
  sessionAccountAddress: string;
  permissionType?: "agent" | "sip";
  createdAt: number;
}

// Global storage that persists across API route calls
declare global {
  // eslint-disable-next-line no-var
  var permissionsStore: Map<string, PermissionData> | undefined;
}

// Initialize or reuse existing store
const permissionsStore = globalThis.permissionsStore ?? new Map<string, PermissionData>();

// Ensure the store persists in development (hot reload)
if (process.env.NODE_ENV !== "production") {
  globalThis.permissionsStore = permissionsStore;
}

// Helper functions
export function getPermissionData(userAddress: string): PermissionData | undefined {
  const data = permissionsStore.get(userAddress);
  console.log(`[Storage] Getting permissions for ${userAddress}:`, data ? "Found" : "Not found");
  return data;
}

export function setPermissionData(userAddress: string, data: PermissionData): void {
  permissionsStore.set(userAddress, data);
  console.log(`[Storage] Stored permissions for ${userAddress}`);
  console.log(`[Storage] Total stored permissions: ${permissionsStore.size}`);
}

export function hasPermissions(userAddress: string): boolean {
  return permissionsStore.has(userAddress);
}

export function getAllPermissions(): Map<string, PermissionData> {
  return permissionsStore;
}

export function clearAllPermissions(): void {
  permissionsStore.clear();
  console.log("[Storage] Cleared all permissions");
}
