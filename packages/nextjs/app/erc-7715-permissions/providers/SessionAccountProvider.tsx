"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAccount } from "wagmi";

export const SessionAccountContext = createContext({
  sessionAccountAddress: null as string | null,
  isLoading: false,
  error: null as string | null,
  refreshSession: async () => {},
});

export const SessionAccountProvider = ({ children }: { children: React.ReactNode }) => {
  const { address } = useAccount();
  const [sessionAccountAddress, setSessionAccountAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    if (!address) {
      setSessionAccountAddress(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get session");
      }

      setSessionAccountAddress(data.sessionAccountAddress);
    } catch (err: any) {
      setError(err.message || "Failed to get session");
      console.error("Session error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return (
    <SessionAccountContext.Provider value={{ sessionAccountAddress, isLoading, error, refreshSession }}>
      {children}
    </SessionAccountContext.Provider>
  );
};

export const useSessionAccount = () => {
  return useContext(SessionAccountContext);
};
