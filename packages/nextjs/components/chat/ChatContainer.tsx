"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatMessage, MessageType } from "./ChatMessage";
import { parseEther, parseUnits } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { usePermissions } from "~~/app/erc-7715-permissions/hooks/usePermissions";
import deployedContracts from "~~/contracts/deployedContracts";

type ConversationStep =
  | "greeting"
  | "goal"
  | "amount"
  | "risk"
  | "ai_limit"
  | "agent_permission"
  | "agent_permission_confirmed"
  | "sip_permission"
  | "sip_permission_confirmed"
  | "complete";

interface Message {
  id: string;
  type: MessageType;
  content: string;
  options?: string[];
}

interface ChatContainerProps {
  onPlanComplete?: (planId: number) => void;
}

// Generate fallback strategy based on risk level
const generateFallbackStrategy = (riskLevel: "low" | "medium" | "high") => {
  switch (riskLevel) {
    case "low":
      return { aave: 50, compound: 40, uniswap: 10 };
    case "medium":
      return { aave: 35, compound: 35, uniswap: 30 };
    case "high":
      return { aave: 20, compound: 25, uniswap: 55 };
    default:
      return { aave: 35, compound: 35, uniswap: 30 };
  }
};

export const ChatContainer = ({ onPlanComplete }: ChatContainerProps) => {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const {
    requestAgentPermission,
    requestSIPPermission,
    agentPermission,
    sipPermission,
    sessionAccountAddress,
    isLoading,
    error,
  } = usePermissions();

  // Get PermiSIPAI contract config
  const permiSIPAIContract = deployedContracts[11155111]?.PermiSIPAI;

  // Smart contract write hook
  const { data: createPlanTxHash, writeContract } = useWriteContract();

  // Wait for transaction confirmation
  const { isSuccess: isContractSuccess } = useWaitForTransactionReceipt({
    hash: createPlanTxHash,
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState<ConversationStep>("greeting");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const [pendingPlanId, setPendingPlanId] = useState<number | null>(null);

  // Collected data
  const [planData, setPlanData] = useState({
    goal: "",
    monthlyAmount: "", // USDC amount for SIP
    riskLevel: "" as "low" | "medium" | "high",
    aiSpendLimit: "", // ETH amount for agent
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    if (hasInitialized.current || !isConnected) return;
    hasInitialized.current = true;

    setTimeout(() => {
      addAIMessage(
        "👋 Welcome to PermiSIP AI! I'm here to help you create a personalized automated investment plan.\n\nLet's start by understanding your goals. What are you investing for?",
        ["Retirement", "House down payment", "Education fund", "General wealth building"],
      );
      setStep("goal");
    }, 500);
  }, [isConnected]);

  // Handle agent permission granted
  useEffect(() => {
    if (agentPermission && step === "agent_permission") {
      setStep("agent_permission_confirmed");
      addSystemMessage("Agent spend permission granted for AI services.");

      setTimeout(() => {
        const strategy = generateFallbackStrategy(planData.riskLevel);
        addAIMessage(
          `🎯 **Strategy Generated!**\n\n` +
            `Based on your ${planData.riskLevel} risk profile, here's your personalized allocation:\n\n` +
            `• **Aave (Lending):** ${strategy.aave}%\n` +
            `• **Compound (Interest):** ${strategy.compound}%\n` +
            `• **Uniswap (Liquidity):** ${strategy.uniswap}%\n\n` +
            `Now let's set up the **SIP Permission** for your ${planData.monthlyAmount} USDC monthly investment.`,
          ["Grant SIP Permission"],
        );
        setStep("sip_permission");
      }, 1000);
    }
  }, [agentPermission, step, planData]);

  // Handle SIP permission granted - CREATE THE PLAN IN DATABASE
  useEffect(() => {
    if (sipPermission && step === "sip_permission") {
      setStep("sip_permission_confirmed");
      addSystemMessage(`SIP spend permission granted for ${planData.monthlyAmount} USDC per period.`);

      // Create the SIP plan in the database
      createSIPPlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sipPermission, step, planData]);

  // Watch for contract transaction success
  useEffect(() => {
    if (isContractSuccess && pendingPlanId) {
      const strategy = generateFallbackStrategy(planData.riskLevel);
      console.log("✅ Smart contract plan created on-chain, tx:", createPlanTxHash);
      addSystemMessage(`Plan registered on-chain! Tx: ${createPlanTxHash?.slice(0, 10)}...`);

      // Show success message
      setTimeout(() => {
        addAIMessage(
          `🎉 **Your SIP Plan is Ready!**\n\n` +
            `**Summary:**\n` +
            `• Goal: ${planData.goal}\n` +
            `• Monthly SIP: ${planData.monthlyAmount} USDC\n` +
            `• Risk Level: ${planData.riskLevel.charAt(0).toUpperCase() + planData.riskLevel.slice(1)}\n` +
            `• AI Agent Budget: ${planData.aiSpendLimit} ETH\n\n` +
            `**Strategy:**\n` +
            `• Aave: ${strategy.aave}%\n` +
            `• Compound: ${strategy.compound}%\n` +
            `• Uniswap: ${strategy.uniswap}%\n\n` +
            `Your automated investments will begin according to your schedule!`,
          ["View Dashboard"],
        );
        setStep("complete");

        // Call the completion callback if provided
        if (onPlanComplete) {
          onPlanComplete(pendingPlanId);
        }
        setPendingPlanId(null);
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isContractSuccess, pendingPlanId]);

  // Create SIP Plan: First in database, then on-chain
  const createSIPPlan = async () => {
    const strategy = generateFallbackStrategy(planData.riskLevel);

    try {
      // Step 1: Save to database first to get planId
      addSystemMessage("Saving plan to database...");
      const response = await fetch("/api/sip/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: address,
          plan: {
            goal: planData.goal,
            monthlyAmount: planData.monthlyAmount,
            riskLevel: planData.riskLevel,
            strategy,
            aiSpendLimit: planData.aiSpendLimit,
            rebalancing: true,
          },
          agentPermission: {
            ...agentPermission,
            sessionAccountAddress,
          },
          sipPermission: {
            ...sipPermission,
            sessionAccountAddress,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ SIP Plan created in database:", data.plan);
        addSystemMessage(`SIP Plan #${data.plan.id} saved to database.`);

        // Step 2: Call smart contract with the planId
        if (permiSIPAIContract) {
          addSystemMessage("Registering plan on blockchain...");

          // Parse monthly amount to USDC units (6 decimals)
          const monthlyAmountParsed = parseUnits(planData.monthlyAmount, 6);

          writeContract({
            address: permiSIPAIContract.address as `0x${string}`,
            abi: permiSIPAIContract.abi,
            functionName: "createSIPPlanWithId",
            args: [
              BigInt(data.plan.id), // planId from database
              monthlyAmountParsed, // monthlyAmount in USDC
              strategy.aave, // aavePercent
              strategy.compound, // compoundPercent
              strategy.uniswap, // uniswapPercent
              true, // enableRebalancing
            ],
          });

          // Store the planId for when transaction completes
          setPendingPlanId(data.plan.id);
        } else {
          // Contract not deployed, show success anyway
          console.warn("PermiSIPAI contract not found, skipping on-chain registration");
          addSystemMessage("Plan saved (contract not available for on-chain registration)");

          // Show success message
          setTimeout(() => {
            addAIMessage(
              `🎉 **Your SIP Plan is Ready!**\n\n` +
                `**Summary:**\n` +
                `• Goal: ${planData.goal}\n` +
                `• Monthly SIP: ${planData.monthlyAmount} USDC\n` +
                `• Risk Level: ${planData.riskLevel.charAt(0).toUpperCase() + planData.riskLevel.slice(1)}\n` +
                `• AI Agent Budget: ${planData.aiSpendLimit} ETH\n\n` +
                `**Strategy:**\n` +
                `• Aave: ${strategy.aave}%\n` +
                `• Compound: ${strategy.compound}%\n` +
                `• Uniswap: ${strategy.uniswap}%\n\n` +
                `Your automated investments will begin according to your schedule!`,
              ["View Dashboard"],
            );
            setStep("complete");

            if (onPlanComplete) {
              onPlanComplete(data.plan.id);
            }
          }, 500);
        }
      } else {
        console.error("Failed to create SIP plan:", data.error);
        addSystemMessage(`⚠️ Failed to save plan: ${data.error}`);
      }
    } catch (error: any) {
      console.error("Error creating SIP plan:", error);
      addSystemMessage(`⚠️ Error saving plan: ${error.message}`);
    }
  };

  const addAIMessage = (content: string, options?: string[]) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: "ai" as MessageType,
          content,
          options,
        },
      ]);
      setIsTyping(false);
    }, 800);
  };

  const addUserMessage = (content: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: "user" as MessageType,
        content,
      },
    ]);
  };

  const addSystemMessage = (content: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: "ai" as MessageType,
        content: `✅ ${content}`,
      },
    ]);
  };

  const handleSend = (message?: string) => {
    const userInput = message || input.trim();
    if (!userInput) return;

    addUserMessage(userInput);
    setInput("");
    processInput(userInput);
  };

  const processInput = (userInput: string) => {
    switch (step) {
      case "goal":
        setPlanData(prev => ({ ...prev, goal: userInput }));
        setStep("amount");
        setTimeout(() => {
          addAIMessage(
            `Great choice! "${userInput}" is an excellent goal. 🎯\n\nHow much would you like to invest monthly? This will be your SIP amount in USDC.`,
            ["0.00001 USDC", "10 USDC", "100 USDC", "500 USDC"],
          );
        }, 500);
        break;

      case "amount":
        const amount = userInput.replace(/[^0-9.]/g, "");
        setPlanData(prev => ({ ...prev, monthlyAmount: amount }));
        setStep("risk");
        setTimeout(() => {
          addAIMessage(
            `Perfect! ${userInput} per month is a solid commitment. 💪\n\nWhat's your risk tolerance? This helps allocate funds across different DeFi protocols.`,
            ["Low - Stable returns", "Medium - Balanced growth", "High - Maximum growth"],
          );
        }, 500);
        break;

      case "risk":
        let riskLevel: "low" | "medium" | "high" = "medium";
        if (userInput.toLowerCase().includes("low")) riskLevel = "low";
        else if (userInput.toLowerCase().includes("high")) riskLevel = "high";

        setPlanData(prev => ({ ...prev, riskLevel }));
        setStep("ai_limit");
        setTimeout(() => {
          addAIMessage(
            `Understood! You've selected **${riskLevel}** risk tolerance.\n\n` +
              `To generate and optimize your strategy, I'll use our AI Agent.\n\n` +
              `What's your budget for AI agent fees? (paid in ETH)`,
            ["0.001 ETH", "0.005 ETH", "0.01 ETH"],
          );
        }, 500);
        break;

      case "ai_limit":
        const aiLimit = userInput.replace(/[^0-9.]/g, "");
        setPlanData(prev => ({ ...prev, aiSpendLimit: aiLimit }));
        setStep("agent_permission");
        setTimeout(() => {
          addAIMessage(
            `Great! You've allocated ${aiLimit} ETH for AI agent services.\n\n` +
              `**Step 1 of 2:** Grant the **Agent Spend Permission** to allow AI-powered strategy optimization.\n\n` +
              `This permission allows the agent to spend up to ${aiLimit} ETH for strategy services.`,
            ["Grant Agent Permission"],
          );
        }, 500);
        break;

      default:
        break;
    }
  };

  const handleOptionClick = (option: string) => {
    if (option === "Grant Agent Permission" && step === "agent_permission") {
      handleGrantAgentPermission();
      return;
    }
    if (option === "Grant SIP Permission" && step === "sip_permission") {
      handleGrantSIPPermission();
      return;
    }
    if (option === "View Dashboard" && step === "complete") {
      // Call the completion callback if provided
      if (onPlanComplete) {
        onPlanComplete(Date.now()); // Use timestamp as plan ID
      }
      router.push("/dashboard");
      return;
    }

    handleSend(option);
  };

  const handleGrantAgentPermission = async () => {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 31536000; // 1 year

    addSystemMessage("Requesting Agent (ETH) permission...");

    try {
      await requestAgentPermission({
        periodAmount: parseEther(planData.aiSpendLimit || "0.01"),
        periodDuration: 2592000, // 30 days
        expiry,
      });
    } catch (err: any) {
      addSystemMessage(`⚠️ Error: ${err.message}. Please try again.`);
    }
  };

  const handleGrantSIPPermission = async () => {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 31536000; // 1 year

    addSystemMessage("Requesting SIP (USDC) permission...");

    try {
      await requestSIPPermission({
        periodAmount: planData.monthlyAmount || "10",
        periodDuration: 2592000, // 30 days
        expiry,
      });
    } catch (err: any) {
      addSystemMessage(`⚠️ Error: ${err.message}. Please try again.`);
    }
  };

  // Check if input should be disabled
  const isInputDisabled = () => {
    return step === "agent_permission" || step === "sip_permission" || step === "complete" || isLoading;
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please connect your wallet to start.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 p-4">
        {messages.map(message => (
          <ChatMessage
            key={message.id}
            type={message.type}
            content={message.content}
            options={message.options}
            onOptionClick={handleOptionClick}
          />
        ))}

        {/* Typing indicator */}
        {(isTyping || isLoading) && (
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mx-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!isInputDisabled() && (
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
