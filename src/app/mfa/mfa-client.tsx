"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; type: string; name: string };
type Mode = "choose" | "enroll-totp" | "verify-totp" | "working" | "done";

/**
 * Second factor for the current session. Two paths, both end at aal2:
 *  - "This device" → a WebAuthn factor (Face ID / Touch ID / Windows Hello / security key)
 *  - "Authenticator app" → a TOTP factor (QR code + 6-digit code)
 * Existing factors are offered first; enrollment only when the person has none.
 */
export function MfaClient({ factors, next }: { factors: Factor[]; next: string }) {
  const router = useRouter();
  const supabase = createClient();
  const webauthn = factors.filter((f) => f.type === "webauthn");
  const totp = factors.filter((f) => f.type === "totp");
  const [mode, setMode] = useState<Mode>("choose");
  const [error, setError] = useState("");
  const [qr, setQr] = useState<{ factorId: string; svg: string; secret: string } | null>(null);
  const [activeTotp, setActiveTotp] = useState<string>(totp[0]?.id ?? "");
  const [code, setCode] = useState("");
  const canWebauthn = typeof window !== "undefined" && "PublicKeyCredential" in window;

  const finish = () => { setMode("done"); router.replace(next); router.refresh(); };
  const fail = (msg: string) => { setError(msg); setMode("choose"); };

  async function useDevice(factorId: string) {
    setError(""); setMode("working");
    const { error } = await supabase.auth.mfa.webauthn.authenticate({ factorId });
    if (error) return fail(friendly(error.message));
    finish();
  }

  async function registerDevice() {
    setError(""); setMode("working");
    const { error } = await supabase.auth.mfa.webauthn.register({ friendlyName: deviceName() });
    if (error) return fail(friendly(error.message));
    finish();
  }

  async function startTotp() {
    setError(""); setMode("working");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
    if (error || !data) return fail(friendly(error?.message ?? "Could not start."));
    setQr({ factorId: data.id, svg: data.totp.qr_code, secret: data.totp.secret });
    setActiveTotp(data.id);
    setMode("enroll-totp");
  }

  async function verifyTotp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: activeTotp, code: code.replace(/\s/g, "") });
    if (error) { setError("That code didn’t match. Codes change every 30 seconds — try the newest one."); return; }
    finish();
  }

  if (mode === "working") return <p className="text-center text-ink-soft">Waiting for your device…</p>;
  if (mode === "done") return <p className="text-center text-ink-soft">Verified. Opening the binder…</p>;

  if (mode === "enroll-totp" && qr) {
    return (
      <form onSubmit={verifyTotp} className="flex flex-col gap-4">
        <h2 className="text-[1.3rem] font-semibold">Set up an authenticator app</h2>
        <ol className="list-decimal space-y-1 pl-5 text-ink-soft">
          <li>Open Google Authenticator, 1Password, or a similar app.</li>
          <li>Scan this code (or type the key below it).</li>
          <li>Enter the 6-digit number the app shows.</li>
        </ol>
        <div className="mx-auto w-[200px] rounded-xl border border-rule bg-white p-2" dangerouslySetInnerHTML={{ __html: qr.svg }} />
        <p className="break-all text-center text-[0.85rem] text-ink-soft">Key: {qr.secret}</p>
        <CodeField code={code} setCode={setCode} />
        {error && <p className="text-ember">{error}</p>}
        <button className="btn-primary">Verify</button>
        <button type="button" onClick={() => setMode("choose")} className="btn text-ink-soft">Back</button>
      </form>
    );
  }

  if (mode === "verify-totp") {
    return (
      <form onSubmit={verifyTotp} className="flex flex-col gap-4">
        <h2 className="text-[1.3rem] font-semibold">Enter the code from your authenticator app</h2>
        <CodeField code={code} setCode={setCode} />
        {error && <p className="text-ember">{error}</p>}
        <button className="btn-primary">Verify</button>
        <button type="button" onClick={() => setMode("choose")} className="btn text-ink-soft">Back</button>
      </form>
    );
  }

  const hasAny = factors.length > 0;
  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-xl bg-ember-tint px-4 py-3 text-ember">{error}</p>}
      {!hasAny && <p className="text-ink-soft">First time here. Pick the way you’d like to verify from now on; you can add the other later.</p>}

      {canWebauthn && (
        <section className="rounded-xl border border-rule p-4">
          <h2 className="text-[1.2rem] font-semibold">Use this device</h2>
          <p className="mb-3 text-[0.95rem] text-ink-soft">Face ID, Touch ID, a fingerprint, or your device passcode. Easiest on an iPad or phone.</p>
          {webauthn.length > 0
            ? webauthn.map((f) => <button key={f.id} type="button" onClick={() => useDevice(f.id)} className="btn-primary mb-2 w-full">Verify with {f.name || "this device"}</button>)
            : null}
          <button type="button" onClick={registerDevice} className={`${webauthn.length ? "btn-secondary" : "btn-primary"} w-full`}>
            {webauthn.length ? "Add another device" : "Set up this device"}
          </button>
        </section>
      )}

      <section className="rounded-xl border border-rule p-4">
        <h2 className="text-[1.2rem] font-semibold">Use an authenticator app</h2>
        <p className="mb-3 text-[0.95rem] text-ink-soft">A 6-digit code from Google Authenticator, 1Password, or similar.</p>
        {totp.length > 0
          ? <button type="button" onClick={() => { setActiveTotp(totp[0].id); setMode("verify-totp"); }} className="btn-primary w-full">Enter a code</button>
          : <button type="button" onClick={startTotp} className={`${canWebauthn ? "btn-secondary" : "btn-primary"} w-full`}>Set up an app</button>}
      </section>

      <form action="/logout" method="post" className="text-center">
        <button className="min-h-0 text-[0.9rem] text-ink-soft underline">Sign out instead</button>
      </form>
    </div>
  );
}

function CodeField({ code, setCode }: { code: string; setCode: (s: string) => void }) {
  return (
    <div>
      <label htmlFor="code" className="label">6-digit code</label>
      <input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required value={code}
        onChange={(e) => setCode(e.target.value)} className="field text-center font-mono text-[1.6rem] tracking-[0.3em]" placeholder="123 456" />
    </div>
  );
}

function deviceName() {
  const ua = navigator.userAgent;
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iPad";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android phone";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  return "This device";
}

function friendly(msg: string) {
  if (/not allowed|NotAllowedError|cancel|abort/i.test(msg)) return "That was cancelled. Try again when you’re ready.";
  if (/not supported|NotSupported/i.test(msg)) return "This device can’t do that. Use the authenticator app option instead.";
  return msg;
}
