import { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { UserPlus, Phone, Calendar, UserCheck, Save, Search } from 'lucide-react';
import type { Member } from '../types';

const FollowUp = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{
        assignedTo: string;
        notes: string;
        lastContacted: string;
    }>({ assignedTo: '', notes: '', lastContacted: '' });

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/members');
            // Filter for Visitors or Members who need follow up (e.g., have assignedTo)
            const followUpList = res.data.filter((m: Member) => m.type === 'Visitor' || m.followUp?.assignedTo);
            setMembers(followUpList);
        } catch (error) {
            console.error("Failed to fetch members", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (member: Member) => {
        setEditingId(member.id);
        setEditForm({
            assignedTo: member.followUp?.assignedTo || '',
            notes: member.followUp?.notes || '',
            lastContacted: member.followUp?.lastContacted || ''
        });
    };

    const handleSave = async (id: string) => {
        try {
            // First get the current member to ensure we don't lose other data
            const memberToUpdate = members.find(m => m.id === id);
            if (!memberToUpdate) return;

            const updatedMember = {
                ...memberToUpdate,
                followUp: {
                    ...memberToUpdate.followUp,
                    assignedTo: editForm.assignedTo || null,
                    notes: editForm.notes,
                    lastContacted: editForm.lastContacted || null
                }
            };

            await axios.put(`http://localhost:5000/api/members/${id}`, updatedMember);

            // Update local state
            setMembers(members.map(m => m.id === id ? updatedMember : m));
            setEditingId(null);
        } catch (error) {
            console.error("Failed to update member", error);
            alert("Failed to update follow-up details");
        }
    };

    const filteredMembers = members.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.followUp?.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading follow-up list...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Follow Up</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage outreach to visitors and new members.</p>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search members or assignees..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredMembers.map(member => (
                    <div key={member.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Member Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{member.name}</h3>
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${member.type === 'Visitor' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {member.type}
                                    </span>
                                </div>
                                <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4" />
                                        {member.phoneNumber}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Visited: {format(new Date(member.createdAt), 'MMM d, yyyy')}
                                    </div>
                                </div>
                            </div>

                            {/* Follow Up Details */}
                            <div className="flex-[2] border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                                {editingId === member.id ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned To</label>
                                                <input
                                                    type="text"
                                                    className="w-full text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                                                    placeholder="Team member name"
                                                    value={editForm.assignedTo}
                                                    onChange={e => setEditForm({ ...editForm, assignedTo: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Last Contacted</label>
                                                <input
                                                    type="date"
                                                    className="w-full text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                                                    value={editForm.lastContacted}
                                                    onChange={e => setEditForm({ ...editForm, lastContacted: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                                            <textarea
                                                className="w-full text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg h-20"
                                                placeholder="Enter follow-up notes..."
                                                value={editForm.notes}
                                                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleSave(member.id)}
                                                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                                            >
                                                <Save className="w-4 h-4" />
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col justify-between">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Assigned To</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <UserCheck className="w-4 h-4 text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                                                        {member.followUp?.assignedTo || 'Unassigned'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Last Contacted</span>
                                                <div className="text-sm text-slate-700 mt-1">
                                                    {member.followUp?.lastContacted
                                                        ? format(new Date(member.followUp.lastContacted), 'MMM d, yyyy')
                                                        : 'Never'}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Latest Notes</span>
                                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                                {member.followUp?.notes || 'No notes available.'}
                                            </p>
                                        </div>
                                        <div className="flex justify-end mt-4">
                                            <button
                                                onClick={() => handleEditClick(member)}
                                                className="text-sm text-primary-600 font-medium hover:text-primary-700"
                                            >
                                                Update Status
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredMembers.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                        <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-900">No members found</h3>
                        <p className="text-slate-500">Try adjusting your search or add new visitors in the Members tab.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FollowUp;
