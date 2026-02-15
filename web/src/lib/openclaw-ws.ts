/**
 * WebSocket client for OpenClaw gateway
 */

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_URL || "ws://localhost:18789";

export type AgentMessage = {
  type: "text" | "skill_result" | "error" | "status";
  content: string;
  metadata?: Record<string, unknown>;
};

export type ClientMessage = {
  type: "chat" | "command";
  content: string;
  agentId?: number;
  walletAddress?: string;
};

export function createOpenClawConnection(
  onMessage: (msg: AgentMessage) => void,
  onClose?: () => void,
  onError?: (err: Event) => void
): {
  send: (msg: ClientMessage) => void;
  close: () => void;
  isConnected: () => boolean;
} {
  let ws: WebSocket | null = null;
  let connected = false;

  function connect() {
    ws = new WebSocket(GATEWAY_URL);

    ws.onopen = () => {
      connected = true;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as AgentMessage;
        onMessage(msg);
      } catch {
        onMessage({ type: "text", content: event.data });
      }
    };

    ws.onclose = () => {
      connected = false;
      onClose?.();
    };

    ws.onerror = (err) => {
      onError?.(err);
    };
  }

  connect();

  return {
    send: (msg: ClientMessage) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    },
    close: () => {
      ws?.close();
    },
    isConnected: () => connected,
  };
}
