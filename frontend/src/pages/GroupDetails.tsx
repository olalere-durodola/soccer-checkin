import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, Trash2, ArrowLeft, UserPlus, X } from 'lucide-react';
import type { Group, Member } from '../types';

const GroupDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [formData, setFormData] = useState<Partial<Group>>({
        name: '',
        description: '',
        category: 'Small Group',
        schedule: '',
        location: '',
        memberIds: [],
        leaderId: null
    });

    const [allMembers, setAllMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [showMemberSelect, setShowMemberSelect] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const membersRes = await axios.get('http://localhost:5000/api/members');
            setAllMembers(membersRes.data);

            if (!isNew && id) {
                const groupRes = await axios.get('http://localhost:5000/api/groups');
                const group = groupRes.data.find((g: Group) => g.id === id);
                if (group) {
                    setFormData(group);
                } else {
                    navigate('/groups');
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
                await axios.post('http://localhost:5000/api/groups', formData);
            } else {
                await axios.put(`http://localhost:5000/api/groups/${id}`, formData);
            }
            navigate('/groups');
        } catch (error) {
            console.error("Failed to save group", error);
            alert("Failed to save group");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this group?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/groups/${id}`);
            navigate('/groups');
        } catch (error) {
            console.error("Failed to delete group", error);
            alert("Failed to delete group");
        }
    };

    const toggleMember = (memberId: string) => {
        const currentIds = formData.memberIds || [];
        const newIds = currentIds.includes(memberId)
            ? currentIds.filter(id => id !== memberId)
            : [...currentIds, memberId];
        setFormData({ ...formData, memberIds: newIds });
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    const groupMembers = allMembers.filter(m => formData.memberIds?.includes(m.id));

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <button
                onClick={() => navigate('/groups')}
                className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Groups
            </button>

            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {isNew ? 'Create New Group' : 'Edit Group'}
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
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Group Name</label>
                        <input
                            type="text"
                            required
                            className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
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
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                        <select
                            className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                        >
                            <option value="Small Group">Small Group</option>
                            <option value="Ministry">Ministry</option>
                            <option value="Team">Team</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Leader</label>
                        <select
                            className="w-full border-slate-200 rounded-lg"
                            value={formData.leaderId || ''}
                            onChange={e => setFormData({ ...formData, leaderId: e.target.value || null })}
                        >
                            <option value="">Select Leader...</option>
                            {allMembers.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Schedule</label>
                        <input
                            type="text"
                            placeholder="e.g., Wednesdays 7 PM"
                            className="w-full border-slate-200 rounded-lg"
                            value={formData.schedule}
                            onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                        <input
                            type="text"
                            placeholder="e.g., Room 101"
                            className="w-full border-slate-200 rounded-lg"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>
                </div>

                {/* Members Section */}
                <div className="border-t border-slate-100 pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-slate-900">Members ({formData.memberIds?.length || 0})</h3>
                        <button
                            type="button"
                            onClick={() => setShowMemberSelect(!showMemberSelect)}
                            className="text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1"
                        >
                            <UserPlus className="w-4 h-4" />
                            Manage Members
                        </button>
                    </div>

                    {showMemberSelect && (
                        <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 max-h-60 overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {allMembers.map(member => (
                                    <label key={member.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.memberIds?.includes(member.id)}
                                            onChange={() => toggleMember(member.id)}
                                            className="rounded text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-slate-700">{member.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {groupMembers.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <span className="text-sm font-medium text-slate-700">{member.name}</span>
                                <button
                                    type="button"
                                    onClick={() => toggleMember(member.id)}
                                    className="text-slate-400 hover:text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {groupMembers.length === 0 && (
                            <p className="text-sm text-slate-500 italic col-span-full">No members assigned yet.</p>
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
                        {saving ? 'Saving...' : 'Save Group'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GroupDetails;
