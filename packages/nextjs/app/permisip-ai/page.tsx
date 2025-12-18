"use client";

import React, { useEffect, useRef, useState } from "react";
import { parseEther } from "viem";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { usePermissions } from "~~/app/erc-7715-permissions/hooks/usePermissions";

interface Message {
  id: number;
  role: "agent" | "user";
  content: string | React.ReactNode;
  type?: "text" | "summary" | "actions" | "chips";
}

interface SipData {
  token: string;
  amount: string;
  frequency: string;
  duration: string;
  periodDurationSeconds: number;
  totalDurationSeconds: number;
}

export default function PermiSIPChat() {
  const { requestPermission, grantedPermissions, isLoading } = usePermissions();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "agent",
      content:
        "Hello! I'm your PermiSIP AI assistant. I'll help you set up an automated investment plan. Would you like to get started?",
      type: "text",
    },
    {
      id: 2,
      role: "agent",
      content: (
        <div className="flex gap-2 mt-2">
          <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700 transition-colors font-medium">
            Yes, let&apos;s start
          </button>
        </div>
      ),
      type: "chips",
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [step, setStep] = useState(0);
  const [sipData, setSipData] = useState<SipData>({
    token: "ETH",
    amount: "0",
    frequency: "Monthly",
    duration: "6 months",
    periodDurationSeconds: 2592000,
    totalDurationSeconds: 15552000,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(step);
  const sipDataRef = useRef(sipData);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    sipDataRef.current = sipData;
  }, [sipData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (grantedPermissions && step === 5) {
      addMessage({
        id: Date.now(),
        role: "agent",
        content: "🎉 Permission granted successfully! Your SIP plan is now active and will execute automatically.",
        type: "text",
      });
      addMessage({
        id: Date.now() + 1,
        role: "agent",
        content: (
          <div className="flex gap-2 mt-3">
            <a
              href="/dashboard"
              className="px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View Dashboard
            </a>
          </div>
        ),
        type: "chips",
      });
      setStep(6);
    }
  }, [grantedPermissions, step]);

  const addMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
  };

  const processInput = (text: string) => {
    const currentStep = stepRef.current;
    let nextStep = currentStep;
    const newData = { ...sipDataRef.current };
    let response = "";
    let chips = null;

    if (currentStep === 0) {
      nextStep = 1;
      response = "Great! Which token would you like to invest in?";
      chips = (
        <div className="flex flex-wrap gap-2 mt-2">
          <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors font-medium">
            ETH
          </button>
          <button
            className="px-4 py-2 bg-gray-100 text-gray-400 text-sm rounded-full cursor-not-allowed font-medium"
            disabled
          >
            USDC (Coming Soon)
          </button>
        </div>
      );
    } else if (currentStep === 1) {
      newData.token = "ETH";
      nextStep = 2;
      response = "Perfect! How much ETH would you like to invest per period?";
      chips = (
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={() => handleQuickReply("0.01")}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors font-medium"
          >
            0.01 ETH
          </button>
          <button
            onClick={() => handleQuickReply("0.05")}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors font-medium"
          >
            0.05 ETH
          </button>
          <button
            onClick={() => handleQuickReply("0.1")}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors font-medium"
          >
            0.1 ETH
          </button>
        </div>
      );
    } else if (currentStep === 2) {
      const amt = parseFloat(text);
      if (isNaN(amt) || amt <= 0) {
        addMessage({
          id: Date.now(),
          role: "agent",
          content: "Please enter a valid amount (e.g., 0.01)",
          type: "text",
        });
        return;
      }
      newData.amount = text;
      nextStep = 3;
      response = "Excellent! How often would you like to invest?";
      chips = (
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={() => handleQuickReply("Daily")}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors font-medium"
          >
            Daily
          </button>
          <button
            onClick={() => handleQuickReply("Weekly")}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors font-medium"
          >
            Weekly
          </button>
          <button
            onClick={() => handleQuickReply("Monthly")}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors font-medium"
          >
            Monthly
          </button>
        </div>
      );
    } else if (currentStep === 3) {
      const freq = text.toLowerCase();
      if (freq.includes("dai")) {
        newData.frequency = "Daily";
        newData.periodDurationSeconds = 86400;
      } else if (freq.includes("week")) {
        newData.frequency = "Weekly";
        newData.periodDurationSeconds = 604800;
      } else {
        newData.frequency = "Monthly";
        newData.periodDurationSeconds = 2592000;
      }
      nextStep = 4;
      response = "Great choice! For how long should this plan run?";
      chips = (
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={() => handleQuickReply("3 Months")}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors font-medium"
          >
            3 Months
          </button>
          <button
            onClick={() => handleQuickReply("6 Months")}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors font-medium"
          >
            6 Months
          </button>
          <button
            onClick={() => handleQuickReply("1 Year")}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors font-medium"
          >
            1 Year
          </button>
        </div>
      );
    } else if (currentStep === 4) {
      const months = text.toLowerCase().includes("year") ? 12 : parseInt(text) || 6;
      newData.duration = text;
      const numPeriods = months;
      newData.totalDurationSeconds = numPeriods * newData.periodDurationSeconds;
      if (text.toLowerCase().includes("year")) {
        newData.totalDurationSeconds = 12 * 30 * 86400;
      }
      nextStep = 5;
    }

    setSipData(newData);
    setStep(nextStep);

    if (response) {
      addMessage({ id: Date.now(), role: "agent", content: response, type: "text" });
      if (chips) {
        addMessage({ id: Date.now() + 1, role: "agent", content: chips, type: "chips" });
      }
    }

    if (nextStep === 5) {
      setTimeout(() => {
        addMessage({
          id: Date.now() + 10,
          role: "agent",
          content: (
            <div className="bg-white border-2 border-blue-200 rounded-xl p-6 mt-4 max-w-md shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Review Your Plan</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 text-sm">Token</span>
                  <span className="font-semibold text-gray-900">{newData.token}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 text-sm">Amount per period</span>
                  <span className="font-semibold text-gray-900">{newData.amount} ETH</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 text-sm">Frequency</span>
                  <span className="font-semibold text-gray-900">{newData.frequency}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Duration</span>
                  <span className="font-semibold text-gray-900">{newData.duration}</span>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>Permission Required:</strong> You&apos;ll grant PermiSIP permission to transfer{" "}
                  {newData.amount} ETH every {newData.frequency.toLowerCase()} for {newData.duration.toLowerCase()}.
                </p>
              </div>
              <UserActionHandler sipData={newData} loader={isLoading} trigger={requestPermission} />
            </div>
          ),
          type: "summary",
        });
      }, 500);
    }
  };

  const handleQuickReply = (text: string) => {
    addMessage({ id: Date.now(), role: "user", content: text, type: "text" });
    processInput(text);
  };

  const handleSend = () => {
    if (!inputVal.trim()) return;
    handleQuickReply(inputVal);
    setInputVal("");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
        style={{ height: "85vh" }}
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
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
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] ${msg.type === "summary" || msg.type === "chips" ? "w-full max-w-md" : ""}`}>
                {msg.role === "agent" && msg.type === "text" && (
                  <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    {msg.content}
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                    {msg.content}
                  </div>
                )}
                {(msg.type === "chips" || msg.type === "summary") && <div>{msg.content}</div>}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></span>
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></span>
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef}></div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Type your message..."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              disabled={step > 4 && step < 6}
            />
            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSend}
              disabled={!inputVal.trim() || step > 4}
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const UserActionHandler = ({ sipData, loader, trigger }: { sipData: SipData; loader: boolean; trigger: any }) => {
  return (
    <button
      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={loader}
      onClick={() => {
        const amount = parseEther(sipData.amount);
        const now = Math.floor(Date.now() / 1000);
        let days = 180;
        if (sipData.duration.includes("Year")) days = 365;
        if (sipData.duration.includes("Month")) {
          days = parseInt(sipData.duration) * 30;
        }
        const expiry = now + days * 86400 + 10000;

        trigger({
          periodAmount: amount,
          periodDuration: sipData.periodDurationSeconds,
          expiry: expiry,
        });
      }}
    >
      {loader ? "Requesting Permission..." : "Approve & Create Plan"}
    </button>
  );
};
