import { NextResponse } from "next/server";
import { getAllPermissions } from "../../utils/storage";

export async function GET() {
  try {
    const allPermissions = getAllPermissions();

    const permissionsArray = Array.from(allPermissions.entries()).map(([address, data]) => ({
      userAddress: address,
      sessionAccountAddress: data.sessionAccountAddress,
      createdAt: new Date(data.createdAt).toISOString(),
      hasContext: !!data.permissions?.[0]?.context,
    }));

    return NextResponse.json({
      count: allPermissions.size,
      permissions: permissionsArray,
    });
  } catch (error: any) {
    console.error("Error getting permissions:", error);
    return NextResponse.json({ error: error.message || "Failed to get permissions" }, { status: 500 });
  }
}
