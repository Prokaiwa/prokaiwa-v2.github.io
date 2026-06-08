import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const VAPID_PUBLIC_KEY      = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY     = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_SUBJECT         = "mailto:prokaiwa.english@gmail.com";

// ── Base64url helpers ─────────────────────────────────────────────────────────

function b64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad  = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, "=");
  return Uint8Array.from(atob(pad), c => c.charCodeAt(0));
}

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ── VAPID JWT ─────────────────────────────────────────────────────────────────

async function signVapidJwt(audience: string): Promise<string> {
  const header  = { alg: "ES256", typ: "JWT" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 43200,
    sub: VAPID_SUBJECT,
  };

  const b64obj = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const unsigned = `${b64obj(header)}.${b64obj(payload)}`;

  const privBytes = b64urlDecode(VAPID_PRIVATE_KEY);
  const pubBytes  = b64urlDecode(VAPID_PUBLIC_KEY);

  // Import raw EC private key as JWK (Deno does not support pkcs8 for raw keys)
  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC", crv: "P-256",
      x: b64urlEncode(pubBytes.slice(1, 33)),
      y: b64urlEncode(pubBytes.slice(33, 65)),
      d: b64urlEncode(privBytes),
      key_ops: ["sign"],
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned)
  );

  return `${unsigned}.${b64urlEncode(sig)}`;
}

// ── Web Push payload encryption (RFC 8291 + RFC 8188 aes128gcm) ──────────────
//
// Three bugs that cause silent drop (Apple returns 201 but device discards):
//   1. CEK info must be EXACTLY "Content-Encoding: aes128gcm\x00" (one null).
//      enc.encode("...\0") already includes the null — do NOT append another 0.
//   2. Nonce info must be EXACTLY "Content-Encoding: nonce\x00" (one null).
//      Same issue.
//   3. Record size (rs) must be a fixed value (4096). Computing it from
//      encrypted.length produces a wrong rs that fails structural validation.

async function encryptPayload(
  payload: string,
  p256dhB64: string,
  authB64: string
): Promise<Uint8Array> {
  const enc        = new TextEncoder();
  const authSecret = b64urlDecode(authB64);
  const receiverPub = b64urlDecode(p256dhB64);   // ua public key — 65 bytes

  // 1. Ephemeral sender key pair
  const senderPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]
  );
  const senderPubRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", senderPair.publicKey)
  );   // 65 bytes

  // 2. ECDH shared secret
  const receiverKey = await crypto.subtle.importKey(
    "raw", receiverPub, { name: "ECDH", namedCurve: "P-256" }, false, []
  );
  const ecdhSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: receiverKey },
    senderPair.privateKey,
    256
  );

  // 3. IKM via HKDF-Extract(auth_secret, ecdh_secret)  — RFC 8291 §3.1
  //    info = "WebPush: info\x00" + ua_public + as_public
  const ikmInfo = new Uint8Array([
    ...enc.encode("WebPush: info\x00"),
    ...receiverPub,
    ...senderPubRaw,
  ]);
  const ecdhKey = await crypto.subtle.importKey(
    "raw", ecdhSecret, { name: "HKDF" }, false, ["deriveBits"]
  );
  const ikm = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: ikmInfo },
    ecdhKey, 256
  );

  // 4. Random 16-byte salt for content encryption
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const ikmKey = await crypto.subtle.importKey(
    "raw", ikm, { name: "HKDF" }, false, ["deriveBits"]
  );

  // 5. CEK — 16 bytes  (RFC 8188 §2.1)
  //    ✅ CORRECT: enc.encode("...aes128gcm\x00") already ends with one null byte.
  //    ❌ WRONG was: [...enc.encode("...aes128gcm\0"), 0]  — two nulls → wrong key
  const cekBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF", hash: "SHA-256", salt,
      info: enc.encode("Content-Encoding: aes128gcm\x00"),
    },
    ikmKey, 128
  );

  // 6. Nonce — 12 bytes  (RFC 8188 §2.1)
  //    ✅ CORRECT: one null byte only.
  const nonceBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF", hash: "SHA-256", salt,
      info: enc.encode("Content-Encoding: nonce\x00"),
    },
    ikmKey, 96
  );

  // 7. AES-128-GCM encrypt with padding delimiter
  const cek = await crypto.subtle.importKey(
    "raw", cekBits, { name: "AES-GCM" }, false, ["encrypt"]
  );

  const plaintext = enc.encode(payload);
  const padded    = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext);
  padded[plaintext.length] = 0x02;   // last-record delimiter

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonceBits }, cek, padded)
  );

  // 8. Build aes128gcm body  (RFC 8188 §2.1)
  //    Header: salt(16) | rs(4, big-endian) | keyid_len(1) | sender_pub(65)
  //    ✅ CORRECT: rs is a fixed 4096, NOT derived from encrypted.length.
  //    ❌ WRONG was: encrypted.length + 16 — structural validation failure.
  const RS     = 4096;
  const header = new Uint8Array(21 + senderPubRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, RS, false);
  header[20] = senderPubRaw.length;   // keyid length = 65
  header.set(senderPubRaw, 21);

  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header);
  body.set(ciphertext, header.length);
  return body;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const { studentName, messagePreview } = await req.json();
    console.log("push: called for", studentName);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { data: subs, error } = await supabase.from("push_subscriptions").select("*");

    if (error) throw error;
    console.log("push: subscriptions found:", subs?.length ?? 0);
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 });
    }

    const notifPayload = JSON.stringify({
      title: `📬 ${studentName} replied`,
      body:  messagePreview
        ? messagePreview.substring(0, 120)
        : `New response from ${studentName}`,
      data:  { url: "/teacher-portal.html" },
    });

    let sent = 0;
    const expired: string[] = [];

    for (const sub of subs) {
      try {
        const url      = new URL(sub.endpoint);
        const audience = `${url.protocol}//${url.host}`;
        const jwt      = await signVapidJwt(audience);
        const body     = await encryptPayload(notifPayload, sub.p256dh, sub.auth);

        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Authorization":    `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
            "Content-Type":     "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            "TTL":              "86400",
            "apns-topic":       `web.${VAPID_PUBLIC_KEY}`,
            "apns-push-type":   "alert",
            "apns-priority":    "10",
          },
          body,
        });

        const resText = await res.text();
        console.log(`push: Apple ${res.status} — "${resText}"`);

        if (res.status === 410 || res.status === 404) {
          expired.push(sub.endpoint);
        } else if (res.ok) {
          sent++;
          console.log("push: delivered successfully");
        } else {
          console.error(`push: rejected ${res.status}: ${resText}`);
        }
      } catch (e) {
        console.error("push: per-sub error:", e);
      }
    }

    if (expired.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", expired);
      console.log("push: cleaned up", expired.length, "expired subscriptions");
    }

    console.log("push: done, sent:", sent);
    return new Response(JSON.stringify({ ok: true, sent }), { status: 200 });

  } catch (err) {
    console.error("push: fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});