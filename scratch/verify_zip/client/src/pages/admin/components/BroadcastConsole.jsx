import React, { useState } from 'react';
import { Send, Megaphone, ShieldAlert } from 'lucide-react';
import API from '../../../api/axios';
import Button from '../../../components/ui/Button';

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
    <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] space-y-6 shadow-xs max-w-3xl mx-auto">
      <div className="flex items-center space-x-3 pb-3 border-b border-[#E5E7EB]">
        <div className="w-10 h-10 bg-[#EAF7FA] text-[#3FA3C3] border border-[#3FA3C3]/30 rounded-xl flex items-center justify-center font-bold">
          <Megaphone className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#202124]">Send CareConnect System Announcement</h2>
          <p className="text-xs text-[#6F7378] font-medium">
            Dispatch individual, privacy-preserving transactional emails to target user cohorts.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-[#EAF7FA] border border-[#3FA3C3]/30 text-[#237C9A] rounded-xl text-xs flex justify-between items-center font-semibold">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')} className="text-[#3FA3C3] font-bold">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleOpenConfirm} className="space-y-4">
        {/* Audience Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#6F7378] mb-2">
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
                    ? 'bg-[#EAF7FA] border-[#3FA3C3] text-[#237C9A] font-bold shadow-xs'
                    : 'bg-[#F7F9FA] border-[#E5E7EB] text-[#6F7378] hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="audience"
                    value={cohort.id}
                    checked={audience === cohort.id}
                    onChange={(e) => setAudience(e.target.value)}
                    className="accent-[#3FA3C3]"
                  />
                  <span className="text-xs font-bold">{cohort.label}</span>
                </div>
                <span className="text-[10px] text-[#6F7378] font-normal mt-1">{cohort.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Subject Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#6F7378] mb-1">
            Announcement Subject Header
          </label>
          <input
            type="text"
            required
            placeholder="e.g. CareConnect Maintenance Scheduled for 11 PM"
            className="w-full px-4 py-2.5 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-[#202124] text-xs font-semibold outline-none focus:border-[#3FA3C3]"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Message Textarea */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#6F7378] mb-1">
            Announcement Message Body
          </label>
          <textarea
            required
            rows={5}
            placeholder="Type your system announcement message here. Each recipient receives a separate personalized HTML email card..."
            className="w-full px-4 py-3 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-[#202124] text-xs font-medium outline-none focus:border-[#3FA3C3] leading-relaxed"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          <span>{loading ? 'Queueing Broadcast...' : 'Preview & Send Broadcast Announcement'}</span>
        </Button>
      </form>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-[#202124]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-[#E5E7EB] space-y-4 shadow-xl">
            <div className="flex items-center space-x-3 text-[#3FA3C3]">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-[#202124]">Confirm Announcement Dispatch</h3>
            </div>
            <p className="text-xs text-[#6F7378] leading-relaxed">
              Are you sure you want to queue this broadcast email for audience cohort <strong>{audience}</strong>? Each user will receive an individual email to preserve privacy.
            </p>
            <div className="p-3 bg-[#F7F9FA] rounded-xl border border-[#E5E7EB] text-xs text-[#202124]">
              <p><strong>Subject:</strong> {subject}</p>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSendBroadcast}>Confirm & Dispatch</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
