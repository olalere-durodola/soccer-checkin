import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Search, Trash2, Edit2 } from 'lucide-react';
import type { Member } from '../types';

const Members = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<{
        name: string;
        phoneNumber: string;
        dateOfBirth: string;
        gender: 'Male' | 'Female';
        type: 'Member' | 'Visitor';
        followUp: { notes: string };
    }>({
        name: '',
        phoneNumber: '',
        dateOfBirth: '',
        gender: 'Male',
        type: 'Member',
        followUp: { notes: '' }
    });

    const fetchMembers = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/members');
            setMembers(res.data);
        } catch (error) {
            console.error("Failed to fetch members", error);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/members', formData);
            setIsModalOpen(false);
            setFormData({ name: '', phoneNumber: '', dateOfBirth: '', gender: 'Male', type: 'Member', followUp: { notes: '' } });
            fetchMembers();
        } catch (error) {
            alert('Error saving member');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure?')) {
            try {
                await axios.delete(`http://localhost:5000/api/members/${id}`);
                fetchMembers();
            } catch (error) {
                alert('Error deleting member');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Members</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your church congregation.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Member
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search members..."
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                        />
                    </div>
                </div>

                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Phone</th>
                            <th className="px-6 py-4">Gender</th>
                            <th className="px-6 py-4">DOB</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {members.map((member) => (
                            <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-sm font-bold">
                                            {member.name.charAt(0)}
                                        </div>
                                        <span className="font-medium text-slate-900 dark:text-white">{member.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.type === 'Visitor' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {member.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">{member.phoneNumber}</td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">{member.gender}</td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">{member.dateOfBirth}</td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-slate-400 hover:text-primary-600 mr-3 transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(member.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {members.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                    No members found. Add one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Simple Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Add New Member</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                                <input
                                    required
                                    className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                                <input
                                    required
                                    className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2"
                                    value={formData.phoneNumber}
                                    onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                                    <select
                                        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2"
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' })}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                                    <select
                                        className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as 'Member' | 'Visitor' })}
                                    >
                                        <option value="Member">Member</option>
                                        <option value="Visitor">Visitor</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2"
                                    value={formData.dateOfBirth}
                                    onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                >
                                    Save Member
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Members;
