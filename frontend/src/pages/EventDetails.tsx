import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, Trash2, ArrowLeft, Plus, X } from 'lucide-react';
import type { Event, Group, Member, CustomReminder } from '../types';

const EventDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [formData, setFormData] = useState<Partial<Event>>({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        location: '',
        type: 'Service',
        groupId: null,
        customReminders: []
    });

    const [groups, setGroups] = useState<Group[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    const [newReminder, setNewReminder] = useState<CustomReminder>({
        name: '',
        contact: '',
        method: 'email'
    });
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [groupsRes, membersRes] = await Promise.all([
                axios.get('http://localhost:5000/api/groups'),
                axios.get('http://localhost:5000/api/members')
            ]);
            setGroups(groupsRes.data);
            setMembers(membersRes.data);

            if (!isNew && id) {
                const eventsRes = await axios.get('http://localhost:5000/api/events');
                const event = eventsRes.data.find((e: Event) => e.id === id);
                if (event) {
                    setFormData(event);
                } else {
                    navigate('/events');
                }
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isNew) {
                await axios.post('http://localhost:5000/api/events', formData);
            } else {
                await axios.put(`http://localhost:5000/api/events/${id}`, formData);
            }
            navigate('/events');
        } catch (error) {
            console.error("Failed to save event", error);
            alert("Failed to save event");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this event?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/events/${id}`);
            navigate('/events');
        } catch (error) {
            console.error("Failed to delete event", error);
            alert("Failed to delete event");
        }
    };

    const addCustomReminder = () => {
        if (!newReminder.name || !newReminder.contact) return;
        setFormData({
            ...formData,
            customReminders: [...(formData.customReminders || []), newReminder]
        });
        setNewReminder({ name: '', contact: '', method: 'email' });
        setSelectedMemberId('');
    };

    const removeCustomReminder = (index: number) => {
        const updated = [...(formData.customReminders || [])];
        updated.splice(index, 1);
        setFormData({ ...formData, customReminders: updated });
    };

    const handleMemberSelect = (memberId: string) => {
        setSelectedMemberId(memberId);
        if (memberId) {
            const member = members.find(m => m.id === memberId);
            if (member) {
                setNewReminder({
                    name: member.name,
                    contact: member.phoneNumber, // Default to phone for now as we don't have email on member
                    method: 'sms'
                });
            }
        } else {
            setNewReminder({ name: '', contact: '', method: 'email' });
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <button
                onClick={() => navigate('/events')}
                className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Events
            </button>

            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {isNew ? 'Create New Event' : 'Edit Event'}
                </h1>
                {!isNew && (
                    <button
                        onClick={handleDelete}
                        className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-full">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Event Title</label>
                        <input
                            type="text"
                            required
                            className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="col-span-full">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <textarea
                            className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg h-24"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                        <input
                            type="date"
                            required
                            className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time</label>
                        <input
                            type="time"
                            required
                            className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                            value={formData.time}
                            onChange={e => setFormData({ ...formData, time: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label>
                        <input
                            type="text"
                            className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                        <select
                            className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                        >
                            <option value="Service">Service</option>
                            <option value="Event">Event</option>
                            <option value="Meeting">Meeting</option>
                        </select>
                    </div>

                    <div className="col-span-full">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Related Group (Optional)</label>
                        <select
                            className="w-full border-slate-200 rounded-lg"
                            value={formData.groupId || ''}
                            onChange={e => setFormData({ ...formData, groupId: e.target.value || null })}
                        >
                            <option value="">None</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-span-full border-t border-slate-200 pt-6">
                        <h3 className="text-lg font-medium text-slate-900 mb-4">Additional Reminders</h3>

                        <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Member</label>
                                    <select
                                        className="w-full border-slate-200 rounded-lg"
                                        value={selectedMemberId}
                                        onChange={e => handleMemberSelect(e.target.value)}
                                    >
                                        <option value="">-- Manual Entry --</option>
                                        {members.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        className="w-full border-slate-200 rounded-lg"
                                        value={newReminder.name}
                                        onChange={e => setNewReminder({ ...newReminder, name: e.target.value })}
                                        placeholder="Recipient Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Info</label>
                                    <input
                                        type="text"
                                        className="w-full border-slate-200 rounded-lg"
                                        value={newReminder.contact}
                                        onChange={e => setNewReminder({ ...newReminder, contact: e.target.value })}
                                        placeholder="Email or Phone Number"
                                    />
                                </div>
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Method</label>
                                        <select
                                            className="w-full border-slate-200 rounded-lg"
                                            value={newReminder.method}
                                            onChange={e => setNewReminder({ ...newReminder, method: e.target.value as 'email' | 'sms' })}
                                        >
                                            <option value="email">Email</option>
                                            <option value="sms">SMS</option>
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addCustomReminder}
                                        className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {formData.customReminders && formData.customReminders.length > 0 && (
                            <div className="space-y-2">
                                {formData.customReminders.map((reminder, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${reminder.method === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                {reminder.method}
                                            </span>
                                            <div>
                                                <p className="font-medium text-slate-900">{reminder.name}</p>
                                                <p className="text-sm text-slate-500">{reminder.contact}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeCustomReminder(idx)}
                                            className="text-slate-400 hover:text-red-600"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Event'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EventDetails;
