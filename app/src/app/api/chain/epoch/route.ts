import { NextResponse } from "next/server";
import { suiClient } from "@/lib/sui-client";

export async function GET() {
  try {
    const epochData = await suiClient.getLatestSuiSystemState();
    return NextResponse.json({
      epoch: Number(epochData.epoch),
      epochStartTimestampMs: Number(epochData.epochStartTimestampMs),
      epochDurationMs: Number(epochData.epochDurationMs),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
