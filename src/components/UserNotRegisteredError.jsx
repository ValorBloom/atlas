import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const UserNotRegisteredError = () => {
  return (
    <div className="fixed inset-0 bg-[#0a0e1a] flex flex-col items-center justify-center px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-600/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-red-500/6 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-xs gap-6">

        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-9 h-9 text-red-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Access Restricted</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            You're not registered for this application. Contact your instructor to request access.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-left">
          <p className="text-xs text-slate-400">Make sure you are:</p>
          {['Logged in with the correct email', 'Registered by your instructor', 'Using the correct unit link'].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
              <p className="text-xs text-slate-500">{item}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => base44.auth.logout('/')}
          className="w-full h-12 rounded-2xl border border-white/10 text-slate-300 text-sm font-medium active:scale-[0.98] transition-all"
        >
          Sign out
        </button>

      </div>
    </div>
  );
};

export default UserNotRegisteredError;