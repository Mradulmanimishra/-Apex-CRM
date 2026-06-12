import React, { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, X, Building, Globe, Users, User, AlertCircle } from "lucide-react";

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

export default function CompaniesView() {
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

  const [formName, setFormName] = useState("");
  const [formIndustry, setFormIndustry] = useState("");
  const [formSize, setFormSize] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formPrimaryContactId, setFormPrimaryContactId] = useState("");
  const [formAccountOwner, setFormAccountOwner] = useState("");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resCompanies, resContacts] = await Promise.all([
        fetch("/api/companies"),
        fetch("/api/contacts")
      ]);

      if (!resCompanies.ok || !resContacts.ok) throw new Error("Failed to load records");

      const dataCompanies = await resCompanies.json();
      const dataContacts = await resContacts.json();

      setCompanies(dataCompanies);
      setContacts(dataContacts);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCompany(null);
    setFormName("");
    setFormIndustry("");
    setFormSize("");
    setFormWebsite("");
    setFormPrimaryContactId("");
    setFormAccountOwner("");
    setFormNotes("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (comp) => {
    setEditingCompany(comp);
    setFormName(comp.company_name || "");
    setFormIndustry(comp.industry || "");
    setFormSize(comp.size ? comp.size.toString() : "");
    setFormWebsite(comp.website || "");
    setFormPrimaryContactId(comp.primary_contact_id ? comp.primary_contact_id.toString() : "");
    setFormAccountOwner(comp.account_owner || "");
    setFormNotes(comp.notes || "");
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this company?")) return;

    try {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete company");
      fetchData();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return alert("Company name is required");

    const payload = {
      company_name: formName,
      industry: formIndustry,
      size: formSize ? parseInt(formSize) : null,
      website: formWebsite,
      primary_contact_id: formPrimaryContactId ? parseInt(formPrimaryContactId) : null,
      account_owner: formAccountOwner,
      notes: formNotes
    };

    try {
      const url = editingCompany ? `/api/companies/${editingCompany.id}` : "/api/companies";
      const method = editingCompany ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save company");

      setIsFormOpen(false);
      fetchData();
    } catch (err) {
      alert("Save failed: " + err.message);
    }
  };

  const filteredCompanies = companies.filter(c => {
    const query = searchQuery.toLowerCase();
    return c.company_name.toLowerCase().includes(query) || 
      (c.industry && c.industry.toLowerCase().includes(query)) ||
      (c.account_owner && c.account_owner.toLowerCase().includes(query)) ||
      (c.primary_contact_name && c.primary_contact_name.toLowerCase().includes(query));
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-teal"></div>
        <p className="text-brand-textDim text-sm font-mono">Loading corporate records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-brand-red">
        <AlertCircle size={48} className="mb-2" />
        <p className="text-brand-text font-medium text-lg">Error loading company database</p>
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
          <h1 className="text-2xl font-semibold text-brand-text font-space">Corporate Accounts</h1>
          <p className="text-xs text-brand-textDim mt-0.5">Manage organizations, team sizes, and primary links</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-teal text-brand-bg font-semibold text-xs rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus size={16} strokeWidth={2.5} /> ADD COMPANY
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-4 p-5 rounded-2xl border border-brand-border bg-brand-surface">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-3 text-brand-textDim" />
          <input 
            type="text"
            placeholder="Search company name, industry, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-xs text-brand-text placeholder-brand-textDim focus:outline-none focus:border-brand-teal"
          />
        </div>
      </div>

      {/* Table grid */}
      <div className="rounded-2xl border border-brand-border bg-brand-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-brand-border text-brand-textDim" style={{ background: "rgba(14, 20, 34, 0.4)" }}>
                <th className="p-4 font-semibold">Company Name</th>
                <th className="p-4 font-semibold">Industry</th>
                <th className="p-4 font-semibold">Size</th>
                <th className="p-4 font-semibold">Website</th>
                <th className="p-4 font-semibold">Primary Contact</th>
                <th className="p-4 font-semibold">Account Owner</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40">
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map(c => (
                  <tr key={c.id} className="hover:bg-brand-surfaceAlt/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Building size={14} className="text-brand-indigo" />
                        <div>
                          <p className="font-semibold text-brand-text">{c.company_name}</p>
                          <p className="text-[9px] text-brand-textDim mt-0.5 max-w-[200px] truncate" title={c.notes}>{c.notes || "No notes logged"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-brand-text">{c.industry || <span className="text-brand-textDim italic">-</span>}</td>
                    <td className="p-4 text-brand-textDim font-mono">
                      {c.size ? (
                        <span className="flex items-center gap-1">
                          <Users size={12} className="text-brand-textDim" />
                          {c.size.toLocaleString()}
                        </span>
                      ) : <span className="text-brand-textDim/40 italic">-</span>}
                    </td>
                    <td className="p-4">
                      {c.website ? (
                        <a 
                          href={c.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-brand-teal hover:underline"
                        >
                          <Globe size={12} />
                          {c.website.replace("https://", "").replace("http://", "").split("/")[0]}
                        </a>
                      ) : <span className="text-brand-textDim/40 italic">-</span>}
                    </td>
                    <td className="p-4 text-brand-text">
                      {c.primary_contact_name ? (
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-brand-teal" />
                          {c.primary_contact_name}
                        </span>
                      ) : (
                        <span className="text-brand-textDim italic text-[11px]">Unlinked</span>
                      )}
                    </td>
                    <td className="p-4 text-brand-text">{c.account_owner || <span className="text-brand-textDim italic">-</span>}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEdit(c)}
                          className="p-1 hover:text-brand-teal text-brand-textDim transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)}
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
                  <td colSpan="7" className="p-8 text-center text-brand-textDim font-mono">
                    No organizations found
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
              {editingCompany ? "Modify Company Record" : "Register Corporate Account"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Company Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="E.g. Acme Corp"
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Industry</label>
                  <input 
                    type="text" 
                    value={formIndustry}
                    onChange={e => setFormIndustry(e.target.value)}
                    placeholder="E.g. Logistics, Biotech"
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Size (Employees)</label>
                  <input 
                    type="number" 
                    value={formSize}
                    onChange={e => setFormSize(e.target.value)}
                    placeholder="E.g. 150"
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Website</label>
                  <input 
                    type="url" 
                    value={formWebsite}
                    onChange={e => setFormWebsite(e.target.value)}
                    placeholder="https://acmecorp.com"
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Primary Contact Link</label>
                  <select 
                    value={formPrimaryContactId}
                    onChange={e => setFormPrimaryContactId(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text focus:outline-none focus:border-brand-teal"
                  >
                    <option value="">No Contact Selected</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-brand-textDim font-semibold">Account Owner</label>
                  <input 
                    type="text" 
                    value={formAccountOwner}
                    onChange={e => setFormAccountOwner(e.target.value)}
                    placeholder="E.g. Priya Nair"
                    className="w-full px-3 py-2 bg-brand-surfaceAlt border border-brand-border rounded-xl text-brand-text placeholder-brand-textDim/50 focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-brand-textDim font-semibold">Operational Notes</label>
                <textarea 
                  rows="3" 
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Billing terms, partnership status details..."
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
                  SAVE COMPANY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
