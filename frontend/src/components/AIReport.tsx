import React, { useEffect, useState } from 'react';
import { RoomConfig, SimulationResult, SimulationConfig } from '../types';
import { generateStaticReport } from '../services/reportService';
import { FileText, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIReportProps {
  room: RoomConfig;
  config: SimulationConfig;
  results: SimulationResult;
}

const AIReport: React.FC<AIReportProps> = ({ room, config, results }) => {
  const [report, setReport] = useState<string>('');

  useEffect(() => {
    // Generate report instantly on mount or result change
    const text = generateStaticReport(room, config, results);
    setReport(text);
  }, [results, room, config]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden flex flex-col h-full animate-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
            <FileText className="text-emerald-600" size={20} />
            Performance Report
          </h3>
          <p className="text-slate-500 text-sm mt-1">Generated based on physics simulation data</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Download size={18} />
          Print / PDF
        </button>
      </div>

      <div className="p-8 flex-1 overflow-auto bg-slate-50/50">
        <div className="max-w-4xl mx-auto bg-white p-10 rounded-xl shadow-sm border border-slate-100 print:shadow-none print:border-none">
            <div className="prose prose-slate prose-emerald max-w-none prose-headings:font-bold prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AIReport;