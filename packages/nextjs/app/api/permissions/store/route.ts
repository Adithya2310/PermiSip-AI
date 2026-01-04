import { NextRequest, NextResponse } from "next/server";
import { setPermissionData } from "../../utils/storage";

/**
 * API Route: Store Permission (Temporary)
 *
 * This route stores permissions ONLY in memory for the current session.
 * The permissions are NOT stored in Turso here to avoid duplicates.
 *
 * Permanent storage happens in /api/sip/create which:
 * 1. Creates the SIP plan first
 * 2. Stores both agent and SIP permissions WITH the plan_id reference
 *
 * This ensures permissions are properly linked to their SIP plan.
 */
export async function POST(request: NextRequest) {
  try {
    const { userAddress, permissions, sessionAccountAddress, permissionType } = await request.json();

    if (!userAddress || !permissions || !sessionAccountAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Store in memory only (for session state)
    // Turso storage happens in /api/sip/create with proper plan_id
    setPermissionData(userAddress, {
      permissions,
      sessionAccountAddress,
      permissionType: permissionType || "agent",
      createdAt: Date.now(),
    });

    console.log(
      `[Permissions] Stored in memory for ${userAddress} (type: ${permissionType || "agent"}) - will persist to Turso when SIP plan is created`,
    );

    return NextResponse.json({
      success: true,
      message: "Permission stored in session (will persist to database when plan is created)",
      permissions,
      sessionAccountAddress,
    });
  } catch (error: any) {
    console.error("Error storing permissions:", error);
    return NextResponse.json({ error: error.message || "Failed to store permissions" }, { status: 500 });
  }
}
