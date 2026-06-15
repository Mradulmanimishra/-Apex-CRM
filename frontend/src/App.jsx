import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, Users, Building2, Kanban, CalendarRange, Ticket, Menu, X, LogOut,
  Search, Bell, Command, AlertCircle, AlertTriangle, Database, Trash2, Loader2, CheckCircle2, PackagePlus
} from "lucide-react";
import DashboardView from "./views/DashboardView";
import ContactsView from "./views/ContactsView";
import CompaniesView from "./views/CompaniesView";
import PipelineView from "./views/PipelineView";
import ActivitiesView from "./views/ActivitiesView";
import TicketsView from "./views/TicketsView";
import LoginView from "./views/LoginView";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "activities", label: "Activities", icon: CalendarRange },
  { id: "tickets", label: "Tickets", icon: Ticket },
];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("crm-auth-token") || null);
  const [role, setRole] = useState(localStorage.getItem("crm-auth-role") || null);
  const [username, setUsername] = useState(localStorage.getItem("crm-auth-username") || null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search and notification states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ contacts: [], companies: [], deals: [], tickets: [] });
  const [searchLoading, setSearchLoading] = useState(false);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState({ overdueActivities: [], todaysActivities: [], urgentTickets: [] });
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Demo data state
  const [demoStatus, setDemoStatus] = useState(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoMessage, setDemoMessage] = useState(null);
  const [showDemoConfirm, setShowDemoConfirm] = useState(null); // 'load' | 'clear' | null

  // Shared props
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [viewSearchQuery, setViewSearchQuery] = useState("");

  const handleNavigate = (tabId) => {
    setSelectedContactId(null);
    setViewSearchQuery("");
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    setIsNotificationsOpen(false);
  };

  const handleLoginSuccess = (data) => {
    localStorage.setItem("crm-auth-token", data.token);
    localStorage.setItem("crm-auth-role", data.role);
    localStorage.setItem("crm-auth-username", data.username);
    setToken(data.token);
    setRole(data.role);
    setUsername(data.username);
  };

  const handleLogout = () => {
    localStorage.removeItem("crm-auth-token");
    localStorage.removeItem("crm-auth-role");
    localStorage.removeItem("crm-auth-username");
    setToken(null);
    setRole(null);
    setUsername(null);
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        const count = data.overdueActivities.length + data.todaysActivities.length + data.urgentTickets.length;
        setUnreadNotificationsCount(count);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  const fetchDemoStatus = async () => {
    try {
      const res = await fetch("/api/demo/status");
      if (res.ok) {
        const data = await res.json();
        setDemoStatus(data);
      }
    } catch (err) {
      console.error("Failed to load demo status", err);
    }
  };

  const handleLoadDemoData = async () => {
    setDemoLoading(true);
    setDemoMessage(null);
    setShowDemoConfirm(null);
    try {
      const res = await fetch("/api/demo/load", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setDemoMessage({ type: "success", text: `Demo loaded! ${data.counts.contacts} contacts, ${data.counts.deals} deals, ${data.counts.activities} activities, ${data.counts.tickets} tickets.` });
        fetchDemoStatus();
        fetchNotifications();
        // Force re-render of active view by toggling tab
        const current = activeTab;
        setActiveTab("");
        setTimeout(() => setActiveTab(current), 50);
      } else {
        setDemoMessage({ type: "error", text: data.error || "Failed to load demo data" });
      }
    } catch (err) {
      setDemoMessage({ type: "error", text: "Network error loading demo data" });
    } finally {
      setDemoLoading(false);
      setTimeout(() => setDemoMessage(null), 5000);
    }
  };

  const handleClearDemoData = async () => {
    setDemoLoading(true);
    setDemoMessage(null);
    setShowDemoConfirm(null);
    try {
      const res = await fetch("/api/demo/clear", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setDemoMessage({ type: "success", text: "All data cleared. CRM is empty and ready for real data." });
        fetchDemoStatus();
        fetchNotifications();
        const current = activeTab;
        setActiveTab("");
        setTimeout(() => setActiveTab(current), 50);
      } else {
        setDemoMessage({ type: "error", text: data.error || "Failed to clear data" });
      }
    } catch (err) {
      setDemoMessage({ type: "error", text: "Network error clearing data" });
    } finally {
      setDemoLoading(false);
      setTimeout(() => setDemoMessage(null), 5000);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
      fetchDemoStatus();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ contacts: [], companies: [], deals: [], tickets: [] });
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleOpenContact = (contactId) => {
    setSelectedContactId(contactId);
    setActiveTab("contacts");
    setIsSearchOpen(false);
    setIsNotificationsOpen(false);
  };

  const handleOpenCompany = (companyName) => {
    setViewSearchQuery(companyName);
    setActiveTab("companies");
    setIsSearchOpen(false);
    setIsNotificationsOpen(false);
  };

  const handleOpenDeal = (dealName) => {
    setViewSearchQuery(dealName);
    setActiveTab("pipeline");
    setIsSearchOpen(false);
    setIsNotificationsOpen(false);
  };

  const handleOpenTicket = (issueType) => {
    setViewSearchQuery(issueType);
    setActiveTab("tickets");
    setIsSearchOpen(false);
    setIsNotificationsOpen(false);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView onNavigate={handleNavigate} />;
      case "contacts":
        return <ContactsView initialSelectedContactId={selectedContactId} />;
      case "companies":
        return <CompaniesView initialSearchQuery={viewSearchQuery} />;
      case "pipeline":
        return <PipelineView initialSearchQuery={viewSearchQuery} />;
      case "activities":
        return <ActivitiesView />;
      case "tickets":
        return <TicketsView initialSearchQuery={viewSearchQuery} />;
      default:
        return <DashboardView onNavigate={handleNavigate} />;
    }
  };

  const renderNotificationsDropdown = (isMobile = false) => {
    const totalCount = notifications.overdueActivities.length + notifications.todaysActivities.length + notifications.urgentTickets.length;
    
    return (
      <div 
        className={`absolute right-0 mt-2 w-80 rounded-2xl border border-brand-border bg-brand-surface p-4 shadow-2xl z-50 animate-scaleIn text-xs ${
          isMobile ? "fixed inset-x-4 top-[57px] w-auto mx-auto" : ""
        }`}
      >
        <div className="flex items-center justify-between pb-2.5 border-b border-brand-border">
          <h3 className="font-space font-bold tracking-tight text-brand-text">Active Alerts</h3>
          <span className="px-1.5 py-0.5 rounded-full bg-brand-surfaceAlt text-[9px] font-mono font-semibold text-brand-textDim">
            {totalCount} Alerts
          </span>
        </div>

        <div className="max-h-[300px] overflow-y-auto mt-3 space-y-3.5 divide-y divide-brand-border/40 pr-1">
          {totalCount === 0 ? (
            <p className="text-center py-6 text-brand-textDim italic text-[11px]">No active notifications</p>
          ) : (
            <>
              {/* Overdue Activities */}
              {notifications.overdueActivities.length > 0 && (
                <div className="space-y-1.5 pt-2 first:pt-0">
                  <h4 className="text-[10px] uppercase font-mono font-bold text-brand-red flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" /> Overdue Tasks
                  </h4>
                  {notifications.overdueActivities.map(a => (
                    <div 
                      key={a.id} 
                      onClick={() => handleOpenContact(a.contact_id)}
                      className="p-2 rounded-xl bg-brand-red/5 border border-brand-red/20 hover:border-brand-red/40 cursor-pointer transition-colors"
                    >
                      <p className="font-semibold text-brand-text line-clamp-1">{a.next_action}</p>
                      <p className="text-[10px] text-brand-textDim mt-0.5 flex justify-between">
                        <span>Partner: {a.contact_name || "Individual"}</span>
                        <span className="font-mono text-brand-red font-semibold">{a.next_action_date}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Today's Activities */}
              {notifications.todaysActivities.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <h4 className="text-[10px] uppercase font-mono font-bold text-brand-orange flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" /> Due Today
                  </h4>
                  {notifications.todaysActivities.map(a => (
                    <div 
                      key={a.id}
                      onClick={() => handleOpenContact(a.contact_id)}
                      className="p-2 rounded-xl bg-brand-orange/5 border border-brand-orange/20 hover:border-brand-orange/40 cursor-pointer transition-colors"
                    >
                      <p className="font-semibold text-brand-text line-clamp-1">{a.next_action}</p>
                      <p className="text-[10px] text-brand-textDim mt-0.5 flex justify-between">
                        <span>Partner: {a.contact_name || "Individual"}</span>
                        <span className="font-mono text-brand-orange font-semibold">Today</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Urgent/High Tickets */}
              {notifications.urgentTickets.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <h4 className="text-[10px] uppercase font-mono font-bold text-brand-indigo flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-indigo animate-pulse" /> Support Escalations
                  </h4>
                  {notifications.urgentTickets.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => handleOpenTicket(t.issue_type)}
                      className="p-2 rounded-xl bg-brand-indigo/5 border border-brand-indigo/20 hover:border-brand-indigo/40 cursor-pointer transition-colors"
                    >
                      <p className="font-semibold text-brand-text line-clamp-1">{t.issue_type}: {t.description}</p>
                      <p className="text-[10px] text-brand-textDim mt-0.5 flex justify-between">
                        <span>Contact: {t.contact_name || "Individual"}</span>
                        <span className="font-mono text-brand-red uppercase font-semibold">{t.priority}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderSearchModal = () => {
    if (!isSearchOpen) return null;

    return (
      <div 
        className="fixed inset-0 z-50 flex items-start justify-center bg-brand-bg/85 backdrop-blur-sm p-4 pt-[10vh]"
        onClick={() => setIsSearchOpen(false)}
      >
        <div 
          className="w-full max-w-2xl rounded-3xl border border-brand-border bg-[#121829]/95 p-6 shadow-2xl relative space-y-4 animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-brand-border">
            <Search size={18} className="text-brand-teal" />
            <input
              type="text"
              autoFocus
              placeholder="Search across contacts, companies, deals, tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-brand-text placeholder-brand-textDim/40 focus:outline-none"
            />
            <span className="text-[10px] font-mono text-brand-textDim border border-brand-border px-2 py-0.5 rounded-lg">
              ESC
            </span>
          </div>

          {/* Search Loading or Results */}
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            {searchLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-brand-textDim font-mono">
                <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-brand-teal"></span>
                <span>Searching relational databases...</span>
              </div>
            ) : !searchQuery.trim() ? (
              <div className="py-12 text-center text-brand-textDim/50 space-y-2">
                <Command size={32} className="mx-auto text-brand-textDim/20" />
                <p className="text-xs font-mono">Type query or keywords to execute global scan</p>
                <p className="text-[10px] text-brand-textDim/40">Try searching: "Aarav", "Nimbus", "Urgent", or "Sales"</p>
              </div>
            ) : Object.values(searchResults).every(arr => arr.length === 0) ? (
              <div className="py-12 text-center text-brand-textDim/50 font-mono text-xs">
                ❌ No matching records found for "{searchQuery}"
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                
                {/* Contacts Group */}
                {searchResults.contacts.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-brand-teal font-mono">Contacts</h3>
                    <div className="divide-y divide-brand-border/30 border border-brand-border/50 rounded-xl overflow-hidden bg-brand-surfaceAlt/30">
                      {searchResults.contacts.map(c => (
                        <div
                          key={c.id}
                          onClick={() => handleOpenContact(c.id)}
                          className="p-3 hover:bg-brand-surfaceAlt/60 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-brand-text">{c.name}</p>
                            <p className="text-[10px] text-brand-textDim mt-0.5">{c.role_title} • {c.company_name || "Individual"}</p>
                          </div>
                          <span className="text-[10px] text-brand-textDim font-mono">{c.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Companies Group */}
                {searchResults.companies.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-brand-indigo font-mono">Companies</h3>
                    <div className="divide-y divide-brand-border/30 border border-brand-border/50 rounded-xl overflow-hidden bg-brand-surfaceAlt/30">
                      {searchResults.companies.map(c => (
                        <div
                          key={c.id}
                          onClick={() => handleOpenCompany(c.company_name)}
                          className="p-3 hover:bg-brand-surfaceAlt/60 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-brand-text">{c.company_name}</p>
                            <p className="text-[10px] text-brand-textDim mt-0.5">Industry: {c.industry || "Not set"}</p>
                          </div>
                          <span className="text-[10px] text-brand-textDim">Owner: {c.account_owner || "Unassigned"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deals Group */}
                {searchResults.deals.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-brand-orange font-mono">Deals</h3>
                    <div className="divide-y divide-brand-border/30 border border-brand-border/50 rounded-xl overflow-hidden bg-brand-surfaceAlt/30">
                      {searchResults.deals.map(d => (
                        <div
                          key={d.id}
                          onClick={() => handleOpenDeal(d.deal_name)}
                          className="p-3 hover:bg-brand-surfaceAlt/60 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-brand-text">{d.deal_name}</p>
                            <p className="text-[10px] text-brand-textDim mt-0.5">Stage: {d.stage} • Company: {d.company_name || "Individual"}</p>
                          </div>
                          <span className="font-bold text-brand-teal font-mono">${d.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tickets Group */}
                {searchResults.tickets.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-brand-indigo font-mono">Support Tickets</h3>
                    <div className="divide-y divide-brand-border/30 border border-brand-border/50 rounded-xl overflow-hidden bg-brand-surfaceAlt/30">
                      {searchResults.tickets.map(t => (
                        <div
                          key={t.id}
                          onClick={() => handleOpenTicket(t.issue_type)}
                          className="p-3 hover:bg-brand-surfaceAlt/60 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-brand-text">{t.issue_type}</p>
                            <p className="text-[10px] text-brand-textDim mt-0.5 line-clamp-1">{t.description}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-bold text-brand-red font-mono uppercase bg-brand-red/10 border border-brand-red/20 px-1.5 py-0.5 rounded">{t.priority}</span>
                            <p className="text-[9px] text-brand-textDim mt-1 font-mono">{t.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Enforce authentication view
  if (!token) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0A0E1A] text-[#EAF0FB] font-sans antialiased">
      {/* Mobile Top Navbar Bar */}
      <div className="md:hidden flex items-center justify-between px-5 py-4 border-b border-brand-border bg-brand-surface/90 backdrop-blur-md sticky top-0 z-40">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2DD4BF] pulse-dot" />
            <span className="font-space font-bold tracking-tight text-sm uppercase">Apex CRM</span>
          </div>
          {role && (
            <span className={`text-[8px] font-mono font-bold uppercase tracking-wide mt-0.5 align-middle self-start px-1.5 py-0.5 rounded border ${
              role.toLowerCase() === "admin" ? "bg-brand-teal/10 text-brand-teal border-brand-teal/20" :
              role.toLowerCase() === "agent" ? "bg-brand-orange/10 text-brand-orange border-brand-orange/20" :
              "bg-[#818CF8]/15 text-[#818CF8] border-[#818CF8]/25"
            }`}>
              {role}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Mobile Search Icon */}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="text-brand-text hover:text-brand-teal transition-colors p-1"
            title="Search"
          >
            <Search size={18} />
          </button>

          {/* Mobile Notifications Icon */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="text-brand-text hover:text-brand-teal transition-colors p-1 relative"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-red text-[7px] font-bold text-[#0A0E1A]">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
            {isNotificationsOpen && renderNotificationsDropdown(true)}
          </div>

          <button 
            onClick={handleLogout}
            className="text-brand-red/80 hover:text-brand-red p-1"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-[#EAF0FB] hover:text-[#2DD4BF] transition-colors p-1"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[57px] bg-[#121829]/95 backdrop-blur-lg border-b border-[#1F2A40] z-30 flex flex-col p-4 space-y-2 animate-fadeIn shadow-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive 
                    ? "bg-[#2DD4BF] text-[#0A0E1A]" 
                    : "text-[#7C8AA8] hover:text-[#EAF0FB] hover:bg-[#121829]/50"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Desktop Navigation Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#121829] border-r border-[#1F2A40] p-6 space-y-6 shrink-0">
        {/* Logo and Brand Title */}
        <div className="flex flex-col gap-2 px-2 pb-2 border-b border-[#1F2A40]">
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 rounded-full bg-[#2DD4BF] pulse-dot" />
            <div>
              <h1 className="font-space font-bold text-md tracking-tight uppercase">Apex CRM</h1>
              <p className="text-[9px] text-[#7C8AA8] font-mono tracking-widest mt-0.5">LOCAL HOST COMMAND</p>
            </div>
          </div>
          {role && (
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                role.toLowerCase() === "admin" ? "bg-brand-teal/10 text-brand-teal border-brand-teal/20" :
                role.toLowerCase() === "agent" ? "bg-brand-orange/10 text-brand-orange border-brand-orange/20" :
                "bg-[#818CF8]/15 text-[#818CF8] border-[#818CF8]/25"
              }`}>
                {role} Workspace
              </span>
            </div>
          )}
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                  isActive 
                    ? "bg-[#2DD4BF] text-[#0A0E1A] shadow-lg shadow-[#2DD4BF]/10 font-bold" 
                    : "text-[#7C8AA8] hover:text-[#EAF0FB] hover:bg-[#1F2A40]/40"
                }`}
              >
                <Icon size={16} className={`transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-[#0A0E1A]" : "text-[#7C8AA8] group-hover:text-[#2DD4BF]"
                }`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Demo Data Controls */}
        <div className="pt-3 border-t border-[#1F2A40] space-y-2">
          <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-brand-textDim px-1 flex items-center gap-1.5">
            <Database size={10} /> Demo Data
          </p>

          {demoStatus && (
            <div className="text-[9px] font-mono text-brand-textDim bg-brand-surfaceAlt/40 rounded-lg px-3 py-2 border border-brand-border/50">
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                <span>Companies</span><span className="text-right text-brand-text">{demoStatus.counts.companies}</span>
                <span>Contacts</span><span className="text-right text-brand-text">{demoStatus.counts.contacts}</span>
                <span>Deals</span><span className="text-right text-brand-text">{demoStatus.counts.deals}</span>
                <span>Activities</span><span className="text-right text-brand-text">{demoStatus.counts.activities}</span>
                <span>Tickets</span><span className="text-right text-brand-text">{demoStatus.counts.tickets}</span>
              </div>
            </div>
          )}

          {/* Demo Message Toast */}
          {demoMessage && (
            <div className={`text-[10px] font-mono px-3 py-2 rounded-lg border flex items-start gap-2 animate-scaleIn ${
              demoMessage.type === "success" 
                ? "bg-brand-teal/10 border-brand-teal/25 text-brand-teal" 
                : "bg-brand-red/10 border-brand-red/25 text-brand-red"
            }`}>
              {demoMessage.type === "success" ? <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> : <AlertCircle size={12} className="mt-0.5 shrink-0" />}
              <span>{demoMessage.text}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setShowDemoConfirm("load")}
              disabled={demoLoading}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-bold font-mono uppercase tracking-wide bg-brand-teal/10 text-brand-teal border border-brand-teal/25 hover:bg-brand-teal/20 hover:border-brand-teal/40 transition-all disabled:opacity-50"
            >
              {demoLoading ? <Loader2 size={12} className="animate-spin" /> : <PackagePlus size={12} />}
              Load Demo
            </button>
            <button
              onClick={() => setShowDemoConfirm("clear")}
              disabled={demoLoading || !demoStatus?.hasData}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-bold font-mono uppercase tracking-wide bg-brand-red/10 text-brand-red/80 border border-brand-red/20 hover:bg-brand-red/15 hover:border-brand-red/35 hover:text-brand-red transition-all disabled:opacity-30"
            >
              <Trash2 size={12} />
              Clear All
            </button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showDemoConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/85 backdrop-blur-sm" onClick={() => setShowDemoConfirm(null)}>
            <div className="w-full max-w-sm mx-4 rounded-2xl border border-brand-border bg-brand-surface p-6 shadow-2xl animate-scaleIn space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${showDemoConfirm === "load" ? "bg-brand-teal/15" : "bg-brand-red/15"}`}>
                  {showDemoConfirm === "load" 
                    ? <PackagePlus size={20} className="text-brand-teal" />
                    : <Trash2 size={20} className="text-brand-red" />
                  }
                </div>
                <div>
                  <h3 className="font-space font-bold text-brand-text text-sm">
                    {showDemoConfirm === "load" ? "Load Demo Data" : "Clear All Data"}
                  </h3>
                  <p className="text-[10px] text-brand-textDim font-mono mt-0.5">
                    {showDemoConfirm === "load" 
                      ? "This will replace all existing data with realistic demo records." 
                      : "This will permanently delete all business data (contacts, deals, tickets, etc.)."}
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-brand-textDim bg-brand-surfaceAlt/60 rounded-xl p-3 border border-brand-border/50">
                {showDemoConfirm === "load" 
                  ? "8 companies • 15 contacts • 10 deals • 18 activities • 8 tickets will be created with realistic data."
                  : "User accounts (admin, agent, support) will be preserved. Only business data will be removed."}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDemoConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-brand-textDim border border-brand-border hover:bg-brand-surfaceAlt transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={showDemoConfirm === "load" ? handleLoadDemoData : handleClearDemoData}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    showDemoConfirm === "load"
                      ? "bg-brand-teal text-[#0A0E1A] hover:brightness-110 shadow-lg shadow-brand-teal/20"
                      : "bg-brand-red text-white hover:brightness-110 shadow-lg shadow-brand-red/20"
                  }`}
                >
                  {showDemoConfirm === "load" ? "Load Demo Data" : "Clear All Data"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sign Out Button */}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-brand-red/80 hover:text-brand-red hover:bg-brand-red/10 border border-brand-red/20 hover:border-brand-red/35 transition-all text-left"
        >
          <LogOut size={16} className="text-brand-red" /> 
          Sign Out Operator
        </button>

        {/* Bottom Metadata Info */}
        <div className="pt-4 border-t border-[#1F2A40] text-[10px] text-[#7C8AA8] font-mono space-y-1">
          <p>DB: SQLite crm.db</p>
          <p>STATUS: OPERATIONAL</p>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 overflow-y-auto px-5 py-6 md:p-10 max-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Desktop Top Header Bar */}
          <div className="hidden md:flex items-center justify-between pb-4 border-b border-brand-border">
            {/* Search Trigger Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-brand-border bg-brand-surfaceAlt/40 hover:bg-brand-surfaceAlt/80 rounded-xl text-xs text-brand-textDim transition-all min-w-[280px] text-left"
            >
              <Search size={14} className="text-brand-teal" />
              <span>Search directory...</span>
              <span className="ml-auto font-mono text-[10px] bg-brand-border px-1.5 py-0.5 rounded text-brand-text flex items-center gap-0.5">
                <Command size={10} />K
              </span>
            </button>

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 border border-brand-border hover:border-brand-teal/40 rounded-xl bg-brand-surfaceAlt/60 hover:bg-brand-surfaceAlt/95 text-brand-text transition-colors"
                title="Notifications"
              >
                <Bell size={16} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-red text-[8px] font-bold text-[#0A0E1A] pulse-dot">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {isNotificationsOpen && renderNotificationsDropdown()}
            </div>
          </div>

          {renderActiveView()}
        </div>
      </main>

      {/* Global Modals */}
      {renderSearchModal()}
    </div>
  );
}
