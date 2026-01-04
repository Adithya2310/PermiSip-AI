/**
 * API Route: Execute SIP
 * POST /api/execute-sip - Execute a SIP plan by spending both agent (ETH) and SIP (USDC) permissions
 */
import { NextRequest, NextResponse } from "next/server";
import { Implementation, toMetaMaskSmartAccount } from "@metamask/smart-accounts-kit";
import { erc7710BundlerActions } from "@metamask/smart-accounts-kit/actions";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { Hex, createPublicClient, encodeFunctionData, http, parseEther, parseUnits } from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { initializeDatabase, isDatabaseConfigured, turso } from "~~/utils/db/turso";

// USDC address on Ethereum Sepolia
const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

// ERC-20 transfer function ABI
const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export async function POST(request: NextRequest) {
  try {
    const { planId, userAddress, usdcAmount = "0.0001" } = await request.json();

    if (!planId || !userAddress) {
      return NextResponse.json({ error: "planId and userAddress are required" }, { status: 400 });
    }

    // Validate USDC amount is one of the allowed test values
    // NOTE: These amounts must be <= the periodAmount set in the permission
    // If permission was set to 0.00001 USDC, we can only transfer up to that amount per period
    const allowedAmounts = ["0.000001", "0.000005", "0.00001"];
    if (!allowedAmounts.includes(usdcAmount)) {
      return NextResponse.json(
        { error: `Invalid USDC amount. Allowed values: ${allowedAmounts.join(", ")}` },
        { status: 400 },
      );
    }

    // Check if Turso is configured
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    await initializeDatabase();

    // Get the SIP plan
    const planResult = await turso.execute({
      sql: `SELECT * FROM sip_plans WHERE id = ? AND user_address = ?`,
      args: [planId, userAddress.toLowerCase()],
    });

    if (planResult.rows.length === 0) {
      return NextResponse.json({ error: "SIP plan not found" }, { status: 404 });
    }

    const plan = planResult.rows[0];

    // Check if plan is active
    if (!plan.active) {
      return NextResponse.json({ error: "SIP plan is not active" }, { status: 400 });
    }

    // Get both agent and SIP permissions for this user
    const permissionsResult = await turso.execute({
      sql: `SELECT * FROM spend_permissions WHERE user_address = ? AND revoked = 0 ORDER BY created_at DESC`,
      args: [userAddress.toLowerCase()],
    });

    if (permissionsResult.rows.length === 0) {
      return NextResponse.json({ error: "No permissions found. Please set up permissions first." }, { status: 404 });
    }

    // Find agent and SIP permissions
    let agentPermission = null;
    let sipPermission = null;

    for (const row of permissionsResult.rows) {
      const permType = row.permission_type as string;
      if (permType === "agent" && !agentPermission) {
        agentPermission = {
          data: JSON.parse(row.permission_data as string),
          sessionAccountAddress: row.session_account_address as string,
        };
      } else if (permType === "sip" && !sipPermission) {
        sipPermission = {
          data: JSON.parse(row.permission_data as string),
          sessionAccountAddress: row.session_account_address as string,
        };
      }
    }

    if (!agentPermission) {
      return NextResponse.json({ error: "Agent (ETH) permission not found" }, { status: 404 });
    }

    if (!sipPermission) {
      return NextResponse.json({ error: "SIP (USDC) permission not found" }, { status: 404 });
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

    const now = new Date().toISOString();
    let agentTxHash: string | null = null;
    let sipTxHash: string | null = null;

    // Step 1: Spend Agent Permission (ETH) - small amount for agent fee
    try {
      const agentPermissionData = agentPermission.data;
      const agentContext = agentPermissionData[0]?.context;
      // Per docs: delegationManager comes from signerMeta.delegationManager
      const agentDelegationManager = agentPermissionData[0]?.signerMeta?.delegationManager;

      if (!agentContext || !agentDelegationManager) {
        throw new Error("Invalid agent permission data structure");
      }

      const agentHash = await bundlerClient.sendUserOperationWithDelegation({
        publicClient,
        account: sessionAccount,
        calls: [
          {
            to: sessionAccount.address as Hex, // Send to self as a minimal spend
            value: parseEther("0.0000001"), // Minimal ETH amount
            permissionsContext: agentContext,
            delegationManager: agentDelegationManager,
          },
        ],
        ...fee,
      });

      const { receipt: agentReceipt } = await bundlerClient.waitForUserOperationReceipt({
        hash: agentHash,
      });

      agentTxHash = agentReceipt.transactionHash;
      console.log("✅ Agent (ETH) permission spent:", agentTxHash);
    } catch (agentError: any) {
      console.error("Failed to spend agent permission:", agentError);

      // Record failed execution
      await turso.execute({
        sql: `INSERT INTO sip_executions (plan_id, user_address, amount, tx_hash, status, error_message, executed_at)
              VALUES (?, ?, ?, NULL, 'failed', ?, ?)`,
        args: [planId, userAddress.toLowerCase(), usdcAmount, `Agent permission failed: ${agentError.message}`, now],
      });

      return NextResponse.json({ error: `Failed to spend agent permission: ${agentError.message}` }, { status: 500 });
    }

    // Step 2: Spend SIP Permission (USDC)
    try {
      const sipPermissionData = sipPermission.data;
      const sipContext = sipPermissionData[0]?.context;
      // Per docs: delegationManager comes from signerMeta.delegationManager
      const sipDelegationManager = sipPermissionData[0]?.signerMeta?.delegationManager;

      if (!sipContext || !sipDelegationManager) {
        throw new Error("Invalid SIP permission data structure");
      }

      // Parse USDC amount (6 decimals)
      const usdcAmountParsed = parseUnits(usdcAmount, 6);

      // Encode USDC transfer call
      const transferData = encodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [sessionAccount.address, usdcAmountParsed], // Transfer to session account (simulating investment)
      });

      const sipHash = await bundlerClient.sendUserOperationWithDelegation({
        publicClient,
        account: sessionAccount,
        calls: [
          {
            to: USDC_SEPOLIA as Hex,
            data: transferData,
            permissionsContext: sipContext,
            delegationManager: sipDelegationManager,
          },
        ],
        ...fee,
      });

      const { receipt: sipReceipt } = await bundlerClient.waitForUserOperationReceipt({
        hash: sipHash,
      });

      sipTxHash = sipReceipt.transactionHash;
      console.log("✅ SIP (USDC) permission spent:", sipTxHash);
    } catch (sipError: any) {
      console.error("Failed to spend SIP permission:", sipError);

      // Record partial execution (agent succeeded, SIP failed)
      await turso.execute({
        sql: `INSERT INTO sip_executions (plan_id, user_address, amount, tx_hash, status, error_message, executed_at)
              VALUES (?, ?, ?, ?, 'failed', ?, ?)`,
        args: [
          planId,
          userAddress.toLowerCase(),
          usdcAmount,
          agentTxHash,
          `SIP permission failed: ${sipError.message}`,
          now,
        ],
      });

      return NextResponse.json(
        {
          error: `Failed to spend SIP permission: ${sipError.message}`,
          agentTxHash,
        },
        { status: 500 },
      );
    }

    // Step 3: Record successful execution
    await turso.execute({
      sql: `INSERT INTO sip_executions (plan_id, user_address, amount, tx_hash, status, executed_at)
            VALUES (?, ?, ?, ?, 'success', ?)`,
      args: [planId, userAddress.toLowerCase(), usdcAmount, sipTxHash, now],
    });

    // Step 4: Update plan's last_execution and total_deposited
    const currentDeposited = parseFloat((plan.total_deposited as string) || "0");
    const newDeposited = currentDeposited + parseFloat(usdcAmount);

    await turso.execute({
      sql: `UPDATE sip_plans SET last_execution = ?, total_deposited = ?, updated_at = ? WHERE id = ?`,
      args: [now, newDeposited.toString(), now, planId],
    });

    return NextResponse.json({
      success: true,
      message: "SIP executed successfully",
      agentTxHash,
      sipTxHash,
      usdcAmount,
      planId,
      executedAt: now,
    });
  } catch (error: any) {
    console.error("Error executing SIP:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to execute SIP",
        details: error.toString(),
      },
      { status: 500 },
    );
  }
}

// GET endpoint to check execution status and history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("userAddress");
    const planId = searchParams.get("planId");

    if (!userAddress) {
      return NextResponse.json({ error: "userAddress is required" }, { status: 400 });
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    // Build query based on parameters
    let sql = `SELECT * FROM sip_executions WHERE user_address = ?`;
    const args: any[] = [userAddress.toLowerCase()];

    if (planId) {
      sql += ` AND plan_id = ?`;
      args.push(parseInt(planId));
    }

    sql += ` ORDER BY executed_at DESC LIMIT 20`;

    const result = await turso.execute({ sql, args });

    const executions = result.rows.map(row => ({
      id: row.id,
      planId: row.plan_id,
      amount: row.amount,
      txHash: row.tx_hash,
      status: row.status,
      errorMessage: row.error_message,
      executedAt: row.executed_at,
    }));

    return NextResponse.json({
      success: true,
      executions,
      count: executions.length,
    });
  } catch (error: any) {
    console.error("Error fetching executions:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch executions" }, { status: 500 });
  }
}
