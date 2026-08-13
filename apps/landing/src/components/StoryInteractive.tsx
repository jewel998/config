import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

type User = { name: string; plan: string; country: string; tenant: string };
type Flags = {
  newCheckout: boolean;
  uploadLimit: string;
  darkMode: boolean;
  aiAssistant: boolean;
};

const USERS: User[] = [
  { name: "Sarah", plan: "enterprise", country: "US", tenant: "Acme Corp" },
  { name: "Tom", plan: "free", country: "US", tenant: "Personal" },
  { name: "Priya", plan: "pro", country: "IN", tenant: "StartupXYZ" },
  { name: "Kai", plan: "enterprise", country: "DE", tenant: "AutoTech GmbH" },
];

function resolve(user: User): Flags {
  const isEnterprise = user.plan === "enterprise";
  const isPro = user.plan === "pro";
  const eligibleCountry = user.country === "US" || user.country === "DE";
  return {
    newCheckout: (isEnterprise || isPro) && eligibleCountry,
    uploadLimit: isEnterprise ? "500 MB" : isPro ? "200 MB" : "25 MB",
    darkMode: user.plan !== "free",
    aiAssistant: isEnterprise,
  };
}

export default function StoryInteractive() {
  const [activeStep, setActiveStep] = useState(0);
  const [userIdx, setUserIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const user = USERS[userIdx];
  const flags = resolve(user);

  useEffect(() => {
    const steps = document.querySelectorAll(".story-step");
    if (!steps.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const n = Number((e.target as HTMLElement).dataset.step) - 1;
            setActiveStep(n);
            steps.forEach((s) => s.classList.remove("active"));
            e.target.classList.add("active");
          }
        });
      },
      { threshold: 0.5 },
    );
    steps.forEach((s) => obs.observe(s));
    steps[0]?.classList.add("active");
    return () => obs.disconnect();
  }, []);

  function switchUser(i: number) {
    setRefreshing(true);
    setUserIdx(i);
    setTimeout(() => setRefreshing(false), 250);
  }

  // Sync user to step context
  useEffect(() => {
    if (activeStep === 1) setUserIdx(0); // Sarah
    if (activeStep === 2) setUserIdx(1); // Tom
  }, [activeStep]);

  return (
    <div style={{ width: "100%" }}>
      <div className="sim-screen">
        {/* Title bar */}
        <div className="sim-bar">
          <div className="sim-dots">
            <span />
            <span />
            <span />
          </div>
          <span className="sim-title">
            {activeStep === 0 ||
            activeStep === 3 ||
            activeStep === 4 ||
            activeStep === 5
              ? "Portal — Flag Manager"
              : `App — ${user.name}'s View`}
          </span>
        </div>

        {/* Main visual — always shows the selected user's app state */}
        <div className="sim-body">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeStep}-${userIdx}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              {/* Portal: Flag creation */}
              {activeStep === 0 && (
                <div className="sim-card">
                  <div className="sim-card-head">
                    <code className="sim-fname">feature.new_checkout</code>
                    <span className="badge-on">Active</span>
                  </div>
                  <div className="sim-rows">
                    <div className="sim-row">
                      <span className="sim-lbl">Segment</span>
                      <span>Enterprise users in US & DE</span>
                    </div>
                    <div className="sim-row">
                      <span className="sim-lbl">Match</span>
                      <span className="c-green">true</span>
                    </div>
                    <div className="sim-row">
                      <span className="sim-lbl">Default</span>
                      <span className="c-red">false</span>
                    </div>
                  </div>
                </div>
              )}

              {/* App view — user-specific */}
              {(activeStep === 1 || activeStep === 2) && (
                <div className="sim-appview">
                  <div className="sim-userlabel">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="7" r="4" />
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    </svg>
                    {user.name} — {user.plan}, {user.country}
                  </div>
                  <div
                    className={`sim-mockui ${flags.newCheckout ? "variant-new" : "variant-old"}`}
                  >
                    <div className="sim-mockui-title">
                      {flags.newCheckout
                        ? "✨ New Checkout"
                        : "Standard Checkout"}
                    </div>
                    <div className="sim-mockui-bars">
                      <div />
                      <div />
                      {flags.newCheckout && <div className="short" />}
                    </div>
                    <div
                      className={`sim-mockui-btn ${flags.newCheckout ? "" : "btn-muted"}`}
                    >
                      {flags.newCheckout ? "Complete Purchase" : "Proceed"}
                    </div>
                  </div>
                  <div className="sim-resp">
                    <code>
                      new_checkout:{" "}
                      <span className={flags.newCheckout ? "c-green" : "c-red"}>
                        {String(flags.newCheckout)}
                      </span>
                    </code>
                    <span className="sim-latency">48ms</span>
                  </div>
                </div>
              )}

              {/* Multi-tenant */}
              {activeStep === 3 && (
                <div className="sim-tenants">
                  <div className="sim-tenant-head">Configs by Organization</div>
                  {USERS.map((u, i) => {
                    const f = resolve(u);
                    return (
                      <div
                        key={u.name}
                        className={`sim-tenant-row ${i === userIdx ? "highlighted" : ""}`}
                        onClick={() => switchUser(i)}
                      >
                        <div className="sim-tenant-info">
                          <span className="sim-tenant-name">{u.tenant}</span>
                          <span className="sim-tenant-plan">{u.plan}</span>
                        </div>
                        <div className="sim-tenant-vals">
                          <span className={f.newCheckout ? "c-green" : "c-red"}>
                            checkout:{String(f.newCheckout)}
                          </span>
                          <span className="c-dim">upload:{f.uploadLimit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rollout */}
              {activeStep === 4 && (
                <div className="sim-card">
                  <div className="sim-card-head">
                    <code className="sim-fname">feature.new_checkout</code>
                    <span className="badge-on">Rollout</span>
                  </div>
                  <div className="sim-rollout-bar">
                    <div className="sim-rollout-fill" />
                  </div>
                  <div className="sim-rollout-txt">
                    50% of Pro users — deterministic per userId
                  </div>
                  <div className="sim-rows" style={{ marginTop: 10 }}>
                    <div className="sim-row">
                      <span className="sim-lbl">Priya</span>
                      <span className="c-green">In rollout (hash=34)</span>
                    </div>
                    <div className="sim-row">
                      <span className="sim-lbl">Alex</span>
                      <span className="c-red">Not in rollout (hash=72)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Kill switch */}
              {activeStep === 5 && (
                <div className="sim-card sim-killed">
                  <div className="sim-card-head">
                    <code className="sim-fname">feature.new_checkout</code>
                    <span className="badge-off">Killed</span>
                  </div>
                  <div className="sim-kill-msg">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#f87171"
                      strokeWidth="2"
                    >
                      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    All users → <code className="c-red">false</code> immediately
                  </div>
                  <div className="sim-kill-time">
                    Propagation: &lt;2s · No deploy · No rollback
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Interactive user switcher — ALWAYS visible */}
        <div className="sim-footer">
          <div className="sim-ft-label">Switch user perspective:</div>
          <div className="sim-ft-users">
            {USERS.map((u, i) => (
              <button
                key={u.name}
                className={`sim-ft-btn ${i === userIdx ? "active" : ""}`}
                onClick={() => switchUser(i)}
              >
                <strong>{u.name}</strong>
                <small>
                  {u.plan} · {u.tenant}
                </small>
              </button>
            ))}
          </div>
          <motion.div
            className="sim-ft-flags"
            animate={{ opacity: refreshing ? 0.2 : 1 }}
          >
            <div className="sim-ft-row">
              <span>new_checkout</span>
              <span className={flags.newCheckout ? "c-green" : "c-red"}>
                {String(flags.newCheckout)}
              </span>
            </div>
            <div className="sim-ft-row">
              <span>upload_limit</span>
              <span>{flags.uploadLimit}</span>
            </div>
            <div className="sim-ft-row">
              <span>dark_mode</span>
              <span className={flags.darkMode ? "c-green" : "c-red"}>
                {String(flags.darkMode)}
              </span>
            </div>
            <div className="sim-ft-row">
              <span>ai_assistant</span>
              <span className={flags.aiAssistant ? "c-green" : "c-red"}>
                {String(flags.aiAssistant)}
              </span>
            </div>
          </motion.div>
          <div className="sim-ft-meta">
            <span className="sim-ft-badge">
              {refreshing ? "Evaluating" : "Cached"}
            </span>
            <span className="sim-ft-time">{refreshing ? "52ms" : "<1ms"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
