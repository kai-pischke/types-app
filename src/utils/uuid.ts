export function uuidv4(): string {
    // Prefer native if it ever exists
    const c: any = (typeof window !== "undefined") ? (window as any).crypto : undefined;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  
    // Fallback using getRandomValues
    if (c && typeof c.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
  
      // RFC 4122 version 4
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  
    // Last resort (non-crypto)
    return `id-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  }
