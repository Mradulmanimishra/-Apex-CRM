import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Wallet, Target, TrendingUp, Users, Ticket, ArrowUpRight, ArrowDownRight,
  Phone, Mail, Calendar, Video, FileText, MessageCircle,
} from "lucide-react";

const palette = {
  bg: "#0A0E1A",
  surface: "#121829",
  surfaceAlt: "#0E1422",
  border: "#1F2A40",
  text: "#EAF0FB",
  textDim: "#7C8AA8",
  accent: "#2DD4BF",
  accent2: "#818CF8",
  warn: "#FB923C",
  danger: "#F87171",
};

const kpis = [
  { label: "Open Pipeline Value", value: "$2.48M", delta: "+12.4%", up: true, icon: Wallet, color: palette.accent },
  { label: "Weighted Pipeline", value: "$1.19M", delta: "+8.1%", up: true, icon: TrendingUp, color: palette.accent2 },
  { label: "Win Rate", value: "42.3%", delta: "+3.2 pts", up: true, icon: Target, color: palette.accent },
  { label: "Active Customers", value: "184", delta: "+14", up: true, icon: Users, color: palette.accent2 },
  { label: "Open Tickets", value: "07", delta: "-2", up: false, icon: Ticket, color: palette.warn },
];

const funnel = [
  { stage: "New Lead", count: 32, value: 640000 },
  { stage: "Qualified", count: 21, value: 890000 },
  { stage: "Proposal Sent", count: 14, value: 720000 },
  { stage: "Negotiation", count: 8, value: 480000 },
  { stage: "Won", count: 23, value: 1150000 },
];
const maxFunnelValue = Math.max(...funnel.map((f) => f.value));

const revenueTrend = [
  { month: "Jan", won: 640000, pipeline: 1820000 },
  { month: "Feb", won: 710000, pipeline: 1960000 },
  { month: "Mar", won: 590000, pipeline: 2110000 },
  { month: "Apr", won: 880000, pipeline: 2240000 },
  { month: "May", won: 940000, pipeline: 2360000 },
  { month: "Jun", won: 1150000, pipeline: 2480000 },
];

const activityIcons = {
  Call: Phone, Email: Mail, Meeting: Calendar, Demo: Video, Note: FileText, WhatsApp: MessageCircle,
};

const activities = [
  { type: "Call", contact: "Aarav Mehta · Nimbus Traders", note: "Discussed Q3 contract renewal terms", time: "12 min ago" },
  { type: "Email", contact: "Riya Sharma · Sharma Retail Group", note: "Sent revised pricing proposal", time: "1 hr ago" },
  { type: "WhatsApp", contact: "John Carter · Atlas Manufacturing", note: "Confirmed sample shipment details", time: "3 hr ago" },
  { type: "Meeting", contact: "Priya Nair · Nimbus Traders", note: "Annual review — renewal likely", time: "Yesterday" },
  { type: "Demo", contact: "Vikram Singh · Sharma Retail Group", note: "Walked through bulk-order workflow", time: "Yesterday" },
];

const accounts = [
  { name: "Nimbus Traders Pvt Ltd", owner: "Priya Nair", value: "$850,000", stage: "Negotiation", health: "good" },
  { name: "Sharma Retail Group", owner: "Vikram Singh", value: "$320,000", stage: "Proposal Sent", health: "good" },
  { name: "Atlas Manufacturing", owner: "Vikram Singh", value: "$75,000", stage: "New Lead", health: "watch" },
  { name: "Coral Logistics Co.", owner: "Priya Nair", value: "$410,000", stage: "Qualified", health: "watch" },
  { name: "Northwind Supplies", owner: "Aarav Mehta", value: "$190,000", stage: "Won", health: "good" },
];

const fmtMoney = (n) => `$${(n / 1000).toFixed(0)}K`;

function KpiCard({ kpi }) {
  const Icon = kpi.icon;
  const Delta = kpi.up ? ArrowUpRight : ArrowDownRight;
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-5 border"
      style={{ background: palette.surface, borderColor: palette.border }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest" style={{ color: palette.textDim, fontFamily: "'Inter', sans-serif", letterSpacing: "0.12em" }}>
          {kpi.label}
        </span>
        <Icon size={16} style={{ color: kpi.color }} strokeWidth={2} />
      </div>
      <div className="flex items-end justify-between">
        <span
          className="text-3xl font-semibold tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: palette.text }}
        >
          {kpi.value}
        </span>
        <span
          className="flex items-center gap-1 text-xs font-medium tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: kpi.up ? palette.accent : palette.danger }}
        >
          <Delta size={13} strokeWidth={2.5} />
          {kpi.delta}
        </span>
      </div>
    </div>
  );
}

