import { createHmac, timingSafeEqual } from "node:crypto";

export function safeCompare(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function signPayloadHmacSha256(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyHmacSha256Signature(input: {
  payload: string;
  secret: string;
  signature: string;
  prefix?: string;
}) {
  const expected = signPayloadHmacSha256(input.payload, input.secret);
  const actual = input.prefix
    ? input.signature.replace(`${input.prefix}=`, "")
    : input.signature;
  return safeCompare(expected, actual);
}
