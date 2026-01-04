"use client";

import { useCallback, useState } from "react";
import { RequestExecutionPermissionsReturnType, erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import { parseUnits } from "viem";
import { useAccount, useWalletClient } from "wagmi";

// Permission types for the dual permission flow
export type PermissionType = "agent" | "sip";

// USDC address on Ethereum Sepolia
const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

export const usePermissions = () => {
  const [grantedPermissions, setGrantedPermissions] = useState<RequestExecutionPermissionsReturnType | null>(null);
  const [agentPermission, setAgentPermission] = useState<RequestExecutionPermissionsReturnType | null>(null);
  const [sipPermission, setSipPermission] = useState<RequestExecutionPermissionsReturnType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [sessionAccountAddress, setSessionAccountAddress] = useState<string | null>(null);

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Step 1: Create session account on backend
  const createSession = useCallback(async () => {
    if (!address) {
      setError("Wallet not connected");
      return null;
    }

    try {
      const response = await fetch("/api/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create session");
      }

      setSessionAccountAddress(data.sessionAccountAddress);
      return data.sessionAccountAddress;
    } catch (err: any) {
      setError(err.message || "Failed to create session");
      console.error("Session creation error:", err);
      return null;
    }
  }, [address]);

  // Request Agent Permission (ETH - native-token-periodic)
  const requestAgentPermission = useCallback(
    async ({
      periodAmount,
      periodDuration,
      expiry,
    }: {
      periodAmount: bigint;
      periodDuration: number;
      expiry: number;
    }) => {
      if (!address) {
        setError("Wallet not connected");
        return null;
      }

      if (!walletClient) {
        setError("Wallet client not ready");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        // First, create or get session account from backend
        let sessionAddr = sessionAccountAddress;
        if (!sessionAddr) {
          sessionAddr = await createSession();
          if (!sessionAddr) {
            throw new Error("Failed to create session account");
          }
        }

        // Extend wallet client with ERC-7715 actions
        const client = walletClient.extend(erc7715ProviderActions());
        const currentTime = Math.floor(Date.now() / 1000);

        console.log("Requesting Agent (ETH) permission with:", {
          chainId: walletClient.chain.id,
          expiry,
          periodAmount: periodAmount.toString(),
          periodDuration,
        });

        // Request native token (ETH) permission
        const permission = await client.requestExecutionPermissions([
          {
            chainId: walletClient.chain.id as 11155111,
            expiry,
            signer: {
              type: "account",
              data: {
                address: sessionAddr as `0x${string}`,
              },
            },
            isAdjustmentAllowed: true,
            permission: {
              type: "native-token-periodic",
              data: {
                periodAmount: periodAmount,
                periodDuration: periodDuration,
                justification: `Agent permission: ${Number(periodAmount) / 1e18} ETH per period for AI services`,
                startTime: currentTime,
              },
            },
          },
        ]);

        console.log("✅ Agent (ETH) permission granted from wallet, now storing...", permission);

        setAgentPermission(permission);
        setGrantedPermissions(permission);

        // Store agent permission on backend
        await fetch("/api/permissions/store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userAddress: address,
            permissions: permission,
            sessionAccountAddress: sessionAddr,
            permissionType: "agent",
          }),
        });

        console.log("✅ Agent (ETH) permission granted successfully");
        return permission;
      } catch (err: any) {
        setError(err.message || "Failed to request agent permission");
        console.error("Agent permission request error:", err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sessionAccountAddress, walletClient, createSession],
  );

  // Request SIP Permission (USDC - erc20-token-periodic)
  const requestSIPPermission = useCallback(
    async ({
      periodAmount,
      periodDuration,
      expiry,
    }: {
      periodAmount: string; // USDC amount as string (e.g., "10" for 10 USDC)
      periodDuration: number;
      expiry: number;
    }) => {
      if (!address) {
        setError("Wallet not connected");
        return null;
      }

      if (!walletClient) {
        setError("Wallet client not ready");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Get or reuse session account
        let sessionAddr = sessionAccountAddress;
        if (!sessionAddr) {
          sessionAddr = await createSession();
          if (!sessionAddr) {
            throw new Error("Failed to create session account");
          }
        }

        // Extend wallet client with ERC-7715 actions
        const client = walletClient.extend(erc7715ProviderActions());

        // Parse USDC amount (6 decimals)
        const usdcAmount = parseUnits(periodAmount, 6);

        console.log("Requesting SIP (USDC) permission with:", {
          chainId: walletClient.chain.id,
          expiry,
          periodAmount: usdcAmount.toString(),
          periodDuration,
          tokenAddress: USDC_SEPOLIA,
        });

        // Request ERC-20 token (USDC) permission
        const permission = await client.requestExecutionPermissions([
          {
            chainId: walletClient.chain.id as 11155111,
            expiry,
            signer: {
              type: "account",
              data: {
                address: sessionAddr as `0x${string}`,
              },
            },
            isAdjustmentAllowed: true,
            permission: {
              type: "erc20-token-periodic",
              data: {
                tokenAddress: USDC_SEPOLIA,
                periodAmount: usdcAmount,
                periodDuration: periodDuration,
                justification: `SIP permission: ${periodAmount} USDC per period for automated investments`,
              },
            },
          },
        ]);

        setSipPermission(permission);
        setGrantedPermissions(permission);

        // Store SIP permission on backend
        await fetch("/api/permissions/store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userAddress: address,
            permissions: permission,
            sessionAccountAddress: sessionAddr,
            permissionType: "sip",
          }),
        });

        console.log("✅ SIP (USDC) permission granted successfully");
        return permission;
      } catch (err: any) {
        setError(err.message || "Failed to request SIP permission");
        console.error("SIP permission request error:", err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [address, sessionAccountAddress, walletClient, createSession],
  );

  // Legacy: Request permission (native ETH) - kept for backward compatibility
  const requestPermission = useCallback(
    async ({
      periodAmount,
      periodDuration,
      expiry,
    }: {
      periodAmount: bigint;
      periodDuration: number;
      expiry: number;
    }) => {
      return requestAgentPermission({ periodAmount, periodDuration, expiry });
    },
    [requestAgentPermission],
  );

  // Step 3: Redeem permission (server-side execution)
  const redeemPermission = useCallback(
    async (amount?: string, recipient?: string, permissionType?: PermissionType) => {
      if (!address) {
        setError("Wallet not connected");
        return;
      }

      setIsLoading(true);
      setError(null);
      setTxHash(null);

      try {
        const response = await fetch("/api/permissions/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userAddress: address,
            amount,
            recipient,
            permissionType: permissionType || "agent",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to redeem permission");
        }

        setTxHash(data.transactionHash);
        console.log("✅ Permission redeemed successfully:", data.transactionHash);
      } catch (err: any) {
        setError(err.message || "Failed to redeem permission");
        console.error("Permission redeem error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [address],
  );

  return {
    grantedPermissions,
    agentPermission,
    sipPermission,
    isLoading,
    error,
    txHash,
    sessionAccountAddress,
    createSession,
    requestPermission,
    requestAgentPermission,
    requestSIPPermission,
    redeemPermission,
  };
};
