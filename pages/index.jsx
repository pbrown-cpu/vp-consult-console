import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Copy, Download, Info, RefreshCcw, ShieldCheck, Timer, FileText, FileSpreadsheet, Lock, LogIn, Mail, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Internal Premium Consultation Web App — v3
 * New in v3:
 * - Login wall (passcode) stored in localStorage; optional env key support
 * - True PDF export (vector text) via html2canvas + jsPDF
 * - "Email Plan" action that opens the user's mail client pre-filled and copies HTML to clipboard
 */

// --- Benchmarks library (defaults) -------------------------------------------
const DEFAULT_BENCHMARKS = {
  "B2B SaaS": { cpl: { good: 120, ok: 180 }, ctr: { good: 0.02, ok: 0.015 }, lpCv: { good: 0.06, ok: 0.03 }, roas: { good: 3.0, ok: 2.0 }, cacToLtv: { good: 0.25, ok: 0.33 } },
  "Local Service": { cpl: { good: 60, ok: 90 }, ctr: { good: 0.025, ok: 0.015 }, lpCv: { good: 0.08, ok: 0.04 }, roas: { good: 3.0, ok: 2.0 }, cacToLtv: { good: 0.25, ok: 0.3 } },
  "Ecommerce": { cpl: { good: 40, ok: 80 }, ctr: { good: 0.025, ok: 0.015 }, lpCv: { good: 0.04, ok: 0.02 }, roas: { good: 4.0, ok: 2.5 }, cacToLtv: { good: 0.25, ok: 0.33 } },
  "B2B Lead Gen": { cpl: { good: 80, ok: 120 }, ctr: { good: 0.02, ok: 0.01 }, lpCv: { good: 0.05, ok: 0.025 }, roas: { good: 3.0, ok: 2.0 }, cacToLtv: { good: 0.3, ok: 0.4 } },
  "Healthcare": { cpl: { good: 90, ok: 140 }, ctr: { good: 0.02, ok: 0.012 }, lpCv: { good: 0.06, ok: 0.03 }, roas: { good: 3.0, ok: 2.0 }, cacToLtv: { good: 0.25, ok: 0.35 } },
  "Real Estate": { cpl: { good: 50, ok: 100 }, ctr: { good: 0.02, ok: 0.012 }, lpCv: { good: 0.08, ok: 0.04 }, roas: { good: 3.0, ok: 2.0 }, cacToLtv: { good: 0.25, ok: 0.33 } },
};

function useBenchmarks() {
  const [bm, setBm] = useState<Record<string, any>>(() => JSON.parse(JSON.stringify(DEFAULT_BENCHMARKS)));
  return { bm, setBm };
}

// --- Helper UI bits ----------------------------------------------------------
const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <Card className="rounded-2xl shadow-xl border-white/10 bg-zinc-900/60 backdrop-blur">
    <CardHeader className="pb-2">
      <CardTitle className="text-white text-xl flex items-center gap-2">
        <span>{title}</span>
        {subtitle && <span className="text-sm font-normal text-white/60">{subtitle}</span>}
      </CardTitle>
    </CardHeader>
    <CardContent className="grid gap-4">{children}</CardContent>
  </Card>
);

const Help = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-white/20 text-white/70"><Info className="w-3.5 h-3.5"/></button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[320px] text-sm">{children}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// --- Types ------------------------------------------------------------------
type Industry = keyof typeof DEFAULT_BENCHMARKS;

type Inputs = {
  industry: Industry;
  company: string;
  monthlyRevenue?: number;
  monthlyAdSpend?: number;
  ltv?: number;
  closeRate?: number; // 0–1
  margin?: number; // 0–1
  monthlyLeadGoal?: number;
  win30?: string;
  challenges?: string;
  mgr: "Agency" | "Freelancer" | "In-house" | "Founder" | "None";
  tools: string;
  // Audit
  campaigns: number;
  adsets: number;
  ctr?: number; // 0-1
  hooks: number; // unique hooks in rotation
  weeksSinceRefresh: number;
  lpLoadSec?: number;
  lpCv?: number; // 0-1
  offerClarity: "Weak" | "OK" | "Strong";
  trustBlocks: boolean;
  formFriction: "High" | "Medium" | "Low";
  pixelWorking: boolean;
  events: string;
  utms: boolean;
  dashboard: boolean;
  guided: boolean;
};

