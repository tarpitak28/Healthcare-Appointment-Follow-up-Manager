import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [leaveDate, setLeaveDate] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [message, setMessage] = useState('');

  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await API.get('/admin/doctors');
      setDoctors(res.data.doctors || []);
    } catch (err) {
      console.error('Error fetching doctors', err);
    }
  };

  const handleMarkLeave = async (e) => {
    e.preventDefault();
    if (!selectedDocId || !leaveDate) return;
    try {
      const res = await API.post(`/admin/doctors/${selectedDocId}/leave`, {
        date: leaveDate,
        reason: 'Scheduled Leave',
      });
      setMessage(`Leave marked successfully! ${res.data.affectedAppointmentsCount} conflicting bookings were automatically cancelled.`);
      setLeaveDate('');
      fetchDoctors();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to mark leave');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await API.put('/auth/me', { name, email });
      setMessage('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setMessage('Failed to update profile');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard ({name || user?.name})</h1>
            <p className="text-sm text-slate-600">Manage doctors, profiles, and leave schedules.</p>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => setIsEditing(!isEditing)} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100">
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100">
              Logout
            </button>
          </div>
        </div>

        {message && <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-lg">{message}</div>}

        {isEditing && (
          <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Edit Profile Details</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" required />
              </div>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Save Changes</button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Mark Doctor Leave</h2>
            <form onSubmit={handleMarkLeave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Doctor</label>
                <select
                  className="w-full px-4 py-2 border rounded-lg outline-none"
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  required
                >
                  <option value="">Choose Doctor...</option>
                  {doctors.map((doc) => (
                    <option key={doc.doctorProfile?.id} value={doc.doctorProfile?.id}>
                      Dr. {doc.name} ({doc.doctorProfile?.specialisation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Leave Date</label>
                <input
                  type="date"
                  min={todayStr}
                  className="w-full px-4 py-2 border rounded-lg outline-none"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
              >
                Mark Leave & Cancel Conflicts
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Registered Doctors</h2>
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {doctors.length === 0 ? (
                <p className="text-sm text-slate-500">No doctors registered yet.</p>
              ) : (
                doctors.map((doc) => (
                  <div key={doc.id} className="p-3 border rounded-lg bg-slate-50">
                    <p className="font-semibold text-slate-800">Dr. {doc.name}</p>
                    <p className="text-xs text-slate-500">Specialisation: {doc.doctorProfile?.specialisation || 'General'}</p>
                    <p className="text-xs text-slate-500">Email: {doc.email}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
