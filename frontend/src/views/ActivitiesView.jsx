import React, { useState, useEffect } from "react";
import { Plus, Search, Calendar, Phone, Mail, FileText, Video, MessageCircle, AlertCircle, Trash2, X, PlusCircle, CheckCircle } from "lucide-react";

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

const TYPES = ['Call', 'Email', 'Meeting', 'Site Visit', 'Demo', 'Note', 'WhatsApp Message'];

const activityIcons = {
  Call: Phone, Email: Mail, Meeting: Calendar, Demo: Video, Note: FileText, 'WhatsApp Message': MessageCircle, 'Site Visit': CheckCircle
};

export default function ActivitiesView() {
  const [activities, setActivities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [contactFilter, setContactFilter] = useState("All");
  const [dealFilter, setDealFilter] = useState("All");

  // Log Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 16)); // YYYY-MM-DDTHH:MM
  const [formType, setFormType] = useState("Call");
  const [formContactId, setFormContactId] = useState("");
  const [formDealId, setFormDealId] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formNextAction, setFormNextAction] = useState("");
  const [formNextActionDate, setFormNextActionDate] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resActivities, resContacts, resDeals] = await Promise.all([
        fetch("/api/activities"),
        fetch("/api/contacts"),
        fetch("/api/deals")
      ]);

      if (!resActivities.ok || !resContacts.ok || !resDeals.ok) throw new Error("Failed to load activities logs");

      const dataActivities = await resActivities.json();
      const dataContacts = await resContacts.json();
      const dataDeals = await resDeals.json();

      setActivities(dataActivities);
      setContacts(dataContacts);
      setDeals(dataDeals);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this activity record?")) return;

    try {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete activity record");
      fetchData();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formDate) return alert("Date is required");
    if (!formType) return alert("Type is required");
    if (!formContactId) return alert("Contact is required");

    const payload = {
      date: new Date(formDate).toISOString(),
      type: formType,
      contact_id: parseInt(formContactId),
      deal_id: formDealId ? parseInt(formDealId) : null,
      notes: formNotes,
      next_action: formNextAction || null,
      next_action_date: formNextActionDate || null
    };

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to create activity log");

      setIsFormOpen(false);
      // Reset form
      setFormNotes("");
      setFormNextAction("");
      setFormNextActionDate("");
      fetchData();
    } catch (err) {
      alert("Logging failed: " + err.message);
    }
  };

  // Filter activities
  const filteredActivities = activities.filter(a => {
    const matchesContact = contactFilter === "All" || a.contact_id === parseInt(contactFilter);
    const matchesDeal = dealFilter === "All" || a.deal_id === parseInt(dealFilter);
    return matchesContact && matchesDeal;
  });

  const todayStr = new Date().toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-teal"></div>
        <p className="text-brand-textDim text-sm font-mono">Loading activity streams...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-brand-red">
        <AlertCircle size={48} className="mb-2" />
        <p className="text-brand-text font-medium text-lg">Error loading activities</p>
        <p className="text-brand-textDim text-xs">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 border border-brand-border rounded bg-brand-surface text-brand-teal text-xs font-mono">RELOAD</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title + Action */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text font-space">Activities Log</h1>
          <p className="text-xs text-brand-textDim mt-0.5">Chronological record of touchpoints and follow-up items</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-teal text-brand-bg font-semibold text-xs rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus size={16} strokeWidth={2.5} /> LOG ACTIVITY
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl border border-brand-border bg-brand-surface">
        <div className="space-y-1">
          <label className="text-[10px] uppercase text-brand-textDim font-semibold">Filter by Contact</label>
          <select
            value={contactFilter}
            onChange={(e) => setContactFilter(e.target.value)}
            className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
          >
            <option value="All">All Contacts</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company_name || 'Individual'})</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase text-brand-textDim font-semibold">Filter by Deal</label>
          <select
            value={dealFilter}
            onChange={(e) => setDealFilter(e.target.value)}
            className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
          >
            <option value="All">All Deals</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.deal_name}</option>)}
          </select>
        </div>
      </div>

      {/* Activities Timeline List */}
      <div className="space-y-4">
        {filteredActivities.length > 0 ? (
          filteredActivities.map(a => {
            const Icon = activityIcons[a.type] || FileText;
            const isOverdue = a.next_action_date && a.next_action_date < todayStr;
            const dateObj = new Date(a.date);
            const displayDate = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div 
                key={a.id} 
                className={`flex gap-4 p-5 rounded-2xl border bg-brand-surface transition-all ${
                  isOverdue ? 'border-brand-red/20 hover:border-brand-red/40' : 'border-brand-border hover:border-brand-border/80'
                }`}
              >
                {/* Icon wrapper */}
                <div className="rounded-xl p-3 bg-brand-surfaceAlt border border-brand-border h-fit shrink-0">
                  <Icon size={16} className="text-brand-teal" strokeWidth={2} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-brand-teal bg-brand-surfaceAlt border border-brand-border px-2 py-0.5 rounded">
                        {a.type}
                      </span>
                      <p className="text-xs font-bold text-brand-text mt-2">
                        {a.contact_name || 'Individual'} {a.company_name ? `· ${a.company_name}` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-brand-textDim">{displayDate}</span>
                  </div>

                  {a.deal_name && (
                    <div className="text-[10px] text-brand-indigo font-semibold">
                      Linked Deal: "{a.deal_name}"
                    </div>
                  )}

                  <p className="text-xs text-brand-text leading-relaxed">
                    {a.notes || <span className="text-brand-textDim/50 italic">No notes logged.</span>}
                  </p>

                  {/* Next Action Box */}
                  {(a.next_action || a.next_action_date) && (
                    <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between gap-4 flex-wrap text-xs ${
                      isOverdue ? 'bg-brand-red/5 border-brand-red/20' : 'bg-brand-surfaceAlt/60 border-brand-border/40'
                    }`}>
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase tracking-wider text-brand-textDim font-bold">Planned Follow-up</span>
                        <p className="font-semibold text-brand-text">{a.next_action || 'Follow up'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border ${
                          isOverdue 
                            ? 'bg-brand-red/10 text-brand-red border-brand-red/30 animate-pulse' 
                            : 'bg-brand-surface border-brand-border text-brand-textDim'
                        }`}>
                          {isOverdue && <AlertCircle size={11} />}
                          Date: {a.next_action_date || 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0">
                  <button 
                    onClick={() => handleDelete(a.id)}
                    className="p-1 hover:text-brand-red text-brand-textDim transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center border border-dashed border-brand-border/60 rounded-2xl text-brand-textDim font-mono text-xs">
            No activity logs recorded.
          </div>
        )}
      </div>

      {/* Log Activity Modal */}
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
              Log Activity Touchpoint
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Touchpoint Date/Time *</label>
                  <input 
                    type="datetime-local" 
                    required 
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Activity Type *</label>
                  <select 
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal"
                  >
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Contact Partner *</label>
                  <select 
                    required
                    value={formContactId}
                    onChange={e => setFormContactId(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal"
                  >
                    <option value="">Select Contact</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company_name || 'Individual'})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Linked Opportunity Deal</label>
                  <select 
                    value={formDealId}
                    onChange={e => setFormDealId(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal"
                  >
                    <option value="">Unlinked / None</option>
                    {deals.map(d => <option key={d.id} value={d.id}>{d.deal_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-brand-textDim font-semibold">Notes / Discussion Details</label>
                <textarea 
                  rows="3" 
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Summarize details of the phone call or meeting discussion..."
                  className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-brand-border bg-brand-surfaceAlt/40">
                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] uppercase text-brand-teal font-semibold font-space">Next Step Follow-up Scheduler</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Action Description</label>
                  <input 
                    type="text" 
                    value={formNextAction}
                    onChange={e => setFormNextAction(e.target.value)}
                    placeholder="E.g. Send API docs"
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Follow-up Date</label>
                  <input 
                    type="date" 
                    value={formNextActionDate}
                    onChange={e => setFormNextActionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                  />
                </div>
              </div>

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
                  LOG TOUCHPOINT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
