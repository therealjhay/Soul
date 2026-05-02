"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Nav } from "../../components/Nav";
import { StatusDot } from "../../components/StatusDot";
import { ScanSkeleton, ScanSkeletonBlock } from "../../components/ScanSkeleton";
import { useCounter } from "../../hooks/useCounter";
import { useQuery } from "@tanstack/react-query";
import { getIssuers, Issuer } from "../../lib/api";
import { MOCK_ISSUERS } from "../../lib/mockData";

// ─── Apply Overlay ────────────────────────────────────────────────────────

function ApplyOverlay({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");

  return (
    <motion.div
      id="apply-overlay"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        backgroundColor: "var(--bg-base)",
        overflowY: "auto",
        padding: "60px 48px",
      }}
    >
      <div style={{ maxWidth: 640 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 }}>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>ISSUER REGISTRY</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 56px)", margin: 0, color: "var(--text-primary)", letterSpacing: "0.04em" }}>
              APPLY AS ISSUER
            </h2>
          </div>
          <button
            id="apply-close"
            onClick={onClose}
            className="btn btn--destructive"
            style={{ fontSize: 10 }}
          >
            CLOSE ✕
          </button>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ border: "1px solid var(--accent)", padding: 32 }}
          >
            <div className="label" style={{ color: "var(--accent)", marginBottom: 12 }}>APPLICATION RECEIVED</div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Your application has been submitted for review. The SOUL team will verify your issuer status and contact you at the provided URL within 5–10 business days.
            </p>
          </motion.div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 36 }}
          >
            <div>
              <label className="input-label" htmlFor="apply-name">ISSUER NAME</label>
              <input
                id="apply-name"
                className="input-field"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Superteam"
                required
              />
            </div>
            <div>
              <label className="input-label" htmlFor="apply-type">ISSUER TYPE</label>
              <select
                id="apply-type"
                className="input-field"
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
                style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
              >
                <option value="">SELECT TYPE</option>
                <option value="DAO">DAO</option>
                <option value="PROTOCOL">PROTOCOL</option>
                <option value="HACKATHON">HACKATHON</option>
                <option value="SOCIAL">SOCIAL</option>
                <option value="DEFI">DEFI</option>
              </select>
            </div>
            <div>
              <label className="input-label" htmlFor="apply-url">INTEGRATION URL</label>
              <input
                id="apply-url"
                className="input-field"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-protocol.xyz"
                required
              />
            </div>
            <button
              type="submit"
              id="apply-submit"
              className="btn"
              style={{ borderColor: "var(--accent)", color: "var(--accent)", fontSize: 12, padding: "14px 32px", alignSelf: "flex-start" }}
            >
              SUBMIT APPLICATION →
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
}

// ─── Issuer Row ───────────────────────────────────────────────────────────

