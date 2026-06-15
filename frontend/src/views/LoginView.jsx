import React, { useState } from "react";
import { Lock, User, AlertCircle, Key } from "lucide-react";

export default function LoginView({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      return setError("Please enter both username and password");
    }

    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      onLoginSuccess(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0A0E1A] p-4 text-[#EAF0FB] relative overflow-hidden font-sans">
      {/* Sleek background decoration circles */}
      <div className="absolute w-[300px] h-[300px] rounded-full bg-[#818CF8]/10 blur-[80px] top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute w-[350px] h-[350px] rounded-full bg-[#2DD4BF]/5 blur-[90px] bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2" />

      {/* Main glass card */}
      <div className="w-full max-w-md p-8 rounded-3xl border border-[#1F2A40] bg-[#121829]/65 backdrop-blur-md shadow-2xl relative z-10 space-y-6 hover:border-[#2DD4BF]/20 transition-colors duration-500">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="rounded-2xl p-3 bg-[#121829] border border-[#1F2A40] text-[#2DD4BF] shadow-lg shadow-[#2DD4BF]/5">
            <Key size={26} strokeWidth={2} className="animate-pulse" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight font-space text-[#EAF0FB] mt-2">
            APEX CRM GATEWAY
          </h1>
          <p className="text-xs text-[#7C8AA8] font-mono tracking-wider">
            ENTER CREDENTIALS TO ESTABLISH LINK
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-start gap-2 animate-shake">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span className="leading-normal">{error}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-[#7C8AA8] tracking-widest block font-bold">
              Operator Username
            </label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-3 text-[#7C8AA8]" />
              <input 
                type="text"
                required
                disabled={loading}
                placeholder="E.g. admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#0E1422]/60 border border-[#1F2A40] rounded-xl text-xs text-[#EAF0FB] placeholder-[#7C8AA8]/40 focus:outline-none focus:border-[#2DD4BF] focus:shadow-[0_0_12px_rgba(45,212,191,0.15)] disabled:opacity-50 transition-all font-mono"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-[#7C8AA8] tracking-widest block font-bold">
              Access Keycode
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-3 text-[#7C8AA8]" />
              <input 
                type="password"
                required
                disabled={loading}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#0E1422]/60 border border-[#1F2A40] rounded-xl text-xs text-[#EAF0FB] placeholder-[#7C8AA8]/40 focus:outline-none focus:border-[#2DD4BF] focus:shadow-[0_0_12px_rgba(45,212,191,0.15)] disabled:opacity-50 transition-all font-mono"
              />
            </div>
          </div>

          {/* Operator Guide Block */}
          <div className="text-[10px] font-mono text-[#7C8AA8]/80 leading-relaxed bg-[#0E1422]/50 p-3 rounded-xl border border-[#1F2A40] space-y-1.5">
            <div className="font-bold text-[#2DD4BF] uppercase tracking-wider border-b border-[#1F2A40]/40 pb-1">
              🔑 System Operators (Pass: username)
            </div>
            <div className="flex justify-between items-center text-[9px]">
              <span>👤 <strong className="text-brand-text">admin</strong></span>
              <span className="bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20 px-1.5 py-0.5 rounded text-[8px] font-bold">ADMIN ROLE</span>
            </div>
            <div className="flex justify-between items-center text-[9px]">
              <span>👤 <strong className="text-brand-text">agent</strong></span>
              <span className="bg-brand-orange/10 text-brand-orange border border-brand-orange/20 px-1.5 py-0.5 rounded text-[8px] font-bold">AGENT ROLE</span>
            </div>
            <div className="flex justify-between items-center text-[9px]">
              <span>👤 <strong className="text-brand-text">support</strong></span>
              <span className="bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20 px-1.5 py-0.5 rounded text-[8px] font-bold">SUPPORT ROLE</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-2.5 bg-[#2DD4BF] text-[#0A0E1A] font-bold text-xs rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest shadow-lg shadow-[#2DD4BF]/10"
          >
            {loading ? (
              <span className="flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0A0E1A] animate-ping" /> VERIFYING ACCESS...
              </span>
            ) : "Establish Secure Link"}
          </button>
        </form>

      </div>
    </div>
  );
}
