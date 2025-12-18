"use client";

import { useCallback, useState } from "react";
import { RequestExecutionPermissionsReturnType, erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import { useAccount, useWalletClient } from "wagmi";

export const usePermissions = () => {
  const [grantedPermissions, setGrantedPermissions] = useState<RequestExecutionPermissionsReturnType | null>(null);
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

  // Step 2: Request permission from user (client-side with MetaMask)
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
      if (!address) {
        setError("Wallet not connected");
        return;
      }

      if (!walletClient) {
        setError("Wallet client not ready");
        return;
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

        console.log("Requesting permission with:", {
          chainId: walletClient.chain.id,
          expiry,
          periodAmount,
          periodDuration,
        });

        // Request permission from user via MetaMask
        const permission = await client.requestExecutionPermissions([
          {
            chainId: walletClient.chain.id as 11155111, // Cast to avoid type error if strict, or just number
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
                periodDuration: periodDuration, // seconds
                justification: `Request permission to spend ${Number(periodAmount) / 1e18} ETH per interval for SIP`,
                startTime: currentTime,
              },
            },
          },
        ]);

        setGrantedPermissions(permission);

        // Store permissions on backend
        const storeResponse = await fetch("/api/permissions/store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userAddress: address,
            permissions: permission,
            sessionAccountAddress: sessionAddr,
          }),
        });

        if (!storeResponse.ok) {
          const errorData = await storeResponse.json();
          throw new Error(errorData.error || "Failed to store permissions");
        }

        console.log("✅ Permissions granted and stored successfully");
      } catch (err: any) {
        setError(err.message || "Failed to request permission");
        console.error("Permission request error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [address, sessionAccountAddress, walletClient, createSession],
  );

  // Step 3: Redeem permission (server-side execution)
  const redeemPermission = useCallback(
    async (amount?: string, recipient?: string) => {
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
    isLoading,
    error,
    txHash,
    sessionAccountAddress,
    createSession,
    requestPermission,
    redeemPermission,
  };
};
