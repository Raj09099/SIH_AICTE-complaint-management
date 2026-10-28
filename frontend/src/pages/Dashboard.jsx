import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Building2,
  GitCompare,
  Network,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { API_BASE_URL } from '../services/api';

export function Dashboard() {
  const [backendHealth, setBackendHealth] = useState(null);

  useEffect(() => {
    // Check backend health endpoint
    fetch('http://127.0.0.1:8000/api/health')
      .then((res) => res.json())
      .then((data) => setBackendHealth(data))
      .catch(() => setBackendHealth({ status: 'offline' }));
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 glass-panel rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            AICTE Cross-Bureau Intelligence Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitoring, case overlap resolution, and multi-institution pattern detection.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center space-x-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                backendHealth?.status === 'ok' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            ></span>
            <span className="text-slate-300">
              Backend Status: {backendHealth?.status === 'ok' ? 'Online' : 'Checking /api/health'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Complaints"
          value="—"
          subtitle="Awaiting Phase 2 ingestion"
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Monitored Institutions"
          value="—"
          subtitle="Directory schema ready"
          icon={Building2}
          color="emerald"
        />
        <StatCard
          title="Potential Case Overlaps"
          value="—"
          subtitle="Feature 1 Engine standby"
          icon={GitCompare}
          color="amber"
        />
        <StatCard
          title="Systemic Patterns Detected"
          value="—"
          subtitle="Feature 2 Clustering standby"
          icon={Network}
          color="purple"
        />
      </div>

      {/* Feature Cards Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-3 text-amber-400">
            <GitCompare className="w-6 h-6" />
            <h2 className="text-lg font-semibold text-white">Feature 1: Case Overlap</h2>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Identifies duplicate or cross-bureau related complaints using text similarity, institution matching, and NLP heuristics.
          </p>
          <div className="pt-2">
            <Link
              to="/case-overlap"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300"
            >
              <span>Explore Overlap Module</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-3 text-purple-400">
            <Network className="w-6 h-6" />
            <h2 className="text-lg font-semibold text-white">Feature 2: Problem Patterns</h2>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Detects common issues affecting multiple colleges across states (e.g. fee irregularities, faculty non-payment).
          </p>
          <div className="pt-2">
            <Link
              to="/problem-patterns"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300"
            >
              <span>Explore Pattern Detector</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-3 text-blue-400">
            <FileCheck2 className="w-6 h-6" />
            <h2 className="text-lg font-semibold text-white">Feature 3: Evidence Checker</h2>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Extracts text from resolution affidavits (PyMuPDF) and calculates relevance scores to assist official reviews.
          </p>
          <div className="pt-2">
            <Link
              to="/evidence-checker"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              <span>Explore Evidence Checker</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
