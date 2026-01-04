"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useBalance } from "wagmi";
import { ArrowPathIcon, BoltIcon, CheckCircleIcon, PlusIcon, XCircleIcon } from "@heroicons/react/24/outline";

// Types
interface SIPPlan {
  id: number;
  userAddress: string;
  goal: string;
  monthlyAmount: string;
  riskLevel: string;
  strategy: {
    aave: number;
    compound: number;
    uniswap: number;
  };
  aiSpendLimit: string;
  rebalancing: boolean;
  active: boolean;
  totalDeposited: string;
  createdAt: string;
  lastExecution: string | null;
}

interface SIPExecution {
  id: number;
  planId: number;
  amount: string;
  txHash: string | null;
  status: "pending" | "success" | "failed";
  errorMessage: string | null;
  executedAt: string;
}

// USDC test amounts - must be <= periodAmount set in permission
const USDC_AMOUNTS = ["0.000001", "0.000005", "0.00001"];

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });

  const [plans, setPlans] = useState<SIPPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SIPPlan | null>(null);
  const [executions, setExecutions] = useState<SIPExecution[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isLoadingExecutions, setIsLoadingExecutions] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [executeSuccess, setExecuteSuccess] = useState<string | null>(null);
  const [selectedUsdcAmount, setSelectedUsdcAmount] = useState(USDC_AMOUNTS[0]);

  // Calculate next execution time (assuming daily SIP for demo)
  const getNextExecution = useCallback((plan: SIPPlan) => {
    if (!plan.lastExecution) {
      return "Ready to execute";
    }

    const lastExec = new Date(plan.lastExecution);
    const nextExec = new Date(lastExec.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
    const now = new Date();
    const diff = nextExec.getTime() - now.getTime();

    if (diff <= 0) {
      return "Ready to execute";
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, []);

  // Fetch user's SIP plans
  const fetchPlans = useCallback(async () => {
    if (!address) {
      setIsLoadingPlans(false);
      return;
    }

    try {
      const response = await fetch(`/api/sip/create?userAddress=${address}`);
      const data = await response.json();

      if (data.success && data.plans) {
        setPlans(data.plans);
        if (data.plans.length > 0 && !selectedPlan) {
          setSelectedPlan(data.plans[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    } finally {
      setIsLoadingPlans(false);
    }
  }, [address, selectedPlan]);

  // Fetch executions for selected plan
  const fetchExecutions = useCallback(async () => {
    if (!address || !selectedPlan) {
      return;
    }

    setIsLoadingExecutions(true);
    try {
      const response = await fetch(`/api/execute-sip?userAddress=${address}&planId=${selectedPlan.id}`);
      const data = await response.json();

      if (data.success && data.executions) {
        setExecutions(data.executions);
      }
    } catch (error) {
      console.error("Failed to fetch executions:", error);
    } finally {
      setIsLoadingExecutions(false);
    }
  }, [address, selectedPlan]);

  // Execute SIP
  const executeSIP = async () => {
    if (!address || !selectedPlan) return;

    setIsExecuting(true);
    setExecuteError(null);
    setExecuteSuccess(null);

    try {
      const response = await fetch("/api/execute-sip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          userAddress: address,
          usdcAmount: selectedUsdcAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to execute SIP");
      }

      setExecuteSuccess(`SIP executed successfully! Tx: ${data.sipTxHash?.slice(0, 10)}...`);

      // Refresh data
      await fetchPlans();
      await fetchExecutions();
    } catch (error: any) {
      setExecuteError(error.message);
    } finally {
      setIsExecuting(false);
    }
  };

  // Load plans on mount
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Load executions when plan is selected
  useEffect(() => {
    if (selectedPlan) {
      fetchExecutions();
    }
  }, [selectedPlan, fetchExecutions]);

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format time
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your SIP Plans</h1>
            <p className="text-gray-600 mt-1">Manage your automated investment strategies</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Wallet Info */}
            {isConnected && address && (
              <div className="bg-white rounded-xl border border-gray-200 px-4 py-2 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">👤</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Your Wallet</p>
                    <p className="text-sm font-mono text-gray-900">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </p>
                  </div>
                  <div className="border-l border-gray-200 pl-3 ml-2">
                    <p className="text-xs text-gray-500">ETH Balance</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {balance ? `${parseFloat(balance.formatted).toFixed(4)} ETH` : "---"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <Link
              href="/permisip-ai"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm"
            >
              <PlusIcon className="w-5 h-5" />
              Create New Plan
            </Link>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Plan List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">All Plans ({plans.length})</h2>
                <button
                  onClick={() => fetchPlans()}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh plans"
                >
                  <ArrowPathIcon className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
                {isLoadingPlans ? (
                  <div className="p-6 text-center text-gray-500">Loading plans...</div>
                ) : plans.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500 mb-4">No SIP plans yet</p>
                    <Link
                      href="/permisip-ai"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Create Your First Plan
                    </Link>
                  </div>
                ) : (
                  plans.map(plan => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedPlan?.id === plan.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{plan.goal}</h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            plan.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {plan.active ? "Active" : "Paused"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {plan.monthlyAmount} USDC/period ·{" "}
                        <span
                          className={`font-medium ${
                            plan.riskLevel === "high"
                              ? "text-red-600"
                              : plan.riskLevel === "medium"
                                ? "text-yellow-600"
                                : "text-green-600"
                          }`}
                        >
                          {plan.riskLevel.charAt(0).toUpperCase() + plan.riskLevel.slice(1)}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">Created {formatDate(plan.createdAt)}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Plan Details */}
          <div className="lg:col-span-2">
            {selectedPlan ? (
              <div className="space-y-6">
                {/* Plan Header */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedPlan.goal}</h2>
                      <p className="text-gray-500">Plan #{selectedPlan.id}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                        selectedPlan.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${selectedPlan.active ? "bg-green-500" : "bg-gray-400"}`}
                      ></span>
                      {selectedPlan.active ? "Active" : "Paused"}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Monthly Amount</p>
                      <p className="text-xl font-bold text-gray-900">{selectedPlan.monthlyAmount} USDC</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Total Deposited</p>
                      <p className="text-xl font-bold text-gray-900">{selectedPlan.totalDeposited} USDC</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Next Execution</p>
                      <p className="text-xl font-bold text-blue-600">{getNextExecution(selectedPlan)}</p>
                    </div>
                  </div>
                </div>

                {/* Execute SIP Section */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Execute SIP Now (For Testing)</h3>

                  {/* USDC Amount Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select USDC Amount</label>
                    <div className="flex gap-2">
                      {USDC_AMOUNTS.map(amount => (
                        <button
                          key={amount}
                          onClick={() => setSelectedUsdcAmount(amount)}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            selectedUsdcAmount === amount
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {amount} USDC
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Error/Success Messages */}
                  {executeError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {executeError}
                    </div>
                  )}
                  {executeSuccess && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                      {executeSuccess}
                    </div>
                  )}

                  {/* Execute Button */}
                  <button
                    onClick={executeSIP}
                    disabled={isExecuting || !selectedPlan.active}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                      isExecuting || !selectedPlan.active
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md"
                    }`}
                  >
                    <BoltIcon className="w-5 h-5" />
                    {isExecuting ? "Executing..." : `Execute SIP Now (${selectedUsdcAmount} USDC)`}
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    This will spend both Agent (ETH) and SIP (USDC) permissions
                  </p>
                </div>

                {/* Execution History */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">SIP Executions</h3>
                    <button
                      onClick={() => fetchExecutions()}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      Refresh
                    </button>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {isLoadingExecutions ? (
                      <div className="p-6 text-center text-gray-500">Loading executions...</div>
                    ) : executions.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">No executions yet</div>
                    ) : (
                      executions.slice(0, 5).map(exec => (
                        <div key={exec.id} className="px-6 py-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {exec.status === "success" ? (
                              <CheckCircleIcon className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircleIcon className="w-5 h-5 text-red-500" />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{exec.amount} USDC</p>
                              <p className="text-xs text-gray-500">{formatTime(exec.executedAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                exec.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}
                            >
                              {exec.status.charAt(0).toUpperCase() + exec.status.slice(1)}
                            </span>
                            {exec.txHash && (
                              <a
                                href={`https://sepolia.etherscan.io/tx/${exec.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-xs"
                              >
                                ↗
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <p className="text-gray-500 mb-4">Select a plan from the left to view details</p>
                {plans.length === 0 && !isLoadingPlans && (
                  <Link
                    href="/permisip-ai"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Create Your First Plan
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
