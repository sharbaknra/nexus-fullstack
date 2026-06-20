import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, Plus, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Meeting {
  _id: string;
  title: string;
  scheduledBy: { _id: string; name: string; avatarUrl: string; role: string };
  scheduledWith: { _id: string; name: string; avatarUrl: string; role: string };
  date: string;
  duration: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message: string;
  meetingLink: string;
}

export const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', scheduledWith: '', date: '', duration: '60', message: '', meetingLink: '' });

  const token = localStorage.getItem('nexus_token');

  const fetchMeetings = async () => {
    try {
      const res = await fetch(`${API_URL}/meetings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMeetings(data);
    } catch {
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMeetings(); }, []);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Meeting scheduled!');
      setShowForm(false);
      setForm({ title: '', scheduledWith: '', date: '', duration: '60', message: '', meetingLink: '' });
      fetchMeetings();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleStatus = async (id: string, status: 'accepted' | 'rejected') => {
    try {
      const res = await fetch(`${API_URL}/meetings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success(`Meeting ${status}`);
      fetchMeetings();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/meetings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to cancel');
      toast.success('Meeting cancelled');
      fetchMeetings();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const statusColor: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'> = {
    pending: 'warning', accepted: 'success', rejected: 'danger', cancelled: 'default'
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600">Schedule and manage your meetings</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowForm(!showForm)}>
          Schedule Meeting
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><h2 className="text-lg font-medium">New Meeting</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleSchedule} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required
                    value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID to meet with</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required
                    placeholder="Paste their user ID"
                    value={form.scheduledWith} onChange={e => setForm({ ...form, scheduledWith: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                  <input type="datetime-local" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required
                    value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link (optional)</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="https://meet.google.com/..."
                    value={form.meetingLink} onChange={e => setForm({ ...form, meetingLink: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Schedule</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <p className="text-gray-500">Loading meetings...</p>
      ) : meetings.length === 0 ? (
        <Card><CardBody><p className="text-center text-gray-500 py-8">No meetings yet. Schedule your first one!</p></CardBody></Card>
      ) : (
        <div className="space-y-4">
          {meetings.map(meeting => {
            const isReceiver = meeting.scheduledWith._id === user?.id;
            const other = isReceiver ? meeting.scheduledBy : meeting.scheduledWith;
            return (
              <Card key={meeting._id}>
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <img src={other.avatarUrl} alt={other.name} className="w-10 h-10 rounded-full" />
                      <div>
                        <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
                        <p className="text-sm text-gray-600">with {other.name} ({other.role})</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><Calendar size={14} />{new Date(meeting.date).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Clock size={14} />{new Date(meeting.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>{meeting.duration} min</span>
                        </div>
                        {meeting.status === 'accepted' && (
                          <Button size="sm" onClick={() => navigate(`/call/${meeting._id}`)} leftIcon={<Video size={14} />}>
                            Start Call
                          </Button>
                        )}
                        {meeting.meetingLink && (
                          <a href={meeting.meetingLink} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-sm text-primary-600 hover:underline mt-1">
                            <Video size={14} /> Join Meeting
                          </a>
                        )}
                        {meeting.message && <p className="text-sm text-gray-500 mt-1">"{meeting.message}"</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColor[meeting.status]}>{meeting.status}</Badge>
                      {isReceiver && meeting.status === 'pending' && (
                        <>
                          <button onClick={() => handleStatus(meeting._id, 'accepted')}
                            className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200">
                            <Check size={16} />
                          </button>
                          <button onClick={() => handleStatus(meeting._id, 'rejected')}
                            className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200">
                            <X size={16} />
                          </button>
                        </>
                      )}
                      {!isReceiver && meeting.status === 'pending' && (
                        <button onClick={() => handleCancel(meeting._id)}
                          className="text-sm text-red-500 hover:underline">Cancel</button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
