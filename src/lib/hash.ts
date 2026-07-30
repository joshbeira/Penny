// SPEC 9.2's sha256Hex(). crypto.subtle needs a secure context — localhost
// counts, and SPEC 0 targets HTTPS everywhere else.
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