const DEFAULT_INPUTS: Inputs = {
  industry: "Local Service",
  company: "",
  monthlyRevenue: undefined,
  monthlyAdSpend: undefined,
  ltv: undefined,
  closeRate: 0.2,
  margin: 0.6,
  monthlyLeadGoal: undefined,
  win30: "",
  challenges: "",
  mgr: "None",
  tools: "",
  campaigns: 3,
  adsets: 6,
  ctr: undefined,
  hooks: 9,
  weeksSinceRefresh: 3,
  lpLoadSec: 3,
  lpCv: undefined,
  offerClarity: "OK",
  trustBlocks: true,
  formFriction: "Medium",
  pixelWorking: true,
  events: "Lead, Schedule, Purchase",
  utms: true,
  dashboard: false,
  guided: false,
};

// --- Scoring & Recommendation Engine ----------------------------------------
function trafficLight(value: number | undefined, good: number, ok: number, direction: "up" | "down") {
  if (value == null || Number.isNaN(value)) return { label: "n/a", color: "slate" };
  const v = value;
  if (direction === "up") {
    if (v >= good) return { label: "good", color: "green" };
    if (v >= ok) return { label: "ok", color: "yellow" };
    return { label: "poor", color: "red" };
  } else {
    if (v <= good) return { label: "good", color: "green" };
    if (v <= ok) return { label: "ok", color: "yellow" };
    return { label: "poor", color: "red" };
  }
}

function derivedKPIs(input: Inputs, bm: any) {
  const cacCap = (input.ltv ?? 0) * (bm.cacToLtv?.ok ?? 0.33) || undefined;
  const close = input.closeRate && input.closeRate > 0 ? input.closeRate : undefined;
  const cplGuardrail = cacCap && close ? cacCap * close : undefined;
  const roasTarget = input.margin && input.margin > 0 ? 1 / input.margin : undefined;
  return { cacCap, cplGuardrail, roasTarget };
}

function buildRecommendations(input: Inputs, bm: any) {
  const recs: string[] = [];
  if (input.hooks < 9) recs.push("Increase creative diversity: 3 angles × 3–5 hooks each (≥ 9 hooks).");
  if (input.weeksSinceRefresh > 4) recs.push("Refresh winners every 3–4 weeks to avoid fatigue.");
  if (input.ctr != null) {
    const t = trafficLight(input.ctr, bm.ctr.good, bm.ctr.ok, "up");
    if (t.color !== "green") recs.push("Raise CTR with stronger first 3 seconds, pattern breaks, and placement alignment.");
  } else {
    recs.push("Track CTR weekly to evaluate hooks.");
  }
  if ((input.lpLoadSec ?? 0) > 3) recs.push("Improve LP load <3s: compress media, lazy load, CDN.");
  if (input.lpCv != null) {
    const t = trafficLight(input.lpCv, bm.lpCv.good, bm.lpCv.ok, "up");
    if (t.color !== "green") recs.push("Run LP tests: headline clarity, risk reversal, social proof, simpler form.");
  } else {
    recs.push("Add LP conversion to dashboard with UTM + events.");
  }
  if (input.offerClarity === "Weak") recs.push("Clarify offer, value, and guarantee.");
  if (!input.trustBlocks) recs.push("Add trust blocks: testimonials, reviews, guarantees, logos, FAQs.");
  if (input.formFriction !== "Low") recs.push("Reduce form friction: fewer fields or lead form test.");
  if (!input.pixelWorking) recs.push("Fix pixel/Conversion API and verify via Test Events.");
  if (!input.utms) recs.push("Standardize UTM templates across ads and links.");
  if (!input.dashboard) recs.push("Stand up a KPI dashboard with CPL, CTR, LP CVR, and revenue.");
  if (input.campaigns > 6 || input.adsets > 12) recs.push("Simplify account structure to reduce overlap and stabilize learning.");
  if (input.campaigns < 2) recs.push("Add a controlled test campaign to validate a distinct strategy.");
  return recs;
}

function prioritize(recs: string[]): { quickWins: string[]; tests: string[] } {
  const quick: string[] = [];
  const tests: string[] = [];
  recs.forEach(r => (/Add|Fix|Reduce|Standardize|Improve|Clarify/gi.test(r) ? quick.push(r) : tests.push(r)));
  return { quickWins: quick.slice(0, 6), tests: tests.slice(0, 6) };
}

function riskFlags(input: Inputs, bm: any) {
  const flags: string[] = [];
  if (!input.pixelWorking) flags.push("Tracking broken");
  if (!input.dashboard) flags.push("No KPI dashboard");
  if ((input.lpLoadSec ?? 0) > 4) flags.push("Slow landing page");
  if (input.hooks < 6) flags.push("Low creative diversity");
  if (input.weeksSinceRefresh > 6) flags.push("Creative fatigue risk");
  return flags;
}

