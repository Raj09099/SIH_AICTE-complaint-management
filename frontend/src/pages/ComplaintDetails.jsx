import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, Building, User, Clock, FileCheck } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';

export function ComplaintDetails() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Link
          to="/complaints"
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Complaint Details: #{id || 'CMP-EXAMPLE'}
          </h1>
          <p className="text-xs text-slate-400">View case metadata, evidence history, and resolution timeline</p>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-white">Case Viewer Ready</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Detailed case timeline, officer assignment, and evidence viewer will activate once complaint records are loaded via <code>/api/v1/complaints/{'{id}'}</code>.
        </p>
      </div>
    </div>
  );
}

export default ComplaintDetails;