function IssuerRow({ issuer, index }: { issuer: Issuer; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const statusToVariant: Record<string, "active" | "pending" | "revoked"> = {
    VERIFIED: "active",
    PENDING: "pending",
    REVOKED: "revoked",
  };

  return (
    <>
      {/* Main row */}
      <motion.tr
        initial={{ clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: "inset(0 0% 0 0)" }}
        transition={{ delay: index * 0.03, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => setExpanded((e) => !e)}
        style={{ cursor: "pointer" }}
        id={`issuer-row-${issuer.id}`}
      >
        <td style={{ padding: "16px 20px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <StatusDot status={statusToVariant[issuer.status] || "pending"} />
            {issuer.name}
          </div>
        </td>
        <td style={{ padding: "16px 20px", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", color: "var(--text-secondary)" }}>
          {issuer.type}
        </td>
        <td style={{ padding: "16px 20px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
          {issuer.sbts_issued.toLocaleString()}
        </td>
        <td style={{ padding: "16px 20px", fontFamily: "var(--font-mono)", fontSize: 13, color: issuer.weight > 0 ? "var(--accent)" : "var(--text-muted)" }}>
          {issuer.weight > 0 ? `${issuer.weight}/100` : "—"}
        </td>
        <td style={{ padding: "16px 20px", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--text-secondary)" }}>
          {issuer.status}
        </td>
        <td style={{ padding: "16px 20px" }}>
          {issuer.verified ? (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em" }}>✓ YES</span>
          ) : (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>—</span>
          )}
        </td>
        <td style={{ padding: "16px 20px", color: "var(--text-muted)", fontSize: 12 }}>
          {expanded ? "▲" : "▼"}
        </td>
      </motion.tr>

      {/* Expandable detail panel */}
      <tr>
        <td colSpan={7} style={{ padding: 0 }}>
          <div
            style={{
              display: "grid",
              gridTemplateRows: expanded ? "1fr" : "0fr",
              transition: "grid-template-rows 240ms var(--ease-in)",
              overflow: "hidden",
            }}
          >
            <div style={{ minHeight: 0 }}>
              <motion.div
                initial={false}
                animate={{ opacity: expanded ? 1 : 0 }}
                transition={{ delay: expanded ? 0.06 : 0, duration: 0.18 }}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderTop: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  padding: "24px 20px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr auto",
                  gap: 32,
                }}
              >
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>DESCRIPTION</div>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                    {issuer.description || "No description available."}
                  </p>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>SBT TYPES ISSUED</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {(issuer.sbt_types ?? []).length > 0 ? (
                      issuer.sbt_types!.map((t) => (
                        <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", color: "var(--text-secondary)" }}>
                          · {t}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>NONE YET</span>
                    )}
                  </div>
                </div>
                {issuer.integration_url && (
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <a
                      href={issuer.integration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ fontSize: 10, textDecoration: "none" }}
                    >
                      REQUEST INTEGRATION →
                    </a>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

// ─── Issuers Page ─────────────────────────────────────────────────────────

export default function IssuersPage() {
  const [applyOpen, setApplyOpen] = useState(false);

  const { data: issuers, isLoading } = useQuery({
    queryKey: ["issuers"],
    queryFn: getIssuers,
    retry: false,
    initialData: MOCK_ISSUERS,
  });

  const verified = (issuers ?? []).filter((i) => i.status === "VERIFIED");
  const pending = (issuers ?? []).filter((i) => i.status === "PENDING");

  const { count: verifiedCount, ref: verifiedRef } = useCounter({ target: verified.length });
  const { count: pendingCount, ref: pendingRef } = useCounter({ target: pending.length });

  return (
    <>
      <Nav />
      <main
        id="issuers-page"
        style={{
          minHeight: "100vh",
          paddingTop: 56,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          style={{
            padding: "40px 40px 32px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <div className="label" style={{ marginBottom: 8 }}>SOUL PROTOCOL</div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(36px, 5vw, 72px)",
                margin: 0,
                letterSpacing: "0.04em",
                lineHeight: 1,
                color: "var(--text-primary)",
              }}
            >
              ISSUER REGISTRY
            </h1>
          </div>

          {/* Stat counters */}
          <div style={{ display: "flex", gap: 48 }}>
            <div ref={verifiedRef as React.RefObject<HTMLDivElement>}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 48,
                  lineHeight: 1,
                  color: "var(--accent)",
                  letterSpacing: "0.02em",
                }}
              >
                {verifiedCount}
              </div>
              <div className="label">VERIFIED ISSUERS</div>
            </div>
            <div ref={pendingRef as React.RefObject<HTMLDivElement>}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 48,
                  lineHeight: 1,
                  color: "var(--warning)",
                  letterSpacing: "0.02em",
                }}
              >
                {pendingCount}
              </div>
              <div className="label">PENDING REVIEW</div>
            </div>
          </div>
        </motion.div>

        {/* Table */}
        <div style={{ flex: 1, overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: 40 }}>
              <ScanSkeletonBlock lines={8} />
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["ISSUER", "TYPE", "SBTS ISSUED", "WEIGHT", "STATUS", "VERIFIED", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "12px 20px",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        fontWeight: 400,
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(issuers ?? []).map((issuer, i) => (
                  <IssuerRow key={issuer.id} issuer={issuer} index={i} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Apply button — fixed bottom right */}
        <button
          id="issuers-apply"
          onClick={() => setApplyOpen(true)}
          className="btn"
          style={{
            position: "fixed",
            bottom: 32,
            right: 32,
            zIndex: 100,
            borderColor: "var(--accent)",
            color: "var(--accent)",
            fontSize: 11,
            padding: "12px 24px",
          }}
        >
          APPLY AS ISSUER →
        </button>

        {/* Apply overlay */}
        <AnimatePresence>
          {applyOpen && <ApplyOverlay onClose={() => setApplyOpen(false)} />}
        </AnimatePresence>
      </main>
    </>
  );
}
