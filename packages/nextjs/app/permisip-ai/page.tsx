"use client";

import React from "react";
import { useAccount } from "wagmi";
import { ChatContainer } from "~~/components/chat/ChatContainer";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

export default function PermiSIPChat() {
  const { isConnected, address } = useAccount();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
        style={{ height: "85vh" }}
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold">
                AI
              </div>
              <div>
                <h2 className="font-bold text-gray-900">PermiSIP Assistant</h2>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-xs text-gray-500">Online</span>
                </div>
              </div>
            </div>

            {/* Wallet Connection */}
            <div className="flex items-center gap-4">
              {isConnected && address && (
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-gray-500">Connected</div>
                  <div className="text-sm font-mono text-gray-700">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </div>
                </div>
              )}
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          {isConnected ? (
            <ChatContainer />
          ) : (
            <div className="flex flex-col items-center justify-center h-full px-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Your Wallet</h3>
              <p className="text-gray-500 text-center mb-6 max-w-md">
                Connect your MetaMask wallet to start creating your automated SIP plan with ERC-7715 Advanced
                Permissions.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-sm">
                <h4 className="text-sm font-medium text-blue-900 mb-2">This app uses:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• MetaMask Smart Accounts</li>
                  <li>• ERC-7715 Advanced Permissions</li>
                  <li>• Dual permission flow (Agent + SIP)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
