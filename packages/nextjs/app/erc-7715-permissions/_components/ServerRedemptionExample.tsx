"use client";

import { useState } from "react";
import { Button } from "~~/app/erc-7715-permissions/_components/Button";
import { usePermissions } from "~~/app/erc-7715-permissions/hooks/usePermissions";
import { useSessionAccount } from "~~/app/erc-7715-permissions/providers/SessionAccountProvider";

/**
 * Example component demonstrating server-side permission redemption
 * This shows how to execute transactions from the backend without user interaction
 */
export const ServerRedemptionExample = (): React.JSX.Element => {
  const { sessionAccountAddress } = useSessionAccount();
  const { grantedPermissions, isLoading, error, txHash, requestPermission, redeemPermission } = usePermissions();

  const [customAmount, setCustomAmount] = useState("0.0000001");
  const [customRecipient, setCustomRecipient] = useState("");

  const handleRequestPermission = async () => {
    await requestPermission({
      periodAmount: BigInt(100000000000000), // 0.0001 ETH
      periodDuration: 86400, // 1 day
      expiry: Math.floor(Date.now() / 1000) + 7776000, // 90 days
    });
  };

  const handleRedeemWithCustomParams = async () => {
    await redeemPermission(customAmount, customRecipient || undefined);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-6">
      <div className="border-2 border-primary rounded-lg p-6 bg-base-200">
        <h2 className="text-2xl font-bold mb-4">Server-Side Redemption Demo</h2>
        <p className="text-base-content mb-4">
          This demonstrates how permissions are redeemed on the server without requiring user interaction.
        </p>

        {/* Session Info */}
        <div className="bg-base-100 p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-2">Session Account</h3>
          <p className="text-sm font-mono break-all">{sessionAccountAddress || "Loading..."}</p>
          <p className="text-xs text-base-content/70 mt-2">
            This account is generated on the backend and stored securely.
          </p>
        </div>

        {/* Step 1: Request Permission */}
        {!grantedPermissions && (
          <div className="space-y-4">
            <div className="alert alert-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span>Step 1: Request permission from the user (client-side with MetaMask)</span>
            </div>
            <Button disabled={isLoading} onClick={handleRequestPermission}>
              {isLoading ? "Processing..." : "Request Permission"}
            </Button>
          </div>
        )}

        {/* Step 2: Redeem Permission */}
        {grantedPermissions && (
          <div className="space-y-4">
            <div className="alert alert-success">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Permission granted! Now you can execute transactions from the server.</span>
            </div>

            <div className="bg-base-100 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold">Step 2: Redeem Permission (Server-Side)</h3>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Amount (ETH)</span>
                </label>
                <input
                  type="text"
                  placeholder="0.0000001"
                  className="input input-bordered"
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Recipient (optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="0x... (leave empty for self-transfer)"
                  className="input input-bordered"
                  value={customRecipient}
                  onChange={e => setCustomRecipient(e.target.value)}
                />
              </div>

              <Button disabled={isLoading} onClick={handleRedeemWithCustomParams}>
                {isLoading ? "Executing on Server..." : "Execute Transaction (Server-Side)"}
              </Button>

              <div className="text-xs text-base-content/70 space-y-1">
                <p>🔒 This transaction will be executed entirely on the server</p>
                <p>🚀 No MetaMask popup will appear</p>
                <p>⚡ The server uses the stored session account and permission context</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mt-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Transaction Hash */}
        {txHash && (
          <div className="alert alert-success mt-4">
            <div className="flex flex-col gap-2 w-full">
              <span className="font-semibold">✅ Transaction Successful!</span>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary text-sm break-all"
              >
                {txHash}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Architecture Diagram */}
      <div className="border-2 border-base-300 rounded-lg p-6 bg-base-100">
        <h3 className="text-xl font-bold mb-4">How It Works</h3>
        <div className="space-y-4 text-sm">
          <div className="flex gap-4 items-start">
            <div className="badge badge-primary">1</div>
            <div>
              <p className="font-semibold">Client: Request Permission</p>
              <p className="text-base-content/70">User approves permission via MetaMask popup</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="badge badge-secondary">2</div>
            <div>
              <p className="font-semibold">Client: Store Permission</p>
              <p className="text-base-content/70">Permission context sent to backend API</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="badge badge-accent">3</div>
            <div>
              <p className="font-semibold">Server: Redeem Permission</p>
              <p className="text-base-content/70">Backend executes transaction using stored permission</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
