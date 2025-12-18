"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "PermiSIP AI",
    href: "/permisip-ai",
  },
  {
    label: "Dashboard",
    href: "/dashboard",
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky top-0 bg-white border-b border-gray-200 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-gray-900 text-lg">PermiSIP AI</div>
              <div className="text-xs text-gray-500">Automated Investing</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            <ul className="flex items-center gap-2">
              <HeaderMenuLinks />
            </ul>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <RainbowKitCustomConnectButton />
            {isLocalNetwork && <FaucetButton />}

            {/* Mobile Menu Button */}
            <details className="lg:hidden dropdown dropdown-end" ref={burgerMenuRef}>
              <summary className="btn btn-ghost btn-sm">
                <Bars3Icon className="h-6 w-6" />
              </summary>
              <ul
                className="menu dropdown-content mt-3 p-2 shadow-lg bg-white rounded-box w-52 border border-gray-200"
                onClick={() => {
                  burgerMenuRef?.current?.removeAttribute("open");
                }}
              >
                <HeaderMenuLinks />
              </ul>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};
