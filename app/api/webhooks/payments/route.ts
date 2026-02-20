import { POST as handleConnectWebhook } from "../stripe/connect/route";

export async function POST(request: Request) {
  return handleConnectWebhook(request);
}
