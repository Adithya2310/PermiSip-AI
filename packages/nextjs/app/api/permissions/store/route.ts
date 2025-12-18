import { NextRequest, NextResponse } from "next/server";
import { setPermissionData } from "../../utils/storage";

export async function POST(request: NextRequest) {
  try {
    const { userAddress, permissions, sessionAccountAddress } = await request.json();

    if (!userAddress || !permissions || !sessionAccountAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Store the granted permissions
    setPermissionData(userAddress, {
      permissions,
      sessionAccountAddress,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      message: "Permissions stored successfully",
    });
  } catch (error: any) {
    console.error("Error storing permissions:", error);
    return NextResponse.json({ error: error.message || "Failed to store permissions" }, { status: 500 });
  }
}
