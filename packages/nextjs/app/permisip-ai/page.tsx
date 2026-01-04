"use client";

import React from "react";
import { useAccount } from "wagmi";
import { ChatContainer } from "~~/components/chat/ChatContainer";

export default function PermiSIPChat() {
  const { isConnected } = useAccount();

  return (
    <div className="h-[80vh] bg-gray-50 flex flex-col">
      {/* Chat Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col overflow-hidden bg-white shadow-xl sm:border-x sm:border-gray-200">
        {isConnected ? (
          <ChatContainer />
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-6 bg-gray-50/50">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-md shadow-blue-100">
              <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Connect Your Wallet</h3>
            <p className="text-gray-500 text-center mb-8 max-w-md text-lg">
              Connect your MetaMask wallet to start creating your automated SIP plan with ERC-7715 Advanced Permissions.
            </p>
            <div className="bg-white border border-blue-100 rounded-2xl p-6 max-w-sm shadow-sm">
              <h4 className="text-sm font-semibold text-blue-900 mb-3 uppercase tracking-wide">This app uses:</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  MetaMask Smart Accounts
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  ERC-7715 Advanced Permissions
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Dual permission flow (Agent + SIP)
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