function confidenceScore(input: Inputs, bm: any) {
  let score = 100;
  if (!input.pixelWorking) score -= 25;
  if (!input.dashboard) score -= 15;
  if ((input.lpLoadSec ?? 0) > 4) score -= 10;
  if (input.hooks < 6) score -= 10;
  if (input.ctr != null && input.ctr < bm.ctr.ok) score -= 10;
  if (input.lpCv != null && input.lpCv < bm.lpCv.ok) score -= 10;
  return Math.max(0, score);
}

// --- Utilities ---------------------------------------------------------------
const currency = (n?: number) => (n == null || Number.isNaN(n) ? "—" : n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }));
const pct = (n?: number) => (n == null || Number.isNaN(n) ? "—" : `${(n * 100).toFixed(1)}%`);
const storeKey = "vp-consultation-app-v3";

function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state]);
  return [state, setState] as const;
}

function downloadCSV(filename: string, rows: Record<string, any>) {
  const entries = Object.entries(rows).map(([k, v]) => `${JSON.stringify(k)},${JSON.stringify(String(v ?? ""))}`);
  const csv = `key,value
${entries.join("
")}`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

function generateEmailHTML(company: string, planText: string) {
  const safe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/
/g, "<br>");
  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#111;line-height:1.5;padding:16px">
  <h2 style="margin:0 0 8px">${company ? company + " — " : ""}48 Hour Action Plan</h2>
  <p style="color:#444">Below is your quick-win plan and 30 day test roadmap. If you want us to execute this, we run it inside our 90 day block and you will not have to do a thing.</p>
  <pre style="white-space:pre-wrap;background:#f6f7f9;border:1px solid #e4e7eb;padding:12px;border-radius:8px;font-family:ui-monospace,Menlo,Consolas,monospace">${safe(planText)}</pre>
  <p style="margin-top:16px;color:#444">— Vindicated Productions</p>
  </body></html>`;
}

async function exportPDF(id: string, filename: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#0F0F10" });
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  pdf.addImage(img, "PNG", (pageWidth - w) / 2, 24, w, h);
  pdf.save(filename);
}

// --- Auth --------------------------------------------------------------------
function usePassAuth() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => { setAuthed(localStorage.getItem("vp_consult_pass_ok") === "1"); }, []);
  function login(pass: string) {
    const required = (typeof window !== "undefined" && (window as any).NEXT_PUBLIC_CONSULT_PASS) || "vindicated"; // set env if desired
    if (pass.trim() && pass === required) { localStorage.setItem("vp_consult_pass_ok", "1"); setAuthed(true); return true; }
    return false;
  }
  function logout() { localStorage.removeItem("vp_consult_pass_ok"); setAuthed(false); }
  return { authed, login, logout };
}

// --- Main Component ----------------------------------------------------------
export default function ConsultationApp() {
  const { bm, setBm } = useBenchmarks();
  const [input, setInput] = usePersistentState<Inputs>(storeKey, DEFAULT_INPUTS);
  const [copied, setCopied] = useState(false);
  const [seconds, setSeconds] = useState(60 * 60);
  const { authed, login, logout } = usePassAuth();

  useEffect(() => { const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000); return () => clearInterval(t); }, []);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const curBm = bm[input.industry];
  const d = useMemo(() => derivedKPIs(input, curBm), [input, curBm]);
  const score = useMemo(() => ({ ctr: trafficLight(input.ctr, curBm.ctr.good, curBm.ctr.ok, "up"), lpCv: trafficLight(input.lpCv, curBm.lpCv.good, curBm.lpCv.ok, "up") }), [input.ctr, input.lpCv, curBm]);
  const recs = useMemo(() => buildRecommendations(input, curBm), [input, curBm]);
  const prioritized = useMemo(() => prioritize(recs), [recs]);
  const flags = useMemo(() => riskFlags(input, curBm), [input, curBm]);
  const conf = useMemo(() => confidenceScore(input, curBm), [input, curBm]);

  const planText = useMemo(() => {
    const lines = [
      `Action Plan for ${input.company || "Client"}`,
      `Industry: ${input.industry}`,
      `Goals (30–90 days): ${input.win30 || "-"}`,
      "",
      "Quick Wins (7 days):",
      ...prioritized.quickWins.map((x, i) => `${i + 1}. ${x}`),
      "",
      "Priority Tests (30 days):",
      ...prioritized.tests.map((x, i) => `${i + 1}. ${x}`),
      "",
      "Guardrails:",
      `• CTR target: ≥ ${pct(curBm.ctr.ok)} (good: ${pct(curBm.ctr.good)})`,
      `• LP conversion: ≥ ${pct(curBm.lpCv.ok)} (good: ${pct(curBm.lpCv.good)})`,
      `• CPL guardrail: ${d.cplGuardrail ? currency(d.cplGuardrail) : `below ${currency(curBm.cpl.ok)} (good ${currency(curBm.cpl.good)})`}`,
      d.roasTarget ? `• Breakeven ROAS target: ${d.roasTarget.toFixed(2)}x` : undefined,
    ].filter(Boolean) as string[];
    return lines.join("
");
  }, [input.company, input.industry, input.win30, prioritized, curBm, d]);

  function handleCopy() { navigator.clipboard.writeText(planText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); }); }
  function resetAll() { setInput(DEFAULT_INPUTS); }

  // --- Login gate ------------------------------------------------------------
  if (!authed) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white" id="app-root">
      <div className="max-w-[1180px] mx-auto px-4 py-8 md:py-10" id="capture-area">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black">Free Ad Strategy — Internal Console</h1>
            <div className="text-white/50 text-sm hidden md:block">v3</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10"><Timer className="w-4 h-4"/><span className="tabular-nums">{mm}:{ss}</span></div>
            <Button variant="secondary" className="bg-white text-black" onClick={handleCopy}>{copied ? <Check className="w-4 h-4 mr-2"/> : <Copy className="w-4 h-4 mr-2"/>}{copied ? "Copied" : "Copy Plan"}</Button>
            <Button variant="outline" className="border-white/20" onClick={() => window.print()}><FileText className="w-4 h-4 mr-2"/> Print</Button>
            <Button variant="outline" className="border-white/20" onClick={() => exportPDF("capture-area", `${input.company || "client"}-action-plan.pdf`)}><FileDown className="w-4 h-4 mr-2"/> Export PDF</Button>
            <Button variant="outline" className="border-white/20" onClick={() => downloadCSV(`${input.company || "client"}-consult.csv`, { ...input, ...d, confidence: conf, flags: flags.join("; ") })}><FileSpreadsheet className="w-4 h-4 mr-2"/> CSV</Button>
            <Button variant="outline" className="border-white/20" onClick={resetAll}><RefreshCcw className="w-4 h-4 mr-2"/> Reset</Button>
            <Button variant="ghost" onClick={()=>{logout();}} title="Log out"><Lock className="w-4 h-4"/></Button>
          </div>
        </div>

        <AuthNotice />

        <Tabs defaultValue="context" className="w-full">
          <TabsList className="grid grid-cols-4 md:grid-cols-7 w-full bg-white/5">
            <TabsTrigger value="context">Context</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="bench">Benchmarks</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          {/* Context */}
          <TabsContent value="context" className="mt-4">
            <Section title="Client Context" subtitle="Who they are and what stack they use">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Industry</Label>
                  <Select value={input.industry} onValueChange={(v) => setInput({ ...input, industry: v as Industry })}>
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {Object.keys(bm).map((k) => (<SelectItem key={k} value={k}>{k}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Company</Label>
                  <Input className="bg-white/5 border-white/10" value={input.company} onChange={(e) => setInput({ ...input, company: e.target.value })} />
                </div>
                <div>
                  <Label>Who manages ads/creative today?</Label>
                  <Select value={input.mgr} onValueChange={(v) => setInput({ ...input, mgr: v as Inputs["mgr"] })}>
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {(["Agency","Freelancer","In-house","Founder","None"] as const).map(k => (<SelectItem key={k} value={k}>{k}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tracking / reporting tools</Label>
                  <Input className="bg-white/5 border-white/10" value={input.tools} onChange={(e) => setInput({ ...input, tools: e.target.value })} />
                </div>
              </div>
            </Section>
          </TabsContent>

          {/* Goals */}
          <TabsContent value="goals" className="mt-4">
            <Section title="Goals & Economics" subtitle="Anchor to numbers so the plan ties back to revenue">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Monthly Revenue</Label>
                  <Input type="number" placeholder="250000" className="bg-white/5 border-white/10" value={input.monthlyRevenue ?? ""} onChange={(e) => setInput({ ...input, monthlyRevenue: num(e.target.value) })} />
                </div>
                <div>
                  <Label>Monthly Ad Spend</Label>
                  <Input type="number" placeholder="25000" className="bg-white/5 border-white/10" value={input.monthlyAdSpend ?? ""} onChange={(e) => setInput({ ...input, monthlyAdSpend: num(e.target.value) })} />
                </div>
                <div>
                  <Label>Average Customer Value (LTV/Ticket)</Label>
                  <Input type="number" placeholder="1200" className="bg-white/5 border-white/10" value={input.ltv ?? ""} onChange={(e) => setInput({ ...input, ltv: num(e.target.value) })} />
                </div>
                <div>
                  <Label>Close Rate to Customer</Label>
                  <Input type="number" step="0.01" placeholder="0.20 for 20%" className="bg-white/5 border-white/10" value={input.closeRate ?? ""} onChange={(e) => setInput({ ...input, closeRate: num(e.target.value) })} />
                </div>
                <div>
                  <Label>Gross Margin</Label>
                  <Input type="number" step="0.01" placeholder="0.60 for 60%" className="bg-white/5 border-white/10" value={input.margin ?? ""} onChange={(e) => setInput({ ...input, margin: num(e.target.value) })} />
                </div>
                <div>
                  <Label>Lead Goal per Month</Label>
                  <Input type="number" placeholder="120" className="bg-white/5 border-white/10" value={input.monthlyLeadGoal ?? ""} onChange={(e) => setInput({ ...input, monthlyLeadGoal: num(e.target.value) })} />
                </div>
                <div className="md:col-span-2">
                  <Label>What does a win in 30 days look like?</Label>
                  <Textarea className="bg-white/5 border-white/10" rows={3} value={input.win30} onChange={(e) => setInput({ ...input, win30: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Biggest challenges</Label>
                  <Textarea className="bg-white/5 border-white/10" rows={3} value={input.challenges} onChange={(e) => setInput({ ...input, challenges: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <MetricCard label="CAC Cap (as % of LTV)" value={currency(d.cacCap)} note={`OK band uses ${pct(curBm.cacToLtv.ok)} of LTV`} />
                <MetricCard label="CPL Guardrail (derived)" value={currency(d.cplGuardrail)} note={input.closeRate ? `close rate ${pct(input.closeRate)}` : "add close rate"} />
                <MetricCard label="Breakeven ROAS" value={d.roasTarget ? `${d.roasTarget.toFixed(2)}x` : "—"} note={input.margin ? `from ${pct(input.margin)} margin` : "add margin"} />
              </div>
            </Section>
          </TabsContent>

          {/* Audit */}
          <TabsContent value="audit" className="mt-4">
            <Section title="Account & Funnel Audit" subtitle="Use benchmarks to color-code gaps">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <SubHead>Ad Account</SubHead>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Campaigns"><Input type="number" className="bg-white/5 border-white/10" value={input.campaigns} onChange={(e)=>setInput({...input,campaigns:num(e.target.value) || 0})}/></Field>
                    <Field label="Ad sets"><Input type="number" className="bg-white/5 border-white/10" value={input.adsets} onChange={(e)=>setInput({...input,adsets:num(e.target.value) || 0})}/></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <Field label="CTR"><Input type="number" step="0.001" placeholder="0.018 = 1.8%" className="bg-white/5 border-white/10" value={input.ctr ?? ""} onChange={(e)=>setInput({...input,ctr:num(e.target.value)})}/></Field>
                    <Tag label="CTR Status" status={score.ctr} hint={`OK ≥ ${pct(curBm.ctr.ok)} | Good ≥ ${pct(curBm.ctr.good)}`} />
                  </div>
                  <SubHead>Creative</SubHead>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="# Unique Hooks"><Input type="number" className="bg-white/5 border-white/10" value={input.hooks} onChange={(e)=>setInput({...input,hooks:num(e.target.value) || 0})}/></Field>
                    <Field label="Weeks Since Refresh"><Input type="number" className="bg-white/5 border-white/10" value={input.weeksSinceRefresh} onChange={(e)=>setInput({...input,weeksSinceRefresh:num(e.target.value) || 0})}/></Field>
                  </div>
                  <SubHead>Tracking & Data</SubHead>
                  <ToggleRow label="Pixel / Conversion API Working" checked={input.pixelWorking} onCheckedChange={(v)=>setInput({...input,pixelWorking:v})} />
                  <Field label="Key Events"><Input className="bg-white/5 border-white/10" value={input.events} onChange={(e)=>setInput({...input,events:e.target.value})}/></Field>
                  <ToggleRow label="UTMs Standardized" checked={input.utms} onCheckedChange={(v)=>setInput({...input,utms:v})} />
                  <ToggleRow label="Dashboard Live" checked={input.dashboard} onCheckedChange={(v)=>setInput({...input,dashboard:v})} />
                </div>
                <div className="space-y-4">
                  <SubHead>Landing Page</SubHead>
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <Field label="Load Time (sec)"><Input type="number" step="0.1" className="bg-white/5 border-white/10" value={input.lpLoadSec ?? ""} onChange={(e)=>setInput({...input,lpLoadSec:num(e.target.value)})}/></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <Field label="LP Conversion (0–1)"><Input type="number" step="0.001" placeholder="0.05 = 5%" className="bg-white/5 border-white/10" value={input.lpCv ?? ""} onChange={(e)=>setInput({...input,lpCv:num(e.target.value)})}/></Field>
                    <Tag label="LP Status" status={score.lpCv} hint={`OK ≥ ${pct(curBm.lpCv.ok)} | Good ≥ ${pct(curBm.lpCv.good)}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Offer Clarity">
                      <Select value={input.offerClarity} onValueChange={(v)=>setInput({...input,offerClarity: v as Inputs["offerClarity"]})}>
                        <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Weak">Weak</SelectItem>
                          <SelectItem value="OK">OK</SelectItem>
                          <SelectItem value="Strong">Strong</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Trust Blocks Visible">
                      <div className="flex items-center h-10 gap-3">
                        <Switch checked={input.trustBlocks} onCheckedChange={(v)=>setInput({...input,trustBlocks:v})}/>
                        <Help>Testimonials, reviews, guarantees, logos, FAQs</Help>
                      </div>
                    </Field>
                  </div>
                  <Field label="Form Friction">
                    <RadioGroup className="flex gap-6" value={input.formFriction} onValueChange={(v)=>setInput({...input,formFriction:v as Inputs["formFriction"]})}>
                      {(["Low","Medium","High"] as const).map(k => (
                        <div key={k} className="flex items-center space-x-2">
                          <RadioGroupItem value={k} id={`ff-${k}`} />
                          <Label htmlFor={`ff-${k}`}>{k}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </Field>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard label="Confidence Score" value={`${conf}/100`} note="Higher means faster path to results" />
                <div className="md:col-span-2 rounded-xl border border-white/10 p-4 bg-white/5">
                  <div className="text-white/60 text-sm mb-1">Risk Flags</div>
                  <div className="text-white text-sm">{flags.length ? flags.join(" • ") : "None detected"}</div>
                </div>
              </div>
            </Section>
          </TabsContent>

          {/* Benchmarks */}
          <TabsContent value="bench" className="mt-4">
            <Section title="Benchmarks" subtitle="Industry defaults. Adjust if you maintain house numbers.">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <BMCard title="CPL (lower is better)" good={curBm.cpl.good} ok={curBm.cpl.ok} formatter={currency} />
                <BMCard title="CTR" good={curBm.ctr.good} ok={curBm.ctr.ok} formatter={pct} />
                <BMCard title="LP Conversion" good={curBm.lpCv.good} ok={curBm.lpCv.ok} formatter={pct} />
                <BMCard title="ROAS" good={curBm.roas.good} ok={curBm.roas.ok} formatter={(n)=>`${n?.toFixed(1)}x`} />
                <BMCard title="CAC as % of LTV" good={curBm.cacToLtv.good} ok={curBm.cacToLtv.ok} formatter={pct} />
              </div>
              <p className="text-sm text-white/60 mt-2">Benchmarks represent typical healthy bands by vertical. Use as guardrails, not gospel.</p>
            </Section>
          </TabsContent>

          {/* Plan */}
          <TabsContent value="plan" className="mt-4">
            <Section title="Generated Action Plan" subtitle="Quick wins this week and tests for the next 30 days">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <SubHead>Quick Wins (7 days)</SubHead>
                  <ul className="list-disc pl-5 space-y-2">
                    {prioritized.quickWins.length ? prioritized.quickWins.map((x,i)=>(<li key={i}>{x}</li>)) : <li>Enter audit details to generate quick wins.</li>}
                  </ul>
                </div>
                <div>
                  <SubHead>Priority Tests (30 days)</SubHead>
                  <ul className="list-disc pl-5 space-y-2">
                    {prioritized.tests.length ? prioritized.tests.map((x,i)=>(<li key={i}>{x}</li>)) : <li>Enter audit details to generate tests.</li>}
                  </ul>
                </div>
              </div>
              <div className="mt-6">
                <SubHead>One-pager Text</SubHead>
                <Textarea value={planText} readOnly rows={10} className="bg-white/5 border-white/10" />
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button onClick={handleCopy} className="bg-white text-black">{copied ? <Check className="w-4 h-4 mr-2"/> : <Copy className="w-4 h-4 mr-2"/>}{copied?"Copied":"Copy"}</Button>
                  <Button variant="outline" className="border-white/20" onClick={()=>{ const blob = new Blob([planText], {type: "text/plain"}); const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`${input.company || "client"}-action-plan.txt`; a.click(); URL.revokeObjectURL(url); }}>Download .txt</Button>
                  <Button variant="outline" className="border-white/20" onClick={()=> downloadCSV(`${input.company || "client"}-consult.csv`, { ...input, ...d, confidence: conf, flags: flags.join("; ") })}><FileSpreadsheet className="w-4 h-4 mr-2"/> CSV</Button>
                  <Button variant="secondary" className="bg-emerald-500/90 text-white" onClick={() => handleEmail(planText, input.company)}><Mail className="w-4 h-4 mr-2"/> Email Plan</Button>
                  <Button variant="outline" className="border-white/20" onClick={() => exportPDF("capture-area", `${input.company || "client"}-action-plan.pdf`)}><FileDown className="w-4 h-4 mr-2"/> Export PDF</Button>
                  <Button variant="secondary" className="bg-emerald-600/90 text-white"><ShieldCheck className="w-4 h-4 mr-2"/>Convert to 90 Day Block</Button>
                </div>
              </div>
            </Section>
          </TabsContent>

          {/* Notes */}
          <TabsContent value="notes" className="mt-4">
            <Section title="Free Notes" subtitle="Anything else from the call">
              <Textarea rows={12} className="bg-white/5 border-white/10" placeholder="Meeting notes…" />
            </Section>
          </TabsContent>

          {/* Admin: edit benchmarks & add industries */}
          <TabsContent value="admin" className="mt-4">
            <Section title="Admin" subtitle="Customize industries and benchmarks for this session">
              <div className="grid gap-6">
                <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">Industries</div>
                    <Button variant="outline" className="border-white/20" onClick={()=> setBm(JSON.parse(JSON.stringify(DEFAULT_BENCHMARKS)))}>Reset to Defaults</Button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(bm).map(([name, vals]: any) => (
                      <div key={name} className="rounded-lg border border-white/10 p-3">
                        <div className="font-bold mb-2">{name}</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {(["cpl","ctr","lpCv","roas","cacToLtv"] as const).map(key => (
                            <div key={key} className="space-y-1">
                              <div className="text-white/60 uppercase tracking-wide text-xs">{key}</div>
                              <div className="grid grid-cols-2 gap-1">
                                <Input placeholder="ok" className="bg-white/10 border-white/20" defaultValue={vals[key].ok} onBlur={(e)=>{ vals[key].ok = num(e.target.value) || vals[key].ok; setBm({...bm}); }} />
                                <Input placeholder="good" className="bg-white/10 border-white/20" defaultValue={vals[key].good} onBlur={(e)=>{ vals[key].good = num(e.target.value) || vals[key].good; setBm({...bm}); }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                  <div className="font-semibold mb-2">Add New Industry</div>
                  <AddIndustry onAdd={(name, vals)=>{ setBm({...bm, [name]: vals}); }} />
                </div>
              </div>
            </Section>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-white/60 text-sm mt-8">
          We give the plan free so clients win. If they choose to work with us, we implement it in our 90 day block and they do not have to do a thing.
        </div>
      </div>
    </div>
  );
}

// --- Small UI helpers --------------------------------------------------------
const SubHead = ({ children }: { children: React.ReactNode }) => (
  <div className="text-white/80 font-semibold tracking-wide mb-1">{children}</div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label className="mb-1 block">{label}</Label>
    {children}
  </div>
);

function MetricCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-white/10 p-4 bg-white/5">
      <div className="text-white/60 text-sm">{label}</div>
      <div className="text-white text-lg font-bold">{value || "—"}</div>
      {note && <div className="text-white/50 text-xs mt-1">{note}</div>}
    </div>
  );
}

function Tag({ label, status, hint }: { label: string; status: { label: string; color: string }, hint?: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    yellow: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    red: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    slate: "bg-slate-500/20 text-slate-200 border-slate-500/40",
  };
  return (
    <div>
      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs border ${colorMap[status.color] || colorMap.slate}`}>
        <span className="font-bold uppercase tracking-wide">{label}</span>
        <span>• {status.label}</span>
      </div>
      {hint && <div className="text-white/50 text-xs mt-1">{hint}</div>}
    </div>
  );
}

function BMCard({ title, good, ok, formatter }: { title: string; good: number; ok: number; formatter: (n?: number) => string }) {
  return (
    <div className="rounded-xl border border-white/10 p-4 bg-white/5">
      <div className="text-white/80 font-semibold">{title}</div>
      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-white/50">OK</div>
          <div className="text-white font-bold">{formatter(ok)}</div>
        </div>
        <div>
          <div className="text-white/50">Good</div>
          <div className="text-white font-bold">{formatter(good)}</div>
        </div>
      </div>
    </div>
  );
}

function AddIndustry({ onAdd }: { onAdd: (name: string, vals: any) => void }) {
  const [name, setName] = useState("");
  const [vals, setVals] = useState<any>({ cpl: { ok: 100, good: 60 }, ctr: { ok: 0.015, good: 0.025 }, lpCv: { ok: 0.03, good: 0.06 }, roas: { ok: 2.0, good: 3.0 }, cacToLtv: { ok: 0.33, good: 0.25 } });
  return (
    <div className="grid md:grid-cols-3 gap-3">
      <div>
        <Label>Industry name</Label>
        <Input className="bg-white/10 border-white/20" value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Education"/>
      </div>
      <div className="md:col-span-2 grid grid-cols-5 gap-2">
        {(["cpl","ctr","lpCv","roas","cacToLtv"] as const).map(key => (
          <div key={key} className="space-y-1">
            <div className="text-white/60 text-xs uppercase">{key}</div>
            <div className="grid grid-cols-2 gap-1">
              <Input placeholder="ok" className="bg-white/10 border-white/20" defaultValue={vals[key].ok} onBlur={(e)=>{ vals[key].ok = num(e.target.value) || vals[key].ok; setVals({...vals}); }}/>
              <Input placeholder="good" className="bg-white/10 border-white/20" defaultValue={vals[key].good} onBlur={(e)=>{ vals[key].good = num(e.target.value) || vals[key].good; setVals({...vals}); }}/>
            </div>
          </div>
        ))}
      </div>
      <div className="md:col-span-3">
        <Button className="bg-white text-black" onClick={()=>{ if(!name.trim()) return; onAdd(name.trim(), vals); setName(""); }}>Add Industry</Button>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (pass: string) => boolean }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  function submit(e: React.FormEvent) { e.preventDefault(); setErr(""); const ok = onLogin(pass); if (!ok) setErr("Incorrect passcode"); }
  return (
    <div className="min-h-screen grid place-items-center bg-[#0F0F10] text-white p-6">
      <Card className="w-full max-w-md bg-zinc-900/60 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5"/> Internal Console</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            <div>
              <Label>Passcode</Label>
              <Input type="password" className="bg-white/5 border-white/10" value={pass} onChange={(e)=>setPass(e.target.value)} placeholder="Enter passcode" />
              {err && <div className="text-rose-300 text-xs mt-1">{err}</div>}
              <div className="text-white/50 text-xs mt-2">Tip: set <code>NEXT_PUBLIC_CONSULT_PASS</code> at build time.</div>
            </div>
            <Button type="submit" className="bg-white text-black"><LogIn className="w-4 h-4 mr-2"/> Enter</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthNotice(){
  return (
    <div className="rounded-xl border border-white/10 p-3 bg-white/5 text-white/70 text-xs mb-4">
      Private: passcode protected. Change the pass via <code>NEXT_PUBLIC_CONSULT_PASS</code>.
    </div>
  );
}

function handleEmail(planText: string, company: string){
  const html = generateEmailHTML(company || "Client", planText);
  // Copy HTML to clipboard for pasting into Gmail/Outlook
  const blob = new Blob([html], { type: "text/html" });
  const data = [new ClipboardItem({ "text/html": blob })];
  navigator.clipboard.write(data).catch(()=>{});

  const subject = encodeURIComponent(`${company || "Your"} 48 Hour Action Plan`);
  const body = encodeURIComponent(`Attached below is your 48 hour action plan.

${planText}

If you would like us to implement this, we will run it inside our 90 day block and you will not have to do a thing.
— Vindicated Productions`);
  const to = prompt("Send to (email):", "");
  const url = `mailto:${to || ""}?subject=${subject}&body=${body}`;
  window.location.href = url;
}

function num(v: any) { const n = Number(v); return Number.isFinite(n) ? n : undefined; }
