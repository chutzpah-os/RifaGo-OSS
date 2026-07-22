import { NextRequest, NextResponse } from "next/server";
import { getCronSecret } from "@/lib/config";
import { expireStaleReservations } from "@/lib/reservations";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${getCronSecret()}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await expireStaleReservations();
  return NextResponse.json({ expired: count });
}
