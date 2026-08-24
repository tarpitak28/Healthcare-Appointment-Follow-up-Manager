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
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState([
    {
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
    },
  ]);
  const [followUpInstructions, setFollowUpInstructions] = useState('');
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

  const handleMedicineChange = (index, field, value) => {
    setMedicines((prev) =>
      prev.map((medicine, i) =>
        i === index
          ? { ...medicine, [field]: value }
          : medicine
      )
    );
  };

  const addMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      {
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
      },
    ]);
  };

  const removeMedicine = (index) => {
    setMedicines((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const handlePostVisitSubmit = async (e) => {
    e.preventDefault();

    if (!activeAppt) return;

    try {
      const prescription = {
        diagnosis,
        medicines: medicines.filter((medicine) => medicine.name.trim() !== ''),
        followUpInstructions,
      };

      await API.post(
        `/doctor/appointments/${activeAppt.id}/post-visit`,
        {
          clinicalNotes,
          prescription,
        }
      );

      setMessage(
        'Post-visit notes submitted and AI summary generated successfully!'
      );

      setActiveAppt(null);
      setClinicalNotes('');
      setDiagnosis('');
      setMedicines([
        {
          name: '',
          dosage: '',
          frequency: '',
          duration: '',
        },
      ]);
      setFollowUpInstructions('');

      fetchAppointments();
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
        'Failed to submit post-visit notes'
      );
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveAppt(app)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                        >
                          Complete Visit
                        </button>

                        <button
                          onClick={async () => {
                            const confirmed = window.confirm(
                              `Cancel the appointment with ${app.patient?.name}?`
                            );

                            if (!confirmed) return;

                            try {
                              await API.post(
                                `/doctor/appointments/${app.id}/cancel`
                              );

                              setMessage('Appointment cancelled successfully.');
                              fetchAppointments();
                            } catch (err) {
                              setMessage(
                                err.response?.data?.message ||
                                  'Failed to cancel appointment.'
                              );
                            }
                          }}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
                        >
                          Cancel Appointment
                        </button>
                      </div>
                    ) : app.status === 'CANCELLED' ? (
                      <span className="px-3 py-1 bg-red-50 text-red-600 text-xs rounded-full font-medium">
                        Cancelled
                      </span>
                    ) : (
                      <div className="flex flex-col items-end gap-2">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs rounded-full font-medium">
                          Completed
                        </span>
                        {app.needsHumanReview && (
                          <div className="text-right">
                            <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs rounded-lg font-semibold mb-1">
                              ⚠️ Pending Review
                            </span>
                            {app.reviewReasons?.length > 0 && (
                              <p className="text-xs text-amber-600 max-w-xs">
                                Flagged: {Array.isArray(app.reviewReasons) ? app.reviewReasons.join('; ') : String(app.reviewReasons)}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await API.post(`/doctor/appointments/${app.id}/approve-summary`);
                                  setMessage('Post-visit summary approved successfully!');
                                  fetchAppointments();
                                } catch (err) {
                                  setMessage(err.response?.data?.message || 'Failed to approve summary');
                                }
                              }}
                              className="mt-1 px-3 py-1 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700"
                            >
                              Approve Summary
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {activeAppt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white max-w-2xl w-full p-6 rounded-xl shadow-lg space-y-5 my-8">

              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Complete Visit
                  </h3>

                  <p className="text-sm text-slate-500">
                    Patient: {activeAppt.patient?.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveAppt(null)}
                  className="text-slate-400 hover:text-slate-700 text-xl"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={handlePostVisitSubmit}
                className="space-y-5"
              >

                {/* Clinical Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Clinical Notes *
                  </label>

                  <textarea
                    rows="4"
                    required
                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter consultation findings, diagnosis details, observations..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                  />
                </div>

                {/* Diagnosis */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Diagnosis
                  </label>

                  <input
                    type="text"
                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Viral fever"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                  />
                </div>

                {/* Medicines */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Medicines
                    </label>

                    <button
                      type="button"
                      onClick={addMedicine}
                      className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100"
                    >
                      + Add Medicine
                    </button>
                  </div>

                  <div className="space-y-3">
                    {medicines.map((medicine, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg bg-slate-50"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                          <input
                            type="text"
                            placeholder="Medicine name"
                            value={medicine.name}
                            onChange={(e) =>
                              handleMedicineChange(
                                index,
                                'name',
                                e.target.value
                              )
                            }
                            className="px-3 py-2 border rounded-lg outline-none"
                          />

                          <input
                            type="text"
                            placeholder="Dosage e.g. 500 mg"
                            value={medicine.dosage}
                            onChange={(e) =>
                              handleMedicineChange(
                                index,
                                'dosage',
                                e.target.value
                              )
                            }
                            className="px-3 py-2 border rounded-lg outline-none"
                          />

                          <input
                            type="text"
                            placeholder="Frequency e.g. Twice daily"
                            value={medicine.frequency}
                            onChange={(e) =>
                              handleMedicineChange(
                                index,
                                'frequency',
                                e.target.value
                              )
                            }
                            className="px-3 py-2 border rounded-lg outline-none"
                          />

                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Duration e.g. 5 days"
                              value={medicine.duration}
                              onChange={(e) =>
                                handleMedicineChange(
                                  index,
                                  'duration',
                                  e.target.value
                                )
                              }
                              className="flex-1 px-3 py-2 border rounded-lg outline-none"
                            />

                            {medicines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeMedicine(index)}
                                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Follow-up */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Follow-up Instructions
                  </label>

                  <textarea
                    rows="3"
                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Follow up after 7 days or earlier if symptoms worsen."
                    value={followUpInstructions}
                    onChange={(e) =>
                      setFollowUpInstructions(e.target.value)
                    }
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-2">

                  <button
                    type="button"
                    onClick={() => setActiveAppt(null)}
                    className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
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
