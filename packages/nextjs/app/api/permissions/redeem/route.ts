import { NextRequest, NextResponse } from "next/server";
import { getPermissionData } from "../../utils/storage";
import { Implementation, toMetaMaskSmartAccount } from "@metamask/smart-accounts-kit";
import { erc7710BundlerActions } from "@metamask/smart-accounts-kit/actions";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { Hex, createPublicClient, http, parseEther } from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

export async function POST(request: NextRequest) {
  try {
    const { userAddress, amount, recipient } = await request.json();

    if (!userAddress) {
      return NextResponse.json({ error: "User address is required" }, { status: 400 });
    }

    // Get stored permissions
    const permissionData = getPermissionData(userAddress);
    if (!permissionData) {
      return NextResponse.json({ error: "Permissions not found. Please request permissions first." }, { status: 404 });
    }

    // Use the fixed private key from environment variable
    const privateKey = process.env.SESSION_PRIVATE_KEY as Hex;

    if (!privateKey) {
      return NextResponse.json({ error: "SESSION_PRIVATE_KEY not configured in .env.local" }, { status: 500 });
    }

    // Validate Pimlico API key
    const pimlicoKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
    if (!pimlicoKey) {
      return NextResponse.json({ error: "Pimlico API key not configured" }, { status: 500 });
    }

    // Recreate the session account from the private key
    const account = privateKeyToAccount(privateKey);
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    });

    const sessionAccount = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [account.address as Hex, [], [], []],
      deploySalt: "0x",
      signer: { account },
    });

    // Create bundler client
    const bundlerClient = createBundlerClient({
      transport: http(`https://api.pimlico.io/v2/${sepolia.id}/rpc?apikey=${pimlicoKey}`),
      paymaster: true,
    }).extend(erc7710BundlerActions());

    // Create Pimlico client for gas estimation
    const pimlicoClient = createPimlicoClient({
      transport: http(`https://api.pimlico.io/v2/${sepolia.id}/rpc?apikey=${pimlicoKey}`),
    });

    const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();

    // Determine transaction details
    const txAmount = amount ? parseEther(amount) : parseEther("0.0000001");
    const txRecipient = (recipient || sessionAccount.address) as Hex;

    // Send user operation with delegation
    const hash = await bundlerClient.sendUserOperationWithDelegation({
      publicClient,
      account: sessionAccount,
      calls: [
        {
          to: txRecipient,
          value: txAmount,
          permissionsContext: permissionData.permissions[0].context,
          delegationManager: permissionData.permissions[0].signer.data.address,
        },
      ],
      ...fee,
    });

    // Wait for transaction receipt
    const { receipt } = await bundlerClient.waitForUserOperationReceipt({
      hash,
    });

    return NextResponse.json({
      success: true,
      transactionHash: receipt.transactionHash,
      userOperationHash: hash,
      message: "Permission redeemed successfully",
    });
  } catch (error: any) {
    console.error("Error redeeming permission:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to redeem permission",
        details: error.toString(),
      },
      { status: 500 },
    );
  }
}
