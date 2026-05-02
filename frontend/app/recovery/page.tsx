"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Nav } from "../../components/Nav";
import { ScanSkeleton } from "../../components/ScanSkeleton";
import { submitRecovery } from "../../lib/programs";
import { useWalletCtx } from "../WalletContext";

// ─── Solana address validation (base58, 32–44 chars) ──────────────────────

const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function isValidSolanaAddress(addr: string): boolean {
  return addr.length >= 32 && addr.length <= 44 && addr.split("").every((c) => BASE58_CHARS.includes(c));
}

// ─── SVG Checkmark ───────────────────────────────────────────────────────

function CheckmarkSVG({ visible }: { visible: boolean }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <polyline
        points="3,10 8,15 17,5"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="square"
        strokeDasharray={24}
        strokeDashoffset={visible ? 0 : 24}
        style={{ transition: "stroke-dashoffset 200ms var(--ease-in)" }}
      />
    </svg>
  );
}

// ─── Lock Icon ────────────────────────────────────────────────────────────

function LockIcon({ closed }: { closed: boolean }) {
  return (
    <svg
      width={40}
      height={48}
      viewBox="0 0 40 48"
      fill="none"
      style={{
        transition: "all 120ms steps(2)",
      }}
    >
      {/* Shackle — moves up when open, snaps down when closed */}
      <path
        d={closed
          ? "M10 20 L10 14 Q10 6 20 6 Q30 6 30 14 L30 20"
          : "M10 20 L10 10 Q10 2 20 2 Q30 2 30 10 L30 16"}
        stroke="var(--accent)"
        strokeWidth={3}
        strokeLinecap="square"
        fill="none"
        style={{ transition: "d 120ms steps(2)" }}
      />
      {/* Body */}
      <rect x={4} y={20} width={32} height={24} stroke="var(--accent)" strokeWidth={2} fill="none" />
      {/* Keyhole */}
      <circle cx={20} cy={32} r={3} fill={closed ? "var(--accent)" : "none"} stroke="var(--accent)" strokeWidth={2} />
      {closed && <line x1={20} y1={35} x2={20} y2={40} stroke="var(--accent)" strokeWidth={2} />}
    </svg>
  );
}

// ─── Guardian Input Field ─────────────────────────────────────────────────

function GuardianInput({
  index,
  value,
  onChange,
}: {
  index: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const [touched, setTouched] = useState(false);
  const valid = isValidSolanaAddress(value);
  const invalid = touched && value.length > 0 && !valid;

  return (
    <div>
      <label className="input-label" htmlFor={`guardian-${index}`}>
        GUARDIAN {index + 1}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <input
          id={`guardian-${index}`}
          className="input-field"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Solana wallet address"
          spellCheck={false}
          style={{
            flex: 1,
            borderBottomColor: invalid ? "var(--destructive)" : valid ? "var(--accent)" : undefined,
          }}
        />
        <CheckmarkSVG visible={valid} />
      </div>
      {invalid && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--destructive)", marginTop: 6 }}>
          INVALID SOLANA ADDRESS
        </p>
      )}
    </div>
  );
}

// ─── Progress Dots ────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i < current ? 24 : 8,
            height: 8,
            backgroundColor: i < current ? "var(--accent)" : "var(--border)",
            transition: "all 240ms var(--ease-in)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Recovery Page ────────────────────────────────────────────────────────

