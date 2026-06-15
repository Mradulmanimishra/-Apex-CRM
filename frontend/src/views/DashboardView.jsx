import React, { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";
import {
  Wallet, Target, TrendingUp, Users, Ticket, ArrowUpRight, ArrowDownRight,
  Phone, Mail, Calendar, Video, FileText, MessageCircle, AlertCircle, Clock, Filter
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

const COLORS = ["#2DD4BF", "#818CF8", "#FB923C", "#F87171", "#C084FC", "#FBBF24", "#F43F5E", "#10B981"];

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
      className="flex flex-col gap-3 rounded-2xl p-5 border bg-brand-surface/65 backdrop-blur-md border-brand-border hover:border-brand-teal/30 hover:shadow-[0_0_20px_rgba(45,212,191,0.03)] hover:translate-y-[-2px] transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-textDim">
          {label}
        </span>
        <div className="rounded-lg p-1.5 bg-brand-surfaceAlt/60 border border-brand-border">
          <Icon size={16} style={{ color }} strokeWidth={2} />
        </div>
      </div>
      <div className="flex items-end justify-between mt-1">
        <span className="text-2xl font-bold font-mono text-brand-text tracking-tight">
          {value}
        </span>
        <span className="text-[10px] text-brand-textDim font-medium font-mono bg-brand-surfaceAlt px-1.5 py-0.5 rounded border border-brand-border/60">
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
  const [simulating, setSimulating] = useState(false);
  const [simulatorToast, setSimulatorToast] = useState(null); // { type: 'success'|'error', text: string }

  // Filters and Interactive Chart Toggles
  const [selectedOwner, setSelectedOwner] = useState("All");
  const [showPipeline, setShowPipeline] = useState(true);
  const [showWon, setShowWon] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Pre-configured owners list
  const owners = ["All", "Priya Nair", "Vikram Singh", "Aarav Mehta"];

  useEffect(() => {
    fetchDashboardData(selectedOwner);
  }, [selectedOwner]);

  const fetchDashboardData = async (ownerName) => {
    try {
      setLoading(true);
      const url = `/api/dashboard?owner=${encodeURIComponent(ownerName)}`;
      const res = await fetch(url);
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

  const handleTriggerSimulator = async () => {
    try {
      setSimulating(true);
      setSimulatorToast(null);
      const res = await fetch("/api/simulator/whatsapp", { method: "POST" });
      if (!res.ok) throw new Error("Simulation failed");
      const json = await res.json();
      setSimulatorToast({ type: "success", text: json.message });
      fetchDashboardData(selectedOwner);
    } catch (err) {
      setSimulatorToast({ type: "error", text: `Simulation failed: ${err.message}` });
    } finally {
      setSimulating(false);
      setTimeout(() => setSimulatorToast(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-teal"></div>
        <p className="text-brand-textDim text-sm font-mono tracking-wide">Synthesizing command metrics...</p>
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
          onClick={() => fetchDashboardData(selectedOwner)}
          className="mt-4 px-4 py-2 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-teal hover:border-brand-teal font-mono transition-colors"
        >
          RETRY SYSTEM LINK
        </button>
      </div>
    );
  }

  const { metrics, funnel, revenueTrend, upcomingFollowups, ticketPriorities, lostReasonStats, ticketStatusStats, leadSourceStats } = data;
  const maxFunnelValue = Math.max(...funnel.map((f) => f.value), 1);

  const kpis = [
    { label: "Open Pipeline Value", value: fmtMoney(metrics.openPipelineValue), icon: Wallet, color: palette.accent, details: "Active pipeline" },
    { label: "Weighted Open Pipeline", value: fmtMoney(metrics.weightedOpenPipeline), icon: TrendingUp, color: palette.accent2, details: "Risk adjusted" },
    { label: "Win Rate", value: metrics.winRate, icon: Target, color: palette.accent, details: `${metrics.wonCount} won / ${metrics.lostCount} lost` },
    { label: "Active Customers", value: metrics.activeCustomers.toString(), icon: Users, color: palette.accent2, details: "Total active" },
    { label: "Open Tickets", value: metrics.openTickets.toString().padStart(2, '0'), icon: Ticket, color: palette.warn, details: "Pending action" },
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Simulator Toast Notification */}
      {simulatorToast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl border shadow-2xl animate-scaleIn text-xs font-mono ${
          simulatorToast.type === "success"
            ? "bg-brand-surface border-brand-teal/30 text-brand-teal"
            : "bg-brand-surface border-brand-red/30 text-brand-red"
        }`}>
          <span className={`w-2 h-2 rounded-full animate-pulse ${simulatorToast.type === "success" ? "bg-brand-teal" : "bg-brand-red"}`} />
          <span>{simulatorToast.text}</span>
          <button onClick={() => setSimulatorToast(null)} className="ml-2 text-brand-textDim hover:text-brand-text">✕</button>
        </div>
      )}
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/60 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-brand-text font-space">
            Revenue Command Center
          </h1>
          <p className="text-xs mt-1 text-brand-textDim">
            Pipeline velocity, accounts health &amp; upcoming items
          </p>
        </div>
        
        {/* Advanced Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Owner filter dropdown */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-brand-border bg-brand-surfaceAlt/60">
            <Filter size={12} className="text-brand-teal" />
            <span className="text-[10px] font-mono text-brand-textDim uppercase">Owner:</span>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="bg-transparent text-xs text-brand-text font-semibold border-none outline-none focus:ring-0 cursor-pointer pr-4"
            >
              {owners.map(owner => (
                <option key={owner} value={owner} className="bg-brand-surface text-brand-text">
                  {owner === "All" ? "All Owners" : owner}
                </option>
              ))}
            </select>
          </div>
          
          {/* WhatsApp Simulator trigger */}
          <button
            onClick={handleTriggerSimulator}
            disabled={simulating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-indigo hover:opacity-90 active:scale-[0.98] text-brand-bg font-bold text-xs rounded-xl uppercase tracking-wider transition-all disabled:opacity-50"
          >
            {simulating ? "Simulating..." : "Simulate WhatsApp"}
          </button>

          <div className="flex items-center gap-2 rounded-xl px-4 py-2 border border-brand-border bg-brand-surfaceAlt/30">
            <span className="pulse-dot inline-block w-2 h-2 rounded-full bg-brand-teal" />
            <span className="text-[10px] font-bold font-mono text-brand-textDim tracking-wider">
              ONLINE
            </span>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} color={k.color} details={k.details} />
        ))}
      </div>

      {/* Collapsible Advanced Analytics Section */}
      <div className="rounded-2xl border border-brand-border bg-brand-surface/40 hover:bg-brand-surface/65 backdrop-blur-md transition-all duration-300">
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-brand-teal/10 border border-brand-teal/20 text-brand-teal">
              <TrendingUp size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-brand-text font-space">
                Advanced Analytical Reports
              </h2>
              <p className="text-[10px] text-brand-textDim mt-0.5 font-mono">
                DEALS LOST REASONS, TICKET STATUS BREAKDOWNS, AND LEAD ACQUISITION SOURCES
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
              advancedOpen ? "bg-brand-teal/20 text-brand-teal border border-brand-teal/30" : "bg-brand-surfaceAlt border border-brand-border text-brand-textDim"
            }`}>
              {advancedOpen ? "ACTIVE" : "COLLAPSED"}
            </span>
            <span className={`transition-transform duration-300 transform ${advancedOpen ? "rotate-180" : ""}`}>
              ▼
            </span>
          </div>
        </button>

        {advancedOpen && (
          <div className="p-6 border-t border-brand-border/60 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
            
            {/* Chart 1: Lost Reasons Pie Chart */}
            <div className="rounded-xl border border-brand-border bg-brand-surfaceAlt/40 p-4 flex flex-col justify-between h-[300px]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-textDim font-space mb-2">
                  Deals: Lost Reasons
                </h3>
                <p className="text-[10px] text-brand-textDim/70 font-mono mb-4">
                  Breakdown of lost deal factors
                </p>
              </div>
              <div className="flex-1 min-h-0 relative flex items-center justify-center">
                {lostReasonStats && lostReasonStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={lostReasonStats.map(item => ({ name: item.lost_reason, value: item.count }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {lostReasonStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: palette.surfaceAlt, border: `1px solid ${palette.border}`, borderRadius: 10, fontSize: 10, fontFamily: "Inter" }}
                        itemStyle={{ color: palette.text }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconSize={8}
                        iconType="circle"
                        wrapperStyle={{ fontSize: 9, fontFamily: "JetBrains Mono", color: palette.textDim }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-[11px] text-brand-textDim italic font-mono">No lost deal metrics logged</span>
                )}
              </div>
            </div>

            {/* Chart 2: Support Tickets Bar Chart */}
            <div className="rounded-xl border border-brand-border bg-brand-surfaceAlt/40 p-4 flex flex-col justify-between h-[300px]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-textDim font-space mb-2">
                  Support Tickets Distribution
                </h3>
                <p className="text-[10px] text-brand-textDim/70 font-mono mb-4">
                  Case counts grouped by workflow state
                </p>
              </div>
              <div className="flex-1 min-h-0 relative">
                {ticketStatusStats && ticketStatusStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ticketStatusStats.map(item => ({ name: item.status, count: item.count }))} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid stroke={palette.border} strokeDasharray="3 6" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: palette.textDim, fontSize: 9, fontFamily: "Inter" }} axisLine={{ stroke: palette.border }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: palette.textDim, fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: palette.surfaceAlt, border: `1px solid ${palette.border}`, borderRadius: 10, fontSize: 10, fontFamily: "Inter" }}
                        itemStyle={{ color: palette.text }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {ticketStatusStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-[11px] text-brand-textDim italic font-mono flex items-center justify-center h-full">No tickets data logged</span>
                )}
              </div>
            </div>

            {/* Chart 3: Lead Sources Donut Chart */}
            <div className="rounded-xl border border-brand-border bg-brand-surfaceAlt/40 p-4 flex flex-col justify-between h-[300px]">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-textDim font-space mb-2">
                  Lead Acquisition Sources
                </h3>
                <p className="text-[10px] text-brand-textDim/70 font-mono mb-4">
                  Contacts lead channels distribution
                </p>
              </div>
              <div className="flex-1 min-h-0 relative flex items-center justify-center">
                {leadSourceStats && leadSourceStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leadSourceStats.map(item => ({ name: item.source || "Unknown", value: item.count }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {leadSourceStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: palette.surfaceAlt, border: `1px solid ${palette.border}`, borderRadius: 10, fontSize: 10, fontFamily: "Inter" }}
                        itemStyle={{ color: palette.text }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconSize={8}
                        iconType="circle"
                        wrapperStyle={{ fontSize: 9, fontFamily: "JetBrains Mono", color: palette.textDim }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-[11px] text-brand-textDim italic font-mono">No lead source metrics logged</span>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Funnel + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Funnel */}
        <div className="lg:col-span-2 rounded-2xl p-6 border border-brand-border bg-brand-surface/65 backdrop-blur-md flex flex-col justify-between hover:border-brand-teal/20 transition-all duration-300">
          <div>
            <h2 className="text-xs font-bold mb-5 uppercase tracking-wider text-brand-textDim font-space">
              Pipeline Funnel Distribution
            </h2>
            <div className="flex flex-col gap-4">
              {funnel.map((f, i) => {
                const widthPct = maxFunnelValue > 0 ? (f.value / maxFunnelValue) * 82 + 18 : 18;
                return (
                  <div key={f.stage} className="flex items-center gap-3">
                    <span className="w-24 text-xs shrink-0 text-brand-textDim truncate font-medium">{f.stage}</span>
                    <div className="flex-1 h-7 rounded-lg overflow-hidden bg-brand-surfaceAlt/60 border border-brand-border/40">
                      <div
                        className="h-full rounded-lg flex items-center justify-end px-3 transition-all duration-1000"
                        style={{
                          width: `${widthPct}%`,
                          background: f.stage === "Won"
                            ? `linear-gradient(90deg, ${palette.accent2}, ${palette.accent})`
                            : f.stage === "Lost"
                            ? `linear-gradient(90deg, #374151, #1f2937)`
                            : `linear-gradient(90deg, ${palette.accent2}33, ${palette.accent2}aa)`,
                        }}
                      >
                        <span className="text-[10px] font-bold font-mono text-brand-bg">
                          {f.count}
                        </span>
                      </div>
                    </div>
                    <span className="w-16 text-right text-xs font-mono text-brand-textDim shrink-0 font-medium">
                      {fmtMoney(f.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-brand-border flex items-center justify-between text-xs text-brand-textDim">
            <span>Total Closed-Won Revenue:</span>
            <span className="font-mono text-brand-teal font-bold text-sm">{fmtMoney(metrics.totalWonValue)}</span>
          </div>
        </div>

        {/* Revenue trend */}
        <div className="lg:col-span-3 rounded-2xl p-6 border border-brand-border bg-brand-surface/65 backdrop-blur-md hover:border-brand-teal/20 transition-all duration-300">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-textDim font-space">
              Revenue and Forecasting Trend
            </h2>
            {/* Interactive chart legend toggles */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowPipeline(!showPipeline)} 
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] transition-all font-mono font-semibold ${
                  showPipeline ? 'bg-[#818CF8]/15 text-[#818CF8] border-[#818CF8]/30' : 'bg-transparent text-brand-textDim border-brand-border'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-brand-indigo" /> 
                Pipeline {showPipeline ? 'ON' : 'OFF'}
              </button>
              <button 
                onClick={() => setShowWon(!showWon)} 
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] transition-all font-mono font-semibold ${
                  showWon ? 'bg-[#2DD4BF]/15 text-[#2DD4BF] border-[#2DD4BF]/30' : 'bg-transparent text-brand-textDim border-brand-border'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-brand-teal" /> 
                Won {showWon ? 'ON' : 'OFF'}
              </button>
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
                <XAxis dataKey="month" tick={{ fill: palette.textDim, fontSize: 11, fontFamily: "Inter" }} axisLine={{ stroke: palette.border }} tickLine={false} />
                <YAxis tick={{ fill: palette.textDim, fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={fmtMoney} width={52} />
                <Tooltip
                  formatter={(v) => fmtMoney(v)}
                  contentStyle={{ background: palette.surfaceAlt, border: `1px solid ${palette.border}`, borderRadius: 10, fontSize: 12, fontFamily: "Inter" }}
                  labelStyle={{ color: palette.text }}
                  itemStyle={{ color: palette.text }}
                />
                {showPipeline && (
                  <Area type="monotone" dataKey="pipeline" stroke={palette.accent2} fill="url(#pipeGrad)" strokeWidth={2} />
                )}
                {showWon && (
                  <Area type="monotone" dataKey="won" stroke={palette.accent} fill="url(#wonGrad)" strokeWidth={2} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity feed + Support Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Activity feed / Followups */}
        <div className="lg:col-span-3 rounded-2xl p-6 border border-brand-border bg-brand-surface/65 backdrop-blur-md hover:border-brand-teal/20 transition-all duration-300">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-textDim font-space">
              Planned Follow-ups ({selectedOwner === 'All' ? 'All Owners' : selectedOwner})
            </h2>
            <button 
              onClick={() => onNavigate('activities')}
              className="text-xs text-brand-teal hover:underline font-mono"
            >
              VIEW ALL TIMELINES
            </button>
          </div>
          <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
            {upcomingFollowups && upcomingFollowups.length > 0 ? (
              upcomingFollowups
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
                        <p className="text-[10px] mt-0.5 text-brand-textDim italic">Notes: "{a.notes}"</p>
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
              <div className="flex flex-col items-center justify-center py-12 text-brand-textDim">
                <Clock size={32} className="mb-2 text-brand-border" />
                <p className="text-xs font-mono">No follow-ups scheduled for selection</p>
              </div>
            )}
          </div>
        </div>

        {/* Ticket priorities */}
        <div className="lg:col-span-2 rounded-2xl p-6 border border-brand-border bg-brand-surface/65 backdrop-blur-md flex flex-col justify-between hover:border-brand-teal/20 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-textDim font-space">
                Ticket Priorities Queue
              </h2>
              <button 
                onClick={() => onNavigate('tickets')}
                className="text-xs text-brand-teal hover:underline font-mono"
              >
                VIEW CASES
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
                  <div key={p.name} className={`p-3 rounded-xl border ${p.bg} flex items-center justify-between hover:scale-[1.02] transition-transform`}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full animate-ping" style={{ background: p.color }} />
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
            {Object.values(ticketPriorities).reduce((a, b) => a + b, 0)} pending support cases
          </div>
        </div>
      </div>
    </div>
  );
}
