import "server-only";

import { isIP } from "node:net";

type RequestHeaders = Pick<Headers, "get">;

export function getIngressClientAddress(headers: RequestHeaders) {
  const forwardedChain = headers.get("x-forwarded-for");
  const candidate = forwardedChain
    ? forwardedChain.split(",").at(-1)
    : headers.get("x-real-ip");
  const address = candidate?.trim() ?? "";

  return isIP(address) ? address : "unavailable";
}
