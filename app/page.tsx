// app/page.tsx
// Main home page with login button

import Link from "next/link";
import {
  LogIn,
  Shield,
  Users,
  Trophy,
  Calendar,
  BarChart3,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800">
      {/* Header */}

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-6xl font-black text-white uppercase mb-6">
            Hockey Management
            <br />
            <span className="text-yellow-400">Made Simple</span>
          </h2>
          <p className="text-xl text-slate-300 font-bold max-w-2xl mx-auto mb-8">
            Complete management system for hockey associations, clubs, players,
            and staff. Streamline your operations with powerful tools.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-3 px-8 py-4 bg-yellow-400 text-[#06054e] rounded-2xl font-black uppercase text-lg hover:bg-yellow-300 transition-all shadow-2xl active:scale-95"
          >
            <Shield size={24} />
            Access Admin Portal
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-20">
          {/* Feature 1 */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-[2rem] p-8 hover:bg-white/15 transition-all">
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mb-4">
              <Users size={32} className="text-[#06054e]" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase mb-3">
              Player Management
            </h3>
            <p className="text-slate-300 font-bold">
              Complete player profiles, registration, nominations, and transfer
              history tracking.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-[2rem] p-8 hover:bg-white/15 transition-all">
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mb-4">
              <Trophy size={32} className="text-[#06054e]" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase mb-3">
              Team Selection
            </h3>
            <p className="text-slate-300 font-bold">
              Selection meetings, voting, representative teams, and roster
              management.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-[2rem] p-8 hover:bg-white/15 transition-all">
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mb-4">
              <Calendar size={32} className="text-[#06054e]" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase mb-3">
              Registration
            </h3>
            <p className="text-slate-300 font-bold">
              Online registration, payment tracking, approval workflows, and
              season management.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-[2rem] p-8 hover:bg-white/15 transition-all">
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mb-4">
              <Shield size={32} className="text-[#06054e]" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase mb-3">
              Role-Based Access
            </h3>
            <p className="text-slate-300 font-bold">
              Secure permissions for admins, coaches, managers, and volunteers
              at all levels.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-[2rem] p-8 hover:bg-white/15 transition-all">
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mb-4">
              <BarChart3 size={32} className="text-[#06054e]" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase mb-3">
              Reports & Analytics
            </h3>
            <p className="text-slate-300 font-bold">
              Comprehensive reporting, statistics, financial tracking, and data
              export.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-[2rem] p-8 hover:bg-white/15 transition-all">
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mb-4">
              <Users size={32} className="text-[#06054e]" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase mb-3">
              Multi-Level Hierarchy
            </h3>
            <p className="text-slate-300 font-bold">
              Manage national, state, regional associations and clubs in one
              unified system.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-[2rem] p-12">
            <h3 className="text-3xl font-black text-white uppercase mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-lg text-slate-300 font-bold mb-8 max-w-2xl mx-auto">
              Access the admin portal to manage your hockey organization. Secure
              login with role-based permissions.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-3 px-8 py-4 bg-yellow-400 text-[#06054e] rounded-2xl font-black uppercase text-lg hover:bg-yellow-300 transition-all shadow-2xl active:scale-95"
            >
              <LogIn size={24} />
              Login to Admin Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <p className="text-slate-400 font-bold">
              © {new Date().getFullYear()} Sports Soutions. All rights reserved.
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Secure • Reliable • Professional
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
