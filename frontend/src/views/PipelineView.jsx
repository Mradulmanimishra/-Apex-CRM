import React, { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, X, AlertCircle, Kanban, List, User, DollarSign, Calendar, TrendingUp, AlertTriangle, Download } from "lucide-react";

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

const STAGES = ['New Lead', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
const SOURCES = ['Referral', 'Website', 'Cold Outreach', 'Social Media', 'Event/Trade Show', 'Advertisement', 'WhatsApp', 'Other'];

export default function PipelineView({ initialSearchQuery = "" }) {
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View switch: 'kanban' or 'list'
  const [viewMode, setViewMode] = useState("kanban");
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  // Modals & Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);

  const [formName, setFormName] = useState("");
  const [formContactId, setFormContactId] = useState("");
  const [formCompanyId, setFormCompanyId] = useState("");
  const [formStage, setFormStage] = useState("New Lead");
  const [formValue, setFormValue] = useState("");
  const [formProbability, setFormProbability] = useState("50");
  const [formCloseDate, setFormCloseDate] = useState("");
  const [formOwner, setFormOwner] = useState("");
  const [formSource, setFormSource] = useState("Website");
  const [formLostReason, setFormLostReason] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resDeals, resContacts, resCompanies] = await Promise.all([
        fetch("/api/deals"),
        fetch("/api/contacts"),
        fetch("/api/companies")
      ]);

      if (!resDeals.ok || !resContacts.ok || !resCompanies.ok) throw new Error("Failed to load pipeline");

      const dataDeals = await resDeals.json();
      const dataContacts = await resContacts.json();
      const dataCompanies = await resCompanies.json();

      setDeals(dataDeals);
      setContacts(dataContacts);
      setCompanies(dataCompanies);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingDeal(null);
    setFormName("");
    setFormContactId("");
    setFormCompanyId("");
    setFormStage("New Lead");
    setFormValue("");
    setFormProbability("50");
    setFormCloseDate("");
    setFormOwner("");
    setFormSource("Website");
    setFormLostReason("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (deal) => {
    setEditingDeal(deal);
    setFormName(deal.deal_name || "");
    setFormContactId(deal.contact_id ? deal.contact_id.toString() : "");
    setFormCompanyId(deal.company_id ? deal.company_id.toString() : "");
    setFormStage(deal.stage || "New Lead");
    setFormValue(deal.value ? deal.value.toString() : "");
    // convert probability to 0-100 percentage integer
    setFormProbability(deal.probability ? Math.round(deal.probability * 100).toString() : "50");
    setFormCloseDate(deal.expected_close_date || "");
    setFormOwner(deal.owner || "");
    setFormSource(deal.source || "Website");
    setFormLostReason(deal.lost_reason || "");
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this deal?")) return;

    try {
      const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete deal");
      fetchData();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return alert("Deal name is required");

    const payload = {
      deal_name: formName,
      contact_id: formContactId ? parseInt(formContactId) : null,
      company_id: formCompanyId ? parseInt(formCompanyId) : null,
      stage: formStage,
      value: formValue ? parseFloat(formValue) : 0,
      probability: formProbability ? parseFloat(formProbability) / 100 : 0.5,
      expected_close_date: formCloseDate,
      owner: formOwner,
      source: formSource,
      lost_reason: formStage === "Lost" ? formLostReason : null
    };

    try {
      const url = editingDeal ? `/api/deals/${editingDeal.id}` : "/api/deals";
      const method = editingDeal ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save deal");

      setIsFormOpen(false);
      fetchData();
    } catch (err) {
      alert("Save failed: " + err.message);
    }
  };

  const handleExportCSV = () => {
    if (filteredDeals.length === 0) return alert("No deal records to export");
    const headers = ["ID", "Deal Name", "Contact", "Company", "Stage", "Value", "Probability", "Expected Close Date", "Owner", "Source", "Lost Reason"];
    const rows = filteredDeals.map(d => [
      d.id,
      `"${d.deal_name.replace(/"/g, '""')}"`,
      d.contact_name ? `"${d.contact_name.replace(/"/g, '""')}"` : "",
      d.company_name ? `"${d.company_name.replace(/"/g, '""')}"` : "",
      d.stage || "",
      d.value || 0,
      d.probability || 0,
      d.expected_close_date || "",
      d.owner ? `"${d.owner.replace(/"/g, '""')}"` : "",
      d.source || "",
      d.lost_reason ? `"${d.lost_reason.replace(/"/g, '""').replace(/\n/g, ' ')}"` : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `quantum_crm_deals_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Drag and Drop handlers
  const handleDragStart = (e, dealId) => {
    e.dataTransfer.setData("text/plain", dealId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, stageName) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("text/plain");
    const deal = deals.find(d => d.id === parseInt(dealId));
    if (!deal) return;

    // Check if stage actually changed
    if (deal.stage === stageName) return;

    // Build update payload
    const payload = {
      ...deal,
      stage: stageName,
      // If we move it to won or lost, auto adjust probabilities
      probability: stageName === 'Won' ? 1.0 : stageName === 'Lost' ? 0.0 : deal.probability,
      lost_reason: stageName === 'Lost' ? (deal.lost_reason || 'Moved to Lost in pipeline') : null
    };

    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to update deal stage");
      fetchData();
    } catch (err) {
      alert("Stage update failed: " + err.message);
    }
  };

  // Filter deals by search
  const filteredDeals = deals.filter(d => {
    const query = searchQuery.toLowerCase();
    return d.deal_name.toLowerCase().includes(query) ||
      (d.owner && d.owner.toLowerCase().includes(query)) ||
      (d.contact_name && d.contact_name.toLowerCase().includes(query)) ||
      (d.company_name && d.company_name.toLowerCase().includes(query));
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-teal"></div>
        <p className="text-brand-textDim text-sm font-mono">Loading transaction flows...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-brand-red">
        <AlertCircle size={48} className="mb-2" />
        <p className="text-brand-text font-medium text-lg">Failed to retrieve pipeline</p>
        <p className="text-brand-textDim text-xs">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 border border-brand-border rounded bg-brand-surface text-brand-teal text-xs font-mono">RELOAD</button>
      </div>
    );
  }

  // Calculate totals
  const totalValue = filteredDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const weightedValue = filteredDeals.reduce((sum, d) => sum + ((d.value || 0) * (d.probability || 0)), 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title + Views + Action */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text font-space">Deals Pipeline</h1>
          <p className="text-xs text-brand-textDim mt-0.5">Track opportunities, close rates, and projected values</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex rounded-xl bg-brand-surface p-1 border border-brand-border">
            <button 
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === "kanban" 
                  ? "bg-brand-teal text-brand-bg shadow" 
                  : "text-brand-textDim hover:text-brand-text"
              }`}
            >
              <Kanban size={14} /> Board
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === "list" 
                  ? "bg-brand-teal text-brand-bg shadow" 
                  : "text-brand-textDim hover:text-brand-text"
              }`}
            >
              <List size={14} /> Table
            </button>
          </div>

          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 border border-brand-border bg-brand-surfaceAlt/60 text-brand-text font-semibold text-xs rounded-xl hover:border-brand-teal/40 transition-colors"
          >
            <Download size={14} /> EXPORT CSV
          </button>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-teal text-brand-bg font-semibold text-xs rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus size={16} strokeWidth={2.5} /> NEW OPPORTUNITY
          </button>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl border border-brand-border bg-brand-surface">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-brand-textDim" />
          <input 
            type="text"
            placeholder="Search deal name, company, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-xs text-brand-text placeholder-brand-textDim focus:outline-none focus:border-brand-teal"
          />
        </div>
        <div className="flex flex-col justify-center px-4">
          <span className="text-[10px] uppercase text-brand-textDim tracking-wider">Total Value</span>
          <span className="text-lg font-bold font-mono text-brand-text">${totalValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
        </div>
        <div className="flex flex-col justify-center px-4 border-l border-brand-border">
          <span className="text-[10px] uppercase text-brand-textDim tracking-wider">Weighted Forecast</span>
          <span className="text-lg font-bold font-mono text-brand-teal">${weightedValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
        </div>
      </div>

      {/* Pipeline Board View */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageDeals = filteredDeals.filter(d => d.stage === stage);
            const stageTotal = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
            
            return (
              <div 
                key={stage} 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
                className="flex flex-col min-w-[220px] rounded-2xl border border-brand-border bg-brand-surfaceAlt p-4 min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 border-b border-brand-border pb-2">
                  <div>
                    <h3 className="text-xs font-bold text-brand-text uppercase">{stage}</h3>
                    <p className="text-[10px] text-brand-textDim font-mono mt-0.5">${stageTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-surface text-brand-text border border-brand-border">
                    {stageDeals.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {stageDeals.map(deal => (
                    <div 
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onClick={() => handleOpenEdit(deal)}
                      className="p-4 rounded-xl border border-brand-border bg-brand-surface hover:border-brand-teal/40 cursor-grab active:cursor-grabbing transition-all space-y-3 shadow-md hover:shadow-brand-teal/5"
                    >
                      <div>
                        <h4 className="text-xs font-semibold text-brand-text hover:text-brand-teal truncate" title={deal.deal_name}>
                          {deal.deal_name}
                        </h4>
                        <p className="text-[10px] text-brand-textDim mt-0.5 truncate">{deal.company_name || 'Individual'}</p>
                      </div>

                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold font-mono text-brand-text">${(deal.value).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                        <span className="px-1.5 py-0.2 rounded font-mono bg-brand-surfaceAlt border border-brand-border text-brand-textDim text-[9px]">
                          {Math.round(deal.probability * 100)}%
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[9px] text-brand-textDim pt-2 border-t border-brand-border/40">
                        <span className="flex items-center gap-1"><User size={10} className="text-brand-indigo" />{deal.owner || 'Unassigned'}</span>
                        {deal.expected_close_date && <span className="font-mono text-brand-textDim">{deal.expected_close_date}</span>}
                      </div>

                      {deal.stage === 'Lost' && deal.lost_reason && (
                        <div className="p-1.5 rounded bg-brand-red/10 border border-brand-red/20 text-[9px] text-brand-red flex items-start gap-1">
                          <AlertTriangle size={10} className="shrink-0 mt-0.5" />
                          <span className="italic truncate" title={deal.lost_reason}>"{deal.lost_reason}"</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="h-24 rounded-xl border border-dashed border-brand-border/60 flex items-center justify-center text-brand-textDim text-[10px] italic">
                      Drag deals here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Alternative Table View */
        <div className="rounded-2xl border border-brand-border bg-brand-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-border text-brand-textDim" style={{ background: "rgba(14, 20, 34, 0.4)" }}>
                  <th className="p-4 font-semibold">Deal Name</th>
                  <th className="p-4 font-semibold">Company &amp; Contact</th>
                  <th className="p-4 font-semibold">Stage</th>
                  <th className="p-4 font-semibold">Value</th>
                  <th className="p-4 font-semibold">Probability</th>
                  <th className="p-4 font-semibold">Weighted Value</th>
                  <th className="p-4 font-semibold">Close Date</th>
                  <th className="p-4 font-semibold">Owner</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40 text-brand-text">
                {filteredDeals.length > 0 ? (
                  filteredDeals.map(d => (
                    <tr 
                      key={d.id} 
                      onClick={() => handleOpenEdit(d)}
                      className="hover:bg-brand-surfaceAlt/30 cursor-pointer transition-colors"
                    >
                      <td className="p-4">
                        <p className="font-semibold text-brand-text">{d.deal_name}</p>
                        <span className="text-[10px] text-brand-textDim font-mono bg-brand-surfaceAlt px-1.5 py-0.2 rounded border border-brand-border mt-0.5 inline-block">{d.source}</span>
                      </td>
                      <td className="p-4">
                        <p className="font-medium">{d.company_name || <span className="text-brand-textDim italic">Individual</span>}</p>
                        <p className="text-[10px] text-brand-textDim mt-0.5">{d.contact_name || "-"}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          d.stage === "Won" ? "bg-brand-teal/15 text-brand-teal border border-brand-teal/20" :
                          d.stage === "Lost" ? "bg-brand-red/15 text-brand-red border border-brand-red/20" :
                          d.stage === "Negotiation" ? "bg-brand-indigo/15 text-brand-indigo border border-brand-indigo/20" :
                          "bg-brand-border text-brand-textDim border border-brand-border/40"
                        }`}>
                          {d.stage}
                        </span>
                      </td>
                      <td className="p-4 font-bold font-mono">${(d.value).toLocaleString()}</td>
                      <td className="p-4 font-mono text-brand-textDim">{Math.round(d.probability * 100)}%</td>
                      <td className="p-4 font-bold font-mono text-brand-teal">${(d.value * d.probability).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                      <td className="p-4 font-mono text-brand-textDim">{d.expected_close_date || "-"}</td>
                      <td className="p-4 text-brand-textDim">{d.owner || "-"}</td>
                      <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenEdit(d)}
                            className="p-1 hover:text-brand-teal text-brand-textDim transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDelete(d.id)}
                            className="p-1 hover:text-brand-red text-brand-textDim transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-brand-textDim font-mono">
                      No deals tracked
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-2xl relative animate-scaleIn">
            <button 
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 p-1 text-brand-textDim hover:text-brand-text transition-colors"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-semibold text-brand-text mb-4 font-space">
              {editingDeal ? "Update Deal Opportunity" : "Register Deal Opportunity"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-brand-textDim font-semibold">Deal Name *</label>
                <input 
                  type="text" 
                  required 
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="E.g. Acme Cloud Pilot"
                  className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Contact Link</label>
                  <select 
                    value={formContactId}
                    onChange={e => setFormContactId(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal"
                  >
                    <option value="">Unlinked / None</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Company Link</label>
                  <select 
                    value={formCompanyId}
                    onChange={e => setFormCompanyId(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal"
                  >
                    <option value="">Unlinked / None</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Deal Stage</label>
                  <select 
                    value={formStage}
                    onChange={e => {
                      setFormStage(e.target.value);
                      if (e.target.value === 'Won') setFormProbability('100');
                      if (e.target.value === 'Lost') setFormProbability('0');
                    }}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal"
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Deal Value ($)</label>
                  <input 
                    type="number" 
                    value={formValue}
                    onChange={e => setFormValue(e.target.value)}
                    placeholder="E.g. 50000"
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Probability (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={formProbability}
                    onChange={e => setFormProbability(e.target.value)}
                    placeholder="50"
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Expected Close</label>
                  <input 
                    type="date" 
                    value={formCloseDate}
                    onChange={e => setFormCloseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Deal Owner</label>
                  <input 
                    type="text" 
                    value={formOwner}
                    onChange={e => setFormOwner(e.target.value)}
                    placeholder="E.g. Priya Nair"
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Source</label>
                  <select 
                    value={formSource}
                    onChange={e => setFormSource(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal"
                  >
                    {SOURCES.map(src => <option key={src} value={src}>{src}</option>)}
                  </select>
                </div>
              </div>

              {/* Conditional Lost Reason Input */}
              {formStage === "Lost" && (
                <div className="space-y-1 p-3 bg-brand-red/5 border border-brand-red/30 rounded-xl animate-fadeIn">
                  <label className="text-[10px] uppercase text-brand-red font-semibold flex items-center gap-1">
                    <AlertTriangle size={12} /> Reason for Loss
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={formLostReason}
                    onChange={e => setFormLostReason(e.target.value)}
                    placeholder="E.g. Competitor undercut price, lack of key API features..."
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-red/40 rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-red"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-brand-border rounded-xl text-brand-textDim hover:text-brand-text font-semibold hover:border-brand-border/80 transition-colors"
                >
                  CANCEL
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-brand-teal text-brand-bg font-bold rounded-xl hover:opacity-90 transition-opacity"
                >
                  SAVE TRANSACTION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
