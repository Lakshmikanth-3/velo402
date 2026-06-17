/**
 * app/api/audit/stream/route.ts
 *
 * Server-Sent Events stream that pushes AgentActionEvents live from the
 * Sui blockchain to the dashboard's audit feed.
 *
 * The stream subscribes to Sui event queries using long-polling (suiClient
 * does not expose a persistent WebSocket from the server side without an
 * additional transport library, so we poll every 2 s and push deltas).
 *
 * Security: this is a read-only feed — no auth required.
 */
import { NextRequest } from "next/server";
import { suiClient, PACKAGE_ID } from "@/lib/sui-client";

const POLL_INTERVAL_MS = 2000;
const EVENT_TYPE = `${PACKAGE_ID}::velo_wallet::AgentActionEvent`;
const POLICY_MINTED_TYPE = `${PACKAGE_ID}::velo_wallet::PolicyMintedEvent`;
const POLICY_REVOKED_TYPE = `${PACKAGE_ID}::velo_wallet::PolicyRevokedEvent`;

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // client disconnected
        }
      };

      // Send a heartbeat immediately so the browser marks the connection open
      send({ type: "connected", ts: Date.now() });

      let cursor: string | null = null;
      let running = true;

      req.signal.addEventListener("abort", () => {
        running = false;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });

      while (running) {
        try {
          // Query all three event types in one pass
          for (const eventType of [
            EVENT_TYPE,
            POLICY_MINTED_TYPE,
            POLICY_REVOKED_TYPE,
          ]) {
            const result = await suiClient.queryEvents({
              query: { MoveEventType: eventType },
              cursor: cursor ? { txDigest: cursor, eventSeq: "0" } : null,
              limit: 20,
              order: "ascending",
            });

            for (const evt of result.data) {
              send({
                type: "event",
                eventType: evt.type,
                txDigest: evt.id.txDigest,
                timestampMs: evt.timestampMs,
                parsedJson: evt.parsedJson,
              });
              cursor = evt.id.txDigest;
            }
          }
        } catch (err) {
          send({ type: "error", message: String(err) });
        }

        await sleep(POLL_INTERVAL_MS);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
