import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:18789";
const MOCK_ENABLED = process.env.MOCK_AGENT === "true";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, walletAddress, agentId, userLevel } = body;

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  if (MOCK_ENABLED) {
    return NextResponse.json({
      response: `[Mock] I received your message: "${message}". In production, this would be processed by the OpenClaw agent.`,
      agentId: agentId || 1,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        walletAddress,
        agentId: agentId || 1,
        userLevel,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Gateway error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to connect to agent gateway" },
      { status: 502 }
    );
  }
}