export default function CRMDashboard() {
  return (
    <div
      className="min-h-screen w-full p-6 md:p-10"
      style={{ background: palette.bg, color: palette.text, fontFamily: "'Inter', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        .pulse-dot { animation: pulse 2.2s cubic-bezier(0.4,0,0.6,1) infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-2xl md:text-3xl font-semibold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: palette.text }}
          >
            Revenue Command Center
          </h1>
          <p className="text-sm mt-1" style={{ color: palette.textDim }}>
            Pipeline, accounts &amp; activity — updated continuously
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full px-4 py-2 border" style={{ borderColor: palette.border, background: palette.surface }}>
          <span className="pulse-dot inline-block w-2 h-2 rounded-full" style={{ background: palette.accent }} />
          <span className="text-xs font-medium tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: palette.textDim }}>
            LIVE · FY26 Q2
          </span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {kpis.map((k) => (
          <KpiCard key={k.label} kpi={k} />
        ))}
      </div>

      {/* Funnel + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-8">
        {/* Funnel */}
        <div className="lg:col-span-2 rounded-2xl p-6 border" style={{ background: palette.surface, borderColor: palette.border }}>
          <h2 className="text-sm font-semibold mb-5 tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif", color: palette.text }}>
            Pipeline by Stage
          </h2>
          <div className="flex flex-col gap-3">
            {funnel.map((f, i) => {
              const widthPct = 100 - i * 14;
              return (
                <div key={f.stage} className="flex items-center gap-3">
                  <span className="w-28 text-xs shrink-0" style={{ color: palette.textDim }}>{f.stage}</span>
                  <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ background: palette.surfaceAlt }}>
                    <div
                      className="h-full rounded-lg flex items-center justify-end px-3"
                      style={{
                        width: `${widthPct}%`,
                        background: i === funnel.length - 1
                          ? `linear-gradient(90deg, ${palette.accent2}, ${palette.accent})`
                          : `linear-gradient(90deg, ${palette.accent2}55, ${palette.accent2}aa)`,
                      }}
                    >
                      <span className="text-xs font-semibold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: palette.bg }}>
                        {f.count}
                      </span>
                    </div>
                  </div>
                  <span className="w-16 text-right text-xs tabular-nums shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace", color: palette.textDim }}>
                    {fmtMoney(f.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue trend */}
        <div className="lg:col-span-3 rounded-2xl p-6 border" style={{ background: palette.surface, borderColor: palette.border }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif", color: palette.text }}>
              Pipeline &amp; Won Revenue — Last 6 Months
            </h2>
            <div className="flex items-center gap-4 text-xs" style={{ color: palette.textDim }}>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: palette.accent2 }} />Pipeline</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: palette.accent }} />Won</span>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="wonGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.accent} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={palette.accent} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pipeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.accent2} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={palette.accent2} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={palette.border} strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: palette.textDim, fontSize: 12, fontFamily: "Inter" }} axisLine={{ stroke: palette.border }} tickLine={false} />
                <YAxis tick={{ fill: palette.textDim, fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={fmtMoney} width={48} />
                <Tooltip
                  formatter={(v) => fmtMoney(v)}
                  contentStyle={{ background: palette.surfaceAlt, border: `1px solid ${palette.border}`, borderRadius: 10, fontSize: 12, fontFamily: "Inter" }}
                  labelStyle={{ color: palette.text }}
                  itemStyle={{ color: palette.text }}
                />
                <Area type="monotone" dataKey="pipeline" stroke={palette.accent2} fill="url(#pipeGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="won" stroke={palette.accent} fill="url(#wonGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity feed + Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Activity feed */}
        <div className="lg:col-span-2 rounded-2xl p-6 border" style={{ background: palette.surface, borderColor: palette.border }}>
          <h2 className="text-sm font-semibold mb-5 tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif", color: palette.text }}>
            Recent Activity
          </h2>
          <div className="flex flex-col gap-4">
            {activities.map((a, i) => {
              const Icon = activityIcons[a.type] || FileText;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="rounded-lg p-2 mt-0.5" style={{ background: palette.surfaceAlt }}>
                    <Icon size={14} style={{ color: palette.accent }} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: palette.text }}>{a.contact}</p>
                    <p className="text-xs mt-0.5" style={{ color: palette.textDim }}>{a.note}</p>
                  </div>
                  <span className="text-[11px] tabular-nums shrink-0 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace", color: palette.textDim }}>{a.time}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top accounts table */}
        <div className="lg:col-span-3 rounded-2xl p-6 border overflow-x-auto" style={{ background: palette.surface, borderColor: palette.border }}>
          <h2 className="text-sm font-semibold mb-5 tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif", color: palette.text }}>
            Top Accounts
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: palette.textDim }}>
                <th className="text-left font-medium pb-3 text-xs uppercase tracking-wider" style={{ letterSpacing: "0.08em" }}>Account</th>
                <th className="text-left font-medium pb-3 text-xs uppercase tracking-wider" style={{ letterSpacing: "0.08em" }}>Owner</th>
                <th className="text-left font-medium pb-3 text-xs uppercase tracking-wider" style={{ letterSpacing: "0.08em" }}>Stage</th>
                <th className="text-right font-medium pb-3 text-xs uppercase tracking-wider" style={{ letterSpacing: "0.08em" }}>Value</th>
                <th className="text-right font-medium pb-3 text-xs uppercase tracking-wider" style={{ letterSpacing: "0.08em" }}>Health</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.name} className="border-t" style={{ borderColor: palette.border }}>
                  <td className="py-3 font-medium" style={{ color: palette.text }}>{a.name}</td>
                  <td className="py-3" style={{ color: palette.textDim }}>{a.owner}</td>
                  <td className="py-3" style={{ color: palette.textDim }}>{a.stage}</td>
                  <td className="py-3 text-right tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: palette.text }}>{a.value}</td>
                  <td className="py-3 text-right">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: a.health === "good" ? palette.accent : palette.warn }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
