"use client";

import Link from "next/link";
import { ChartBarIcon, ClockIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Gradient */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-3xl">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Automate Your Crypto Investments with Confidence
            </h1>
            <p className="text-xl lg:text-2xl text-blue-100 mb-10 leading-relaxed">
              Set up recurring crypto investments with MetaMask Advanced Permissions. One approval, automated execution,
              complete control.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/permisip-ai"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
              >
                Start Your First SIP
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-all border-2 border-blue-500"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-xl text-gray-600">Three simple steps to automated investing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-8 hover:border-blue-500 transition-all hover:shadow-lg">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <ChartBarIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Define Your Plan</h3>
              <p className="text-gray-600 leading-relaxed">
                Choose your token, investment amount, frequency, and duration through our AI assistant.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-8 hover:border-blue-500 transition-all hover:shadow-lg">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Grant Permission</h3>
              <p className="text-gray-600 leading-relaxed">
                Approve once via MetaMask with strict spending limits. No repeated approvals needed.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-8 hover:border-blue-500 transition-all hover:shadow-lg">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <ClockIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Automated Execution</h3>
              <p className="text-gray-600 leading-relaxed">
                Your investments execute automatically on schedule. Track everything on your dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Why PermiSIP Section */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why PermiSIP?</h2>
            <p className="text-xl text-gray-600">
              Built on MetaMask Advanced Permissions (ERC-7715) for secure, automated investing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShieldCheckIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">One-Time Approval</h3>
                  <p className="text-gray-600">
                    No more signing every transaction. Approve once and let automation handle the rest.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShieldCheckIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Spending Limits</h3>
                  <p className="text-gray-600">
                    Strict caps on how much can be spent per period. You&apos;re always in control.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ClockIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Time-Bound Permissions</h3>
                  <p className="text-gray-600">
                    Permissions automatically expire after your chosen duration for added security.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ChartBarIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Full Transparency</h3>
                  <p className="text-gray-600">
                    Track all your investments, returns, and permissions in one clean dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Ready to Start Investing Smarter?</h2>
          <p className="text-xl text-blue-100 mb-8">Join the future of automated crypto investing with PermiSIP AI</p>
          <Link
            href="/permisip-ai"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
          >
            Get Started Now
          </Link>
        </div>
      </div>
    </div>
  );
}
