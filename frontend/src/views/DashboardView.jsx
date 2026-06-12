import React, { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Wallet, Target, TrendingUp, Users, Ticket, ArrowUpRight, ArrowDownRight,
  Phone, Mail, Calendar, Video, FileText, MessageCircle, AlertCircle, Clock
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

const activityIcons = {
  Call: Phone, Email: Mail, Meeting: Calendar, Demo: Video, Note: FileText, 'WhatsApp Message': MessageCircle,
};

const fmtMoney = (n) => {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
};

function KpiCard({ label, value, icon: Icon, color, details }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-5 border transition-all duration-300 hover:border-brand-teal/30 hover:translate-y-[-2px]"
      style={{ background: palette.surface, borderColor: palette.border }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-brand-textDim" style={{ letterSpacing: "0.12em" }}>
          {label}
        </span>
        <Icon size={18} style={{ color }} strokeWidth={2} />
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-semibold font-mono text-brand-text">
          {value}
        </span>
        <span className="text-[11px] text-brand-textDim font-medium">
          {details}
        </span>
      </div>
    </div>
  );
}

export default function DashboardView({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-teal"></div>
        <p className="text-brand-textDim text-sm font-mono">Calibrating sensors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-brand-red">
        <AlertCircle size={48} />
        <p className="text-brand-text font-medium text-lg">Error loading telemetry</p>
        <p className="text-brand-textDim text-sm">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-teal hover:border-brand-teal font-mono transition-colors"
        >
          RETRY LINK
        </button>
      </div>
    );
  }

  const { metrics, funnel, revenueTrend, upcomingFollowups, ticketPriorities } = data;
  const maxFunnelValue = Math.max(...funnel.map((f) => f.value), 1);

  const kpis = [
    { label: "Open Pipeline Value", value: fmtMoney(metrics.openPipelineValue), icon: Wallet, color: palette.accent, details: "Active pipeline" },
    { label: "Weighted Open Pipeline", value: fmtMoney(metrics.weightedOpenPipeline), icon: TrendingUp, color: palette.accent2, details: "Probability adjusted" },
    { label: "Win Rate", value: metrics.winRate, icon: Target, color: palette.accent, details: `Won vs Lost deals` },
    { label: "Active Customers", value: metrics.activeCustomers.toString(), icon: Users, color: palette.accent2, details: "With active status" },
    { label: "Open Tickets", value: metrics.openTickets.toString().padStart(2, '0'), icon: Ticket, color: palette.warn, details: "Requires action" },
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-brand-text font-space">
            Revenue Command Center
          </h1>
          <p className="text-sm mt-1 text-brand-textDim">
            Pipeline, accounts &amp; activity — updated continuously
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full px-4 py-2 border border-brand-border bg-brand-surface">
          <span className="pulse-dot inline-block w-2 h-2 rounded-full bg-brand-teal" />
          <span className="text-xs font-semibold font-mono text-brand-textDim">
            LIVE SYSTEM · ONLINE
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} color={k.color} details={k.details} />
        ))}
      </div>

      {/* Funnel + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Funnel */}
        <div className="lg:col-span-2 rounded-2xl p-6 border border-brand-border bg-brand-surface flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold mb-5 tracking-wide text-brand-text font-space">
              Pipeline by Stage
            </h2>
            <div className="flex flex-col gap-4">
              {funnel.map((f, i) => {
                const widthPct = maxFunnelValue > 0 ? (f.value / maxFunnelValue) * 85 + 15 : 15;
                return (
                  <div key={f.stage} className="flex items-center gap-3">
                    <span className="w-24 text-xs shrink-0 text-brand-textDim truncate">{f.stage}</span>
                    <div className="flex-1 h-7 rounded-lg overflow-hidden bg-brand-surfaceAlt">
                      <div
                        className="h-full rounded-lg flex items-center justify-end px-3 transition-all duration-1000"
                        style={{
                          width: `${widthPct}%`,
                          background: f.stage === "Won"
                            ? `linear-gradient(90deg, ${palette.accent2}, ${palette.accent})`
                            : f.stage === "Lost"
                            ? `linear-gradient(90deg, #4b5563, #374151)`
                            : `linear-gradient(90deg, ${palette.accent2}55, ${palette.accent2}aa)`,
                        }}
                      >
                        <span className="text-[10px] font-bold font-mono text-brand-bg">
                          {f.count}
                        </span>
                      </div>
                    </div>
                    <span className="w-16 text-right text-xs font-mono text-brand-textDim shrink-0">
                      {fmtMoney(f.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-brand-border flex items-center justify-between text-xs text-brand-textDim">
            <span>Total Won Pipeline:</span>
            <span className="font-mono text-brand-teal font-semibold">{fmtMoney(metrics.totalWonValue)}</span>
          </div>
        </div>

        {/* Revenue trend */}
        <div className="lg:col-span-3 rounded-2xl p-6 border border-brand-border bg-brand-surface">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold tracking-wide text-brand-text font-space">
              Pipeline &amp; Won Revenue Trend
            </h2>
            <div className="flex items-center gap-4 text-xs text-brand-textDim">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block bg-brand-indigo" />Pipeline</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block bg-brand-teal" />Won</span>
            </div>
          </div>
          <div style={{ height: 230 }}>
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
                <YAxis tick={{ fill: palette.textDim, fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={fmtMoney} width={52} />
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

      {/* Activity feed + Support Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Activity feed / Followups */}
        <div className="lg:col-span-3 rounded-2xl p-6 border border-brand-border bg-brand-surface">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold tracking-wide text-brand-text font-space">
              Upcoming Follow-ups (7 Days)
            </h2>
            <button 
              onClick={() => onNavigate('activities')}
              className="text-xs text-brand-teal hover:underline font-mono"
            >
              VIEW ALL LOGS
            </button>
          </div>
          <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
            {upcomingFollowups && upcomingFollowups.filter(a => {
              if (!a.next_action_date) return false;
              // include overdue or next 7 days
              return true;
            }).length > 0 ? (
              upcomingFollowups
                .filter(a => a.next_action_date)
                .map((a, i) => {
                  const Icon = activityIcons[a.type] || FileText;
                  const isOverdue = a.next_action_date < todayStr;
                  return (
                    <div 
                      key={i} 
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        isOverdue 
                          ? 'border-brand-red/25 bg-brand-red/5' 
                          : 'border-brand-border bg-brand-surfaceAlt/50 hover:border-brand-border/80'
                      }`}
                    >
                      <div className="rounded-lg p-2 mt-0.5 bg-brand-surfaceAlt border border-brand-border">
                        <Icon size={14} className="text-brand-teal" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold text-brand-text truncate">
                            {a.contact_name || 'No Contact'} {a.company_name ? `· ${a.company_name}` : ''}
                          </p>
                          {isOverdue && (
                            <span className="flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-brand-red/20 text-brand-red border border-brand-red/30 animate-pulse">
                              <AlertCircle size={9} /> OVERDUE
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-1 text-brand-text">{a.next_action || 'No Action Defined'}</p>
                        <p className="text-[10px] mt-0.5 text-brand-textDim italic">Last Note: "{a.notes}"</p>
                      </div>
                      <div className="text-right shrink-0 mt-1 flex flex-col items-end gap-1">
                        <span className="text-[10px] font-mono text-brand-textDim bg-brand-surfaceAlt px-2 py-0.5 rounded border border-brand-border flex items-center gap-1">
                          <Clock size={10} className="text-brand-indigo" />
                          {a.next_action_date}
                        </span>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-brand-textDim">
                <Clock size={32} className="mb-2 text-brand-border" />
                <p className="text-xs font-mono">No upcoming tasks scheduled</p>
              </div>
            )}
          </div>
        </div>

        {/* Ticket priorities */}
        <div className="lg:col-span-2 rounded-2xl p-6 border border-brand-border bg-brand-surface flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold tracking-wide text-brand-text font-space">
                Support Tickets by Priority
              </h2>
              <button 
                onClick={() => onNavigate('tickets')}
                className="text-xs text-brand-teal hover:underline font-mono"
              >
                TICKETS QUEUE
              </button>
            </div>
            
            <div className="space-y-4">
              {[
                { name: 'Urgent', count: ticketPriorities.Urgent || 0, color: palette.danger, bg: 'bg-brand-red/10 border-brand-red/35' },
                { name: 'High', count: ticketPriorities.High || 0, color: palette.warn, bg: 'bg-brand-orange/10 border-brand-orange/35' },
                { name: 'Medium', count: ticketPriorities.Medium || 0, color: '#6366f1', bg: 'bg-indigo-500/10 border-indigo-500/35' },
                { name: 'Low', count: ticketPriorities.Low || 0, color: palette.accent, bg: 'bg-brand-teal/10 border-brand-teal/35' },
              ].map(p => {
                const total = Math.max(Object.values(ticketPriorities).reduce((a, b) => a + b, 0), 1);
                const pct = (p.count / total) * 100;
                
                return (
                  <div key={p.name} className={`p-3 rounded-xl border ${p.bg} flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                      <span className="text-xs font-semibold text-brand-text">{p.name} Priority</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-1.5 rounded-full bg-brand-surfaceAlt overflow-hidden hidden sm:block">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
                      </div>
                      <span className="text-sm font-bold font-mono text-brand-text">{p.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-brand-border text-center text-xs text-brand-textDim font-mono">
            Requires attention: {Object.values(ticketPriorities).reduce((a, b) => a + b, 0)} open cases
          </div>
        </div>
      </div>
    </div>
  );
}
