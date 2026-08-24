import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [activeAppt, setActiveAppt] = useState(null);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [message, setMessage] = useState('');

  // Profile edit states
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await API.get('/doctor/appointments');
      setAppointments(res.data.appointments || []);
    } catch (err) {
      console.error('Error fetching doctor appointments', err);
    }
  };

  const handlePostVisitSubmit = async (e) => {
    e.preventDefault();
    if (!activeAppt) return;
    try {
      await API.post(`/doctor/appointments/${activeAppt.id}/post-visit`, {
        clinicalNotes,
      });
      setMessage('Post-visit notes submitted and AI summary generated successfully!');
      setActiveAppt(null);
      setClinicalNotes('');
      fetchAppointments();
    } catch (err) {
      setMessage('Failed to submit post-visit notes');
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
            <h1 className="text-2xl font-bold text-slate-800">Dr. {user?.name} (Portal)</h1>
            <p className="text-sm text-slate-600">Review patient symptoms and submit post-visit summaries.</p>
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
          <div className="bg-white p-6 rounded-xl shadow-sm mb-6 max-w-md">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Edit Profile Details</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
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

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Upcoming Patient Appointments</h2>
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <p className="text-sm text-slate-500">No appointments scheduled.</p>
            ) : (
              appointments.map((app) => (
                <div key={app.id} className="p-4 border rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-800">Patient: {app.patient?.name} ({app.patient?.email})</p>
                    <p className="text-sm text-slate-600">Date: {new Date(app.appointmentDate).toLocaleDateString()} | Time: {app.startTime}</p>
                    <p className="text-sm text-slate-600">Symptoms: {app.symptoms}</p>
                    {app.urgencyLevel && (
                      <div className="text-xs bg-amber-50 text-amber-700 p-2 rounded mt-2">
                        <strong>AI Urgency:</strong> {app.urgencyLevel} | <strong>Chief Complaint:</strong> {app.chiefComplaint}
                        <div className="mt-1 font-semibold">Suggested Questions:</div>
                        <ul className="list-disc list-inside">
                          {app.suggestedQuestions?.map((q, idx) => (
                            <li key={idx}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div>
                    {app.status === 'BOOKED' ? (
                      <button
                        onClick={() => setActiveAppt(app)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                      >
                        Complete Visit
                      </button>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">Completed</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {activeAppt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white max-w-lg w-full p-6 rounded-xl shadow-lg space-y-4">
              <h3 className="text-lg font-bold text-slate-800">Submit Post-Visit Notes for {activeAppt.patient?.name}</h3>
              <form onSubmit={handlePostVisitSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Clinical Notes & Prescription</label>
                  <textarea
                    rows="4"
                    required
                    className="w-full px-4 py-2 border rounded-lg outline-none"
                    placeholder="Enter diagnosis, medication, and follow-up instructions..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                  ></textarea>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveAppt(null)}
                    className="px-4 py-2 border rounded-lg text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Generate AI Summary & Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