export default function RecoveryPage() {
  const { address } = useWalletCtx();
  const wallet = address || "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

  const [step, setStep] = useState(0);
  const [guardians, setGuardians] = useState(["", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configHash, setConfigHash] = useState<string | null>(null);
  const [lockClosed, setLockClosed] = useState(false);

  const validCount = guardians.filter(isValidSolanaAddress).length;
  const allValid = validCount === 3;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitRecovery(wallet, guardians);
      setConfigHash(result.configHash);
      // Animate lock
      setTimeout(() => setLockClosed(true), 300);
      setTimeout(() => setStep(3), 800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    // Step 0: Explanation
    <motion.div
      key="step0"
      initial={{ opacity: 0, x: 0 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "-100vw" }}
      transition={{ duration: 0.3, ease: [0.7, 0, 0.84, 0] }}
      style={{ maxWidth: 540 }}
    >
      <div className="label" style={{ marginBottom: 12 }}>SOCIAL RECOVERY</div>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(36px, 5vw, 64px)",
          lineHeight: 1,
          letterSpacing: "0.04em",
          color: "var(--text-primary)",
          margin: "0 0 32px",
        }}
      >
        GUARDIAN SETUP
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
        {[
          "Your SOUL passport is tied to your wallet. If you lose access, 2 of 3 guardians can restore it.",
          "Guardians are Solana wallets — trusted people or your own secondary wallets.",
          "Guardian addresses are stored on-chain in the recovery-guard program. They cannot be changed without a new recovery setup.",
          "You are NOT giving guardians control of your assets. Only reputation passport recovery access.",
        ].map((text, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", flexShrink: 0, marginTop: 2 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              {text}
            </p>
          </div>
        ))}
      </div>
      <button
        id="recovery-start"
        onClick={() => setStep(1)}
        className="btn"
        style={{ fontSize: 12, padding: "14px 32px", borderColor: "var(--accent)", color: "var(--accent)" }}
      >
        SET UP GUARDIANS →
      </button>
    </motion.div>,

    // Step 1: Guardian inputs
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: "100vw" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "-100vw" }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ maxWidth: 540 }}
    >
      <div className="label" style={{ marginBottom: 12 }}>STEP 2 OF 3</div>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(28px, 4vw, 48px)",
          lineHeight: 1,
          letterSpacing: "0.04em",
          color: "var(--text-primary)",
          margin: "0 0 40px",
        }}
      >
        ADD GUARDIANS
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 32, marginBottom: 40 }}>
        {guardians.map((g, i) => (
          <GuardianInput
            key={i}
            index={i}
            value={g}
            onChange={(v) => setGuardians((prev) => prev.map((x, j) => (j === i ? v : x)))}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          id="recovery-back-1"
          onClick={() => setStep(0)}
          className="btn"
          style={{ fontSize: 11 }}
        >
          ← BACK
        </button>
        <button
          id="recovery-next-2"
          onClick={() => setStep(2)}
          disabled={!allValid}
          className="btn"
          style={{
            fontSize: 11,
            flex: 1,
            justifyContent: "center",
            borderColor: allValid ? "var(--accent)" : "var(--border)",
            color: allValid ? "var(--accent)" : "var(--text-muted)",
          }}
        >
          REVIEW & SIGN →
        </button>
      </div>
    </motion.div>,

    // Step 2: Confirm + submit
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: "100vw" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "-100vw" }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ maxWidth: 540 }}
    >
      <div className="label" style={{ marginBottom: 12 }}>STEP 3 OF 3</div>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(28px, 4vw, 48px)",
          lineHeight: 1,
          letterSpacing: "0.04em",
          color: "var(--text-primary)",
          margin: "0 0 40px",
        }}
      >
        CONFIRM GUARDIANS
      </h2>

      <div style={{ border: "1px solid var(--border)", marginBottom: 32 }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
          <div className="label">WALLET</div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
            {wallet.slice(0, 8)}…{wallet.slice(-6)}
          </span>
        </div>
        {guardians.map((g, i) => (
          <div key={i} style={{ padding: "12px 20px", borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
            <div className="label">GUARDIAN {i + 1}</div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
              {g.slice(0, 8)}…{g.slice(-6)}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--destructive)", marginBottom: 16 }}>
          ERROR: {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
        <LockIcon closed={lockClosed} />
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
          By signing, you authorize these wallets as recovery guardians in the SOUL on-chain registry.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          id="recovery-back-2"
          onClick={() => setStep(1)}
          disabled={submitting}
          className="btn"
          style={{ fontSize: 11 }}
        >
          ← BACK
        </button>
        <button
          id="recovery-submit"
          onClick={handleSubmit}
          disabled={submitting}
          className="btn"
          style={{
            fontSize: 11,
            flex: 1,
            justifyContent: "center",
            borderColor: "var(--accent)",
            color: "var(--accent)",
          }}
        >
          {submitting ? <ScanSkeleton height={14} width="120px" /> : "SIGN & SUBMIT →"}
        </button>
      </div>
    </motion.div>,

    // Step 3: Success
    <motion.div
      key="step3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ maxWidth: 540 }}
    >
      <div style={{ border: "1px solid var(--accent)", padding: 40 }}>
        <div
          className="label"
          style={{ color: "var(--accent)", marginBottom: 12, letterSpacing: "0.2em" }}
        >
          RECOVERY CONFIGURED
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 4vw, 48px)",
            lineHeight: 1,
            letterSpacing: "0.04em",
            color: "var(--text-primary)",
            margin: "0 0 24px",
          }}
        >
          GUARDIANS SET
        </h2>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 24 }}>
          Your 3 guardians have been registered on-chain. Save this configuration hash — you may need it if you ever initiate recovery.
        </p>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
          <div className="label" style={{ marginBottom: 8 }}>RECOVERY CONFIG HASH</div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", wordBreak: "break-all" }}>
            {configHash}
          </span>
        </div>
      </div>
    </motion.div>,
  ];

  return (
    <>
      <Nav />
      <main
        id="recovery-page"
        style={{
          minHeight: "100vh",
          paddingTop: 56,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px 48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Progress indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 48, display: "flex", alignItems: "center", gap: 20 }}
        >
          <ProgressDots current={Math.min(step + 1, 3)} total={3} />
          <span className="label">
            {step === 0 ? "OVERVIEW" : step === 1 ? "GUARDIANS" : step === 2 ? "CONFIRM" : "DONE"}
          </span>
        </motion.div>

        {/* Step container — fixed size, horizontal slides */}
        <div style={{ width: "100%", overflow: "hidden" }}>
          <AnimatePresence mode="wait">
            {steps[step]}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
