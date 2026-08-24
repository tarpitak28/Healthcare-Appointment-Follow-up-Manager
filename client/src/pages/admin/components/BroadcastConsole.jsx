import React, { useState } from 'react';
import { Send, Megaphone, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';
import API from '../../../api/axios';

export default function BroadcastConsole() {
  const [audience, setAudience] = useState('ALL_USERS');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setFeedback('⚠️ Subject and message body are required.');
      return;
    }
    setShowConfirm(true);
  };

  const handleSendBroadcast = async () => {
    setShowConfirm(false);
    setLoading(true);
    setFeedback('');

    try {
      const res = await API.post('/admin/broadcasts', {
        subject: subject.trim(),
        message: message.trim(),
        audience,
      });

      setFeedback(`✅ Broadcast campaign queued! ${res.data.recipientCount} target users will receive private HTML emails.`);
      setSubject('');
      setMessage('');
    } catch (err) {
      setFeedback(err.response?.data?.message || 'Failed to dispatch broadcast campaign.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-xl max-w-3xl mx-auto">
      <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
        <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl flex items-center justify-center font-bold">
          <Megaphone className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-white">Send HealthPulse System Announcement</h2>
          <p className="text-xs text-slate-400 font-medium">
            Dispatch individual, privacy-preserving transactional emails to target user cohorts.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-indigo-950/80 border border-indigo-500/30 text-indigo-200 rounded-xl text-xs flex justify-between items-center font-medium">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')} className="text-indigo-400 font-bold hover:text-white">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleOpenConfirm} className="space-y-4">
        {/* Audience Radio Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Target Audience Cohort
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: 'ALL_USERS', label: 'All Users', desc: 'Patients + Doctors + Admins' },
              { id: 'PATIENTS', label: 'Patients', desc: 'Registered Patient Accounts' },
              { id: 'DOCTORS', label: 'Doctors', desc: 'Active Clinical Practitioners' },
              { id: 'ADMINS', label: 'Admins', desc: 'Hospital Command Staff' },
            ].map((cohort) => (
              <label
                key={cohort.id}
                className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  audience === cohort.id
                    ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="audience"
                    value={cohort.id}
                    checked={audience === cohort.id}
                    onChange={(e) => setAudience(e.target.value)}
                    className="accent-indigo-500"
                  />
                  <span className="text-xs">{cohort.label}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal mt-1">{cohort.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Subject Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Announcement Subject Header
          </label>
          <input
            type="text"
            required
            placeholder="e.g. HealthPulse Maintenance Scheduled for 11 PM"
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-semibold outline-none focus:border-indigo-500"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Message Textarea */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Announcement Message Body
          </label>
          <textarea
            required
            rows={5}
            placeholder="Type your system announcement message here. Each recipient receives a separate personalized HTML email card..."
            className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-medium outline-none focus:border-indigo-500 leading-relaxed"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-lg transition text-xs flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{loading ? 'Queueing Broadcast...' : 'Preview & Send Broadcast Announcement'}</span>
        </button>
      </form>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-indigo-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-extrabold text-white">Confirm Announcement Dispatch</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to queue this broadcast email for audience cohort <strong>{audience}</strong>? Each user will receive an individual email to preserve privacy.
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <p><strong>Subject:</strong> {subject}</p>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendBroadcast}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition"
              >
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
