import { NextRequest, NextResponse } from "next/server";
import { Implementation, toMetaMaskSmartAccount } from "@metamask/smart-accounts-kit";
import { Hex, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json();

    if (!userAddress) {
      return NextResponse.json({ error: "User address is required" }, { status: 400 });
    }

    // Use the fixed private key from environment variable
    const privateKey = process.env.SESSION_PRIVATE_KEY as Hex;

    if (!privateKey) {
      return NextResponse.json({ error: "SESSION_PRIVATE_KEY not configured in .env.local" }, { status: 500 });
    }

    const account = privateKeyToAccount(privateKey);

    // Create public client
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    });

    // Create MetaMask Smart Account
    const smartAccount = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [account.address as Hex, [], [], []],
      deploySalt: "0x",
      signer: { account },
    });

    return NextResponse.json({
      sessionAccountAddress: smartAccount.address,
      message: "Session account ready",
    });
  } catch (error: any) {
    console.error("Error creating session:", error);
    return NextResponse.json({ error: error.message || "Failed to create session" }, { status: 500 });
  }
}
