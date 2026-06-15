import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Edit2, Trash2, X, Building, Mail, Phone, Tag, 
  Layers, CheckCircle, HelpCircle, FileText, AlertCircle, Calendar, PlusCircle, Download, Upload
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

const SOURCES = ['Referral', 'Website', 'Cold Outreach', 'Social Media', 'Event/Trade Show', 'Advertisement', 'WhatsApp', 'Other'];
const STATUSES = ['Lead', 'Qualified', 'Active Customer', 'Inactive', 'Lost'];

export default function ContactsView({ initialSelectedContactId }) {
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fileInputRef = React.useRef(null);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [tagFilter, setTagFilter] = useState("");

  // Modals & Panels
  const [selectedContactDetails, setSelectedContactDetails] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formCompanyId, setFormCompanyId] = useState("");
  const [formSource, setFormSource] = useState("Website");
  const [formStatus, setFormStatus] = useState("Lead");
  const [formTags, setFormTags] = useState("");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (initialSelectedContactId) {
      fetchContactDetails(initialSelectedContactId);
    }
  }, [initialSelectedContactId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resContacts, resCompanies] = await Promise.all([
        fetch("/api/contacts"),
        fetch("/api/companies")
      ]);

      if (!resContacts.ok || !resCompanies.ok) throw new Error("Failed to load records");

      const dataContacts = await resContacts.json();
      const dataCompanies = await resCompanies.json();

      setContacts(dataContacts);
      setCompanies(dataCompanies);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchContactDetails = async (id) => {
    try {
      const res = await fetch(`/api/contacts/${id}`);
      if (!res.ok) throw new Error("Failed to load contact details");
      const data = await res.json();
      setSelectedContactDetails(data);
    } catch (err) {
      alert("Error loading details: " + err.message);
    }
  };

  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormRole("");
    setFormCompanyId("");
    setFormSource("Website");
    setFormStatus("Lead");
    setFormTags("");
    setFormNotes("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (contact, e) => {
    e.stopPropagation();
    setEditingContact(contact);
    setFormName(contact.name || "");
    setFormEmail(contact.email || "");
    setFormPhone(contact.phone || "");
    setFormRole(contact.role_title || "");
    setFormCompanyId(contact.company_id ? contact.company_id.toString() : "");
    setFormSource(contact.source || "Website");
    setFormStatus(contact.status || "Lead");
    setFormTags(contact.tags || "");
    setFormNotes(contact.notes || "");
    setIsFormOpen(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete contact");
      fetchData();
      if (selectedContactDetails && selectedContactDetails.contact.id === id) {
        setSelectedContactDetails(null);
      }
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return alert("Name is required");

    const payload = {
      name: formName,
      email: formEmail,
      phone: formPhone,
      role_title: formRole,
      company_id: formCompanyId ? parseInt(formCompanyId) : null,
      source: formSource,
      status: formStatus,
      tags: formTags,
      last_contact_date: editingContact ? editingContact.last_contact_date : new Date().toISOString().split("T")[0],
      notes: formNotes
    };

    try {
      const url = editingContact ? `/api/contacts/${editingContact.id}` : "/api/contacts";
      const method = editingContact ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save contact");

      setIsFormOpen(false);
      fetchData();
      // If editing currently selected contact, reload details
      if (editingContact && selectedContactDetails && selectedContactDetails.contact.id === editingContact.id) {
        fetchContactDetails(editingContact.id);
      }
    } catch (err) {
      alert("Save failed: " + err.message);
    }
  };

  const handleExportCSV = () => {
    if (filteredContacts.length === 0) return alert("No contact records to export");
    const headers = ["ID", "Name", "Email", "Phone", "Role Title", "Company", "Source", "Status", "Tags", "Last Contact Date", "Notes"];
    const rows = filteredContacts.map(c => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      c.email ? `"${c.email.replace(/"/g, '""')}"` : "",
      c.phone ? `"${c.phone.replace(/"/g, '""')}"` : "",
      c.role_title ? `"${c.role_title.replace(/"/g, '""')}"` : "",
      c.company_name ? `"${c.company_name.replace(/"/g, '""')}"` : "",
      c.source || "",
      c.status || "",
      c.tags ? `"${c.tags.replace(/"/g, '""')}"` : "",
      c.last_contact_date || "",
      c.notes ? `"${c.notes.replace(/"/g, '""').replace(/\n/g, ' ')}"` : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apex_crm_contacts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const triggerCSVImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const parseCSVText = (text) => {
    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push("");
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') {
          i++;
        }
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }

    if (lines.length === 0) return [];

    const headers = lines[0].map(h => h.trim().replace(/^"|"$/g, ''));
    const dataRows = lines.slice(1);

    return dataRows
      .map(r => {
        const obj = {};
        headers.forEach((h, index) => {
          let val = r[index] ? r[index].trim() : "";
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1).replace(/""/g, '"');
          }
          obj[h] = val;
        });
        return obj;
      })
      .filter(obj => obj.Name || obj.name);
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const parsedData = parseCSVText(text);
        if (parsedData.length === 0) {
          throw new Error("No records found in CSV file. Ensure columns have a header name 'Name' or 'name'.");
        }

        const confirmMsg = `Discovered ${parsedData.length} contacts. Proceed to import into database?`;
        if (!confirm(confirmMsg)) return;

        const res = await fetch("/api/contacts/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedData)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to import contacts");

        alert(`Successfully imported ${data.count} contacts!`);
        fetchData();
      } catch (err) {
        alert("Import failed: " + err.message);
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  // Filter logic
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.role_title && c.role_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.company_name && c.company_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    const matchesSource = sourceFilter === "All" || c.source === sourceFilter;
    const matchesTag = !tagFilter.trim() || (c.tags && c.tags.toLowerCase().includes(tagFilter.toLowerCase()));

    return matchesSearch && matchesStatus && matchesSource && matchesTag;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-teal"></div>
        <p className="text-brand-textDim text-sm font-mono">Syncing directory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-brand-red">
        <AlertCircle size={48} className="mb-2" />
        <p className="text-brand-text font-medium text-lg">Failed to load contacts</p>
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
          <h1 className="text-2xl font-semibold text-brand-text font-space">Contact Directory</h1>
          <p className="text-xs text-brand-textDim mt-0.5">Manage details and customer relationship structures</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".csv" 
            onChange={handleImportCSV} 
            className="hidden" 
          />
          <button 
            onClick={triggerCSVImport}
            className="flex items-center gap-1.5 px-4 py-2 border border-brand-border bg-brand-surfaceAlt/60 text-brand-text font-semibold text-xs rounded-xl hover:border-brand-teal/40 transition-colors animate-pulse-slow"
          >
            <Upload size={14} className="text-brand-teal" /> IMPORT CSV
          </button>
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
            <Plus size={16} strokeWidth={2.5} /> ADD CONTACT
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-2xl border border-brand-border bg-brand-surface">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-brand-textDim" />
          <input 
            type="text"
            placeholder="Search contacts, company, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-xs text-brand-text placeholder-brand-textDim focus:outline-none focus:border-brand-teal"
          />
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
        >
          <option value="All">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Source */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
        >
          <option value="All">All Sources</option>
          {SOURCES.map(src => <option key={src} value={src}>{src}</option>)}
        </select>

        {/* Tag Filter */}
        <div className="relative">
          <Tag size={14} className="absolute left-3 top-3 text-brand-textDim" />
          <input 
            type="text"
            placeholder="Filter by tag (e.g. VIP)..."
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-xs text-brand-text placeholder-brand-textDim focus:outline-none focus:border-brand-teal"
          />
        </div>
      </div>

      {/* Main Grid: Directory + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table List View */}
        <div className={`rounded-2xl border border-brand-border bg-brand-surface overflow-hidden transition-all duration-300 ${
          selectedContactDetails ? "lg:col-span-7" : "lg:col-span-12"
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-border text-brand-textDim" style={{ background: "rgba(14, 20, 34, 0.4)" }}>
                  <th className="p-4 font-semibold">Name &amp; Role</th>
                  <th className="p-4 font-semibold">Company</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Source</th>
                  <th className="p-4 font-semibold hidden md:table-cell">Tags</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map(c => (
                    <tr 
                      key={c.id}
                      onClick={() => fetchContactDetails(c.id)}
                      className={`hover:bg-brand-surfaceAlt/60 cursor-pointer transition-colors ${
                        selectedContactDetails && selectedContactDetails.contact.id === c.id ? "bg-brand-surfaceAlt border-l-2 border-l-brand-teal" : ""
                      }`}
                    >
                      <td className="p-4">
                        <p className="font-semibold text-brand-text">{c.name}</p>
                        <p className="text-[10px] text-brand-textDim mt-0.5">{c.role_title || "No Role Title"}</p>
                      </td>
                      <td className="p-4 text-brand-text">
                        {c.company_name ? (
                          <span className="flex items-center gap-1">
                            <Building size={12} className="text-brand-indigo" />
                            {c.company_name}
                          </span>
                        ) : (
                          <span className="text-brand-textDim italic">None</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          c.status === "Active Customer" ? "bg-brand-teal/15 text-brand-teal border border-brand-teal/20" :
                          c.status === "Lead" ? "bg-blue-500/15 text-blue-400 border border-blue-500/20" :
                          c.status === "Qualified" ? "bg-brand-indigo/15 text-brand-indigo border border-brand-indigo/20" :
                          c.status === "Lost" ? "bg-brand-red/15 text-brand-red border border-brand-red/20" :
                          "bg-brand-textDim/15 text-brand-textDim border border-brand-border"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4 text-brand-textDim">{c.source}</td>
                      <td className="p-4 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {c.tags ? c.tags.split(",").map(t => (
                            <span key={t} className="px-1.5 py-0.5 rounded text-[9px] bg-brand-surfaceAlt border border-brand-border text-brand-textDim font-mono">
                              {t.trim()}
                            </span>
                          )) : <span className="text-brand-textDim/40 italic">-</span>}
                        </div>
                      </td>
                      <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => handleOpenEdit(c, e)}
                            className="p-1 hover:text-brand-teal text-brand-textDim transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={(e) => handleDelete(c.id, e)}
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
                    <td colSpan="6" className="p-8 text-center text-brand-textDim font-mono">
                      No matching records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Contact detail overlay pane */}
        {selectedContactDetails && (
          <div className="lg:col-span-5 p-6 rounded-2xl border border-brand-border bg-brand-surface space-y-6 animate-slideIn">
            {/* Detail Header */}
            <div className="flex items-start justify-between pb-4 border-b border-brand-border">
              <div>
                <h2 className="text-lg font-semibold text-brand-text">{selectedContactDetails.contact.name}</h2>
                <p className="text-xs text-brand-teal font-mono mt-0.5">{selectedContactDetails.contact.role_title || "No Title Specified"}</p>
              </div>
              <button 
                onClick={() => setSelectedContactDetails(null)}
                className="p-1 text-brand-textDim hover:text-brand-text transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Direct Info */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-brand-textDim uppercase">Email Address</span>
                <p className="font-semibold text-brand-text break-all flex items-center gap-1.5">
                  <Mail size={12} className="text-brand-teal" />
                  {selectedContactDetails.contact.email || "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-brand-textDim uppercase">Phone Number</span>
                <p className="font-semibold text-brand-text flex items-center gap-1.5">
                  <Phone size={12} className="text-brand-teal" />
                  {selectedContactDetails.contact.phone || "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-brand-textDim uppercase">Company</span>
                <p className="font-semibold text-brand-text flex items-center gap-1.5">
                  <Building size={12} className="text-brand-indigo" />
                  {selectedContactDetails.contact.company_name || "Unlinked"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-brand-textDim uppercase">Last Contact</span>
                <p className="font-semibold text-brand-text font-mono">
                  {selectedContactDetails.contact.last_contact_date || "Never"}
                </p>
              </div>
            </div>

            {/* Notes Section */}
            <div className="p-3 bg-brand-surfaceAlt border border-brand-border rounded-xl">
              <span className="text-[9px] text-brand-textDim uppercase font-semibold">General Notes</span>
              <p className="text-xs text-brand-text mt-1 italic leading-relaxed">
                "{selectedContactDetails.contact.notes || "No notes logged for this contact."}"
              </p>
            </div>

            {/* Relations Tabs Accordion */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-textDim font-space">Linked Entities</h3>

              {/* Linked Deals */}
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-brand-text">
                  <Layers size={13} className="text-brand-indigo" /> Deals ({selectedContactDetails.deals.length})
                </div>
                {selectedContactDetails.deals.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedContactDetails.deals.map(d => (
                      <div key={d.id} className="p-2 rounded border border-brand-border bg-brand-surfaceAlt/30 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-brand-text">{d.deal_name}</p>
                          <p className="text-[10px] text-brand-textDim mt-0.5">Stage: <span className="text-brand-indigo">{d.stage}</span></p>
                        </div>
                        <span className="font-mono text-brand-teal font-semibold">${(d.value).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[10px] text-brand-textDim italic pl-4">No active deals found</p>}
              </div>

              {/* Linked Tickets */}
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-brand-text">
                  <CheckCircle size={13} className="text-brand-warn" /> Support Cases ({selectedContactDetails.tickets.length})
                </div>
                {selectedContactDetails.tickets.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedContactDetails.tickets.map(t => (
                      <div key={t.id} className="p-2 rounded border border-brand-border bg-brand-surfaceAlt/30 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-brand-text">{t.issue_type}</p>
                          <p className="text-[10px] text-brand-textDim mt-0.5">Status: <span className="text-brand-text">{t.status}</span></p>
                        </div>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                          t.priority === 'Urgent' ? 'bg-brand-red/20 text-brand-red' : 
                          t.priority === 'High' ? 'bg-brand-orange/20 text-brand-orange' : 'bg-brand-border text-brand-textDim'
                        }`}>{t.priority}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[10px] text-brand-textDim italic pl-4">No logged support cases</p>}
              </div>

              {/* Linked Activities */}
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-brand-text">
                  <Calendar size={13} className="text-brand-teal" /> Activity Log ({selectedContactDetails.activities.length})
                </div>
                {selectedContactDetails.activities.length > 0 ? (
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                    {selectedContactDetails.activities.map(a => (
                      <div key={a.id} className="p-2 rounded border border-brand-border bg-brand-surfaceAlt/30 text-[10px] space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-brand-teal">{a.type}</span>
                          <span className="text-brand-textDim font-mono text-[9px]">{a.date.split("T")[0]}</span>
                        </div>
                        <p className="text-brand-text">{a.notes}</p>
                        {a.next_action && (
                          <div className="pt-1 mt-1 border-t border-brand-border/40 text-[9px] text-brand-textDim">
                            Next: <span className="text-brand-indigo font-medium">{a.next_action}</span> on <span className="font-mono">{a.next_action_date}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[10px] text-brand-textDim italic pl-4">No historical activities logged</p>}
              </div>
            </div>
          </div>
        )}
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
              {editingContact ? "Modify Contact Profile" : "Create New Contact"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="E.g. Aarav Mehta"
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Role Title</label>
                  <input 
                    type="text" 
                    value={formRole}
                    onChange={e => setFormRole(e.target.value)}
                    placeholder="E.g. Tech Lead"
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Email</label>
                  <input 
                    type="email" 
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Phone</label>
                  <input 
                    type="text" 
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Linked Company</label>
                  <select 
                    value={formCompanyId}
                    onChange={e => setFormCompanyId(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal"
                  >
                    <option value="">Unlinked / Individual</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Status</label>
                  <select 
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Tags (Comma-separated)</label>
                  <input 
                    type="text" 
                    value={formTags}
                    onChange={e => setFormTags(e.target.value)}
                    placeholder="VIP, Enterprise, Local"
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-brand-textDim font-semibold">Notes</label>
                <textarea 
                  rows="3" 
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="E.g. Met at regional expo, wants custom API specs next week."
                  className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal resize-none"
                />
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
                  SAVE RECORD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
