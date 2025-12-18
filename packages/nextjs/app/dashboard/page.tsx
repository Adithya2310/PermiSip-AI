"use client";

import Link from "next/link";
import { ArrowTrendingUpIcon, PlusIcon } from "@heroicons/react/24/outline";

export default function Dashboard() {
  // Hardcoded stats
  const stats = [
    {
      label: "Total Invested",
      value: "$4,250.00",
      change: "+8.2%",
      changeType: "positive",
    },
    {
      label: "Current Value",
      value: "$4,890.45",
      change: "+15.1%",
      changeType: "positive",
    },
    {
      label: "Total Returns",
      value: "$640.45",
      change: "+15.1%",
      changeType: "positive",
    },
  ];

  // Hardcoded Plan Data
  const plans = [
    {
      id: 1,
      name: "Ethereum Accumulator",
      token: "ETH",
      amount: "0.1 ETH",
      frequency: "Monthly",
      invested: "1.2 ETH",
      value: "1.35 ETH",
      nextRun: "Nov 1, 2025",
      status: "Active",
    },
    {
      id: 2,
      name: "Stable Savings",
      token: "USDC",
      amount: "100 USDC",
      frequency: "Weekly",
      invested: "800 USDC",
      value: "800 USDC",
      nextRun: "Oct 28, 2025",
      status: "Active",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Track your automated investments</p>
          </div>
          <Link
            href="/permisip-ai"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm"
          >
            <PlusIcon className="w-5 h-5" />
            New SIP Plan
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Active Plans */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Active Plans</h2>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Invested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Current Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Next Run
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {plans.map(plan => (
                  <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-sm">{plan.token.substring(0, 1)}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{plan.name}</div>
                          <div className="text-sm text-gray-500">{plan.token}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{plan.amount}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {plan.frequency}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{plan.invested}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{plan.value}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{plan.nextRun}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                        {plan.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {plans.map(plan => (
              <div key={plan.id} className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold">{plan.token.substring(0, 1)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{plan.name}</div>
                    <div className="text-sm text-gray-500">{plan.token}</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                    {plan.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 mb-1">Amount</div>
                    <div className="font-medium text-gray-900">{plan.amount}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Frequency</div>
                    <div className="font-medium text-gray-900">{plan.frequency}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Invested</div>
                    <div className="font-medium text-gray-900">{plan.invested}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Current Value</div>
                    <div className="font-medium text-gray-900">{plan.value}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500 mb-1">Next Run</div>
                    <div className="font-medium text-gray-900">{plan.nextRun}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {plans.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No active plans yet</p>
              <Link
                href="/permisip-ai"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                <PlusIcon className="w-5 h-5" />
                Create Your First Plan
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
