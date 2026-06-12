import React, { useState } from "react";
import { 
  LayoutDashboard, Users, Building2, Kanban, CalendarRange, Ticket, Menu, X 
} from "lucide-react";
import DashboardView from "./views/DashboardView";
import ContactsView from "./views/ContactsView";
import CompaniesView from "./views/CompaniesView";
import PipelineView from "./views/PipelineView";
import ActivitiesView from "./views/ActivitiesView";
import TicketsView from "./views/TicketsView";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "activities", label: "Activities", icon: CalendarRange },
  { id: "tickets", label: "Tickets", icon: Ticket },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView onNavigate={handleNavigate} />;
      case "contacts":
        return <ContactsView />;
      case "companies":
        return <CompaniesView />;
      case "pipeline":
        return <PipelineView />;
      case "activities":
        return <ActivitiesView />;
      case "tickets":
        return <TicketsView />;
      default:
        return <DashboardView onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0A0E1A] text-[#EAF0FB] font-sans antialiased">
      {/* Mobile Top Navbar Bar */}
      <div className="md:hidden flex items-center justify-between px-5 py-4 border-b border-[#1F2A40] bg-[#121829]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#2DD4BF] pulse-dot" />
          <span className="font-space font-bold tracking-tight text-sm uppercase">Quantum CRM</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-[#EAF0FB] hover:text-[#2DD4BF] transition-colors p-1"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
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
      <aside className="hidden md:flex flex-col w-64 bg-[#121829] border-r border-[#1F2A40] p-6 space-y-8 shrink-0">
        {/* Logo and Brand Title */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-3.5 h-3.5 rounded-full bg-[#2DD4BF] pulse-dot" />
          <div>
            <h1 className="font-space font-bold text-md tracking-tight uppercase">Quantum CRM</h1>
            <p className="text-[9px] text-[#7C8AA8] font-mono tracking-widest mt-0.5">LOCAL HOST COMMAND</p>
          </div>
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

        {/* Bottom Metadata Info */}
        <div className="pt-4 border-t border-[#1F2A40] text-[10px] text-[#7C8AA8] font-mono space-y-1">
          <p>DB: SQLite crm.db</p>
          <p>STATUS: OPERATIONAL</p>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 overflow-y-auto px-5 py-6 md:p-10 max-h-screen">
        <div className="max-w-6xl mx-auto">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}
