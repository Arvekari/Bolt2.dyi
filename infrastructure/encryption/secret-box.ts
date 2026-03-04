function toBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importAesKey(secret: string) {
  const normalized = secret.padEnd(32, '0').slice(0, 32);

  return crypto.subtle.importKey('raw', toBytes(normalized), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(value: string, secret: string): Promise<string> {
  const key = await importAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, toBytes(value));

  const payload = {
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted)),
  };

  return JSON.stringify(payload);
}

export async function decryptSecret(payload: string, secret: string): Promise<string | null> {
  try {
    const parsed = JSON.parse(payload) as { iv: string; data: string };
    const key = await importAesKey(secret);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(parsed.iv) },
      key,
      fromBase64(parsed.data),
    );

    return new TextDecoder().decode(new Uint8Array(decrypted));
  } catch {
    return null;
  }
}
