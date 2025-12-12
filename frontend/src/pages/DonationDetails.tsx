import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, Trash2, ArrowLeft } from 'lucide-react';
import type { Donation, Member } from '../types';

const getLocalDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DonationDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [formData, setFormData] = useState<Partial<Donation>>({
        amount: 0,
        date: getLocalDate(),
        donorName: '',
        memberId: null,
        type: 'Tithe',
        category: '',
        notes: ''
    });

    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const membersRes = await axios.get('http://localhost:5000/api/members');
            setMembers(membersRes.data);

            if (!isNew && id) {
                const donationsRes = await axios.get('http://localhost:5000/api/donations');
                const donation = donationsRes.data.find((d: Donation) => d.id === id);
                if (donation) {
                    setFormData(donation);
                } else {
                    navigate('/donations');
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
                await axios.post('http://localhost:5000/api/donations', formData);
            } else {
                await axios.put(`http://localhost:5000/api/donations/${id}`, formData);
            }
            navigate('/donations');
        } catch (error) {
            console.error("Failed to save donation", error);
            alert("Failed to save donation");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this donation?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/donations/${id}`);
            navigate('/donations');
        } catch (error) {
            console.error("Failed to delete donation", error);
            alert("Failed to delete donation");
        }
    };

    const handleMemberSelect = (memberId: string) => {
        setFormData({ ...formData, memberId: memberId || null });
        if (memberId) {
            const member = members.find(m => m.id === memberId);
            if (member && !formData.donorName) {
                setFormData({ ...formData, donorName: member.name, memberId });
            }
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <button
                onClick={() => navigate('/donations')}
                className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Donations
            </button>

            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {isNew ? 'Record New Donation' : 'Edit Donation'}
                </h1>
                {!isNew && (
                    <button
                        onClick={handleDelete}
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-full">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">$</span>
                            <input
                                type="number"
                                step="0.01"
                                required
                                min="0"
                                className="w-full pl-8 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                                value={formData.amount || ''}
                                onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                        <input
                            type="date"
                            required
                            className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                            value={formData.date || getLocalDate()}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type *</label>
                        <select
                            className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                        >
                            <option value="Tithe">Tithe</option>
                            <option value="Offering">Offering</option>
                            <option value="Special Gift">Special Gift</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="col-span-full">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Member (Optional)</label>
                        <select
                            className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                            value={formData.memberId || ''}
                            onChange={e => handleMemberSelect(e.target.value)}
                        >
                            <option value="">-- None / Guest --</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-span-full">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Donor Name *</label>
                        <input
                            type="text"
                            required
                            className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                            value={formData.donorName}
                            onChange={e => setFormData({ ...formData, donorName: e.target.value })}
                            placeholder="Enter donor name"
                        />
                    </div>

                    <div className="col-span-full">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category (Optional)</label>
                        <input
                            type="text"
                            className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                            value={formData.category || ''}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            placeholder="e.g., Building Fund, Missions, etc."
                        />
                    </div>

                    <div className="col-span-full">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                        <textarea
                            className="w-full border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg h-24"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Any additional notes..."
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Donation'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DonationDetails;
