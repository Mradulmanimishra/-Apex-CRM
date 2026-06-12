import React, { useState, useEffect } from "react";
import { Plus, Search, HelpCircle, User, Calendar, CheckCircle2, AlertTriangle, AlertCircle, X, Edit2, Trash2 } from "lucide-react";

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

const ISSUE_TYPES = ['Billing', 'Delivery Delay', 'Product Defect', 'Service Issue', 'General Inquiry', 'Other'];
const STATUSES = ['Open', 'In Progress', 'Waiting on Customer', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export default function TicketsView() {
  const [tickets, setTickets] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);

  const [formContactId, setFormContactId] = useState("");
  const [formIssueType, setFormIssueType] = useState("General Inquiry");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState("Open");
  const [formPriority, setFormPriority] = useState("Medium");
  const [formAssignedTo, setFormAssignedTo] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resTickets, resContacts] = await Promise.all([
        fetch("/api/tickets"),
        fetch("/api/contacts")
      ]);

      if (!resTickets.ok || !resContacts.ok) throw new Error("Failed to load support data");

      const dataTickets = await resTickets.json();
      const dataContacts = await resContacts.json();

      setTickets(dataTickets);
      setContacts(dataContacts);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingTicket(null);
    setFormContactId("");
    setFormIssueType("General Inquiry");
    setFormDescription("");
    setFormStatus("Open");
    setFormPriority("Medium");
    setFormAssignedTo("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTicket(t);
    setFormContactId(t.contact_id ? t.contact_id.toString() : "");
    setFormIssueType(t.issue_type || "General Inquiry");
    setFormDescription(t.description || "");
    setFormStatus(t.status || "Open");
    setFormPriority(t.priority || "Medium");
    setFormAssignedTo(t.assigned_to || "");
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return;

    try {
      const res = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete support ticket");
      fetchData();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formIssueType) return alert("Issue type is required");
    if (!formStatus) return alert("Status is required");
    if (!formPriority) return alert("Priority is required");

    const payload = {
      contact_id: formContactId ? parseInt(formContactId) : null,
      issue_type: formIssueType,
      description: formDescription,
      status: formStatus,
      priority: formPriority,
      assigned_to: formAssignedTo,
      opened_date: editingTicket ? editingTicket.opened_date : new Date().toISOString().split("T")[0],
      resolved_date: formStatus === "Resolved" || formStatus === "Closed" 
        ? (editingTicket?.resolved_date || new Date().toISOString().split("T")[0]) 
        : null
    };

    try {
      const url = editingTicket ? `/api/tickets/${editingTicket.id}` : "/api/tickets";
      const method = editingTicket ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save ticket record");

      setIsFormOpen(false);
      fetchData();
    } catch (err) {
      alert("Save failed: " + err.message);
    }
  };

  // Filtering
  const filteredTickets = tickets.filter(t => {
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    const matchesPriority = priorityFilter === "All" || t.priority === priorityFilter;
    
    const query = searchQuery.toLowerCase();
    const matchesSearch = t.issue_type.toLowerCase().includes(query) || 
      (t.description && t.description.toLowerCase().includes(query)) ||
      (t.assigned_to && t.assigned_to.toLowerCase().includes(query)) ||
      (t.contact_name && t.contact_name.toLowerCase().includes(query)) ||
      (t.company_name && t.company_name.toLowerCase().includes(query));

    return matchesStatus && matchesPriority && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-teal"></div>
        <p className="text-brand-textDim text-sm font-mono">Syncing ticket queue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-brand-red">
        <AlertCircle size={48} className="mb-2" />
        <p className="text-brand-text font-medium text-lg">Failed to retrieve support database</p>
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
          <h1 className="text-2xl font-semibold text-brand-text font-space">Support Ticket Queue</h1>
          <p className="text-xs text-brand-textDim mt-0.5">Track and resolve customer concerns and complaints</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-teal text-brand-bg font-semibold text-xs rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus size={16} strokeWidth={2.5} /> RAISE TICKET
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl border border-brand-border bg-brand-surface">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-brand-textDim" />
          <input 
            type="text"
            placeholder="Search tickets, contact, assignment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-xs text-brand-text placeholder-brand-textDim focus:outline-none focus:border-brand-teal"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
        >
          <option value="All">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
        >
          <option value="All">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p} Priority</option>)}
        </select>
      </div>

      {/* Table queue */}
      <div className="rounded-2xl border border-brand-border bg-brand-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-brand-border text-brand-textDim" style={{ background: "rgba(14, 20, 34, 0.4)" }}>
                <th className="p-4 font-semibold">Issue Type</th>
                <th className="p-4 font-semibold">Description</th>
                <th className="p-4 font-semibold">Contact Partner</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Priority</th>
                <th className="p-4 font-semibold">Assigned To</th>
                <th className="p-4 font-semibold">Timeline</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40 text-brand-text">
              {filteredTickets.length > 0 ? (
                filteredTickets.map(t => (
                  <tr key={t.id} className="hover:bg-brand-surfaceAlt/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <HelpCircle size={14} className="text-brand-teal" />
                        <span className="font-semibold text-brand-text">{t.issue_type}</span>
                      </div>
                    </td>
                    <td className="p-4 max-w-[200px] truncate" title={t.description}>
                      {t.description || <span className="text-brand-textDim italic">No details logged</span>}
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-brand-text">{t.contact_name || <span className="text-brand-textDim italic">Individual</span>}</p>
                      <p className="text-[9px] text-brand-textDim">{t.company_name || ""}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        t.status === "Open" ? "bg-brand-red/10 text-brand-red border border-brand-red/20" :
                        t.status === "In Progress" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                        t.status === "Waiting on Customer" ? "bg-brand-orange/10 text-brand-orange border border-brand-orange/20" :
                        t.status === "Resolved" ? "bg-brand-teal/15 text-brand-teal border border-brand-teal/20" :
                        "bg-brand-border text-brand-textDim border border-brand-border"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.priority === "Urgent" ? "bg-brand-red/20 text-brand-red" :
                        t.priority === "High" ? "bg-brand-orange/20 text-brand-orange" :
                        t.priority === "Medium" ? "bg-indigo-500/20 text-indigo-400" :
                        "bg-brand-surfaceAlt text-brand-textDim border border-brand-border"
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      {t.assigned_to ? (
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-brand-textDim" />
                          {t.assigned_to}
                        </span>
                      ) : <span className="text-brand-textDim italic">Unassigned</span>}
                    </td>
                    <td className="p-4 text-brand-textDim font-mono">
                      <div className="space-y-0.5 text-[10px]">
                        <p>Opened: {t.opened_date}</p>
                        {t.resolved_date && <p className="text-brand-teal">Closed: {t.resolved_date}</p>}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEdit(t)}
                          className="p-1 hover:text-brand-teal text-brand-textDim transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id)}
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
                  <td colSpan="8" className="p-8 text-center text-brand-textDim font-mono">
                    No support tickets found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              {editingTicket ? "Modify Support Case" : "File Support Ticket"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Contact Partner Link</label>
                  <select 
                    value={formContactId}
                    onChange={e => setFormContactId(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal"
                  >
                    <option value="">Individual / Unknown</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Issue Type *</label>
                  <select 
                    value={formIssueType}
                    onChange={e => setFormIssueType(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal"
                  >
                    {ISSUE_TYPES.map(it => <option key={it} value={it}>{it}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-brand-textDim font-semibold">Operational Description</label>
                <textarea 
                  rows="3" 
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Provide details of error codes, logs, customer complaints..."
                  className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Ticket Status</label>
                  <select 
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Priority</label>
                  <select 
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Assigned Engineer</label>
                  <input 
                    type="text" 
                    value={formAssignedTo}
                    onChange={e => setFormAssignedTo(e.target.value)}
                    placeholder="E.g. Priya Nair"
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal"
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
                  SAVE CASE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
