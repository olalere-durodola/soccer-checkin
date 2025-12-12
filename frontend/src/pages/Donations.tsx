import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DollarSign, Plus, Calendar, TrendingUp } from 'lucide-react';
import type { Donation } from '../types';

const Donations = () => {
    const navigate = useNavigate();
    const [donations, setDonations] = useState<Donation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('All');
    const [summary, setSummary] = useState<{ total: number; byType: Record<string, number>; count: number }>({ total: 0, byType: {}, count: 0 });

    useEffect(() => {
        fetchDonations();
        fetchSummary();
    }, []);

    const fetchDonations = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/donations');
            setDonations(res.data);
        } catch (error) {
            console.error("Failed to fetch donations", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/donations/summary');
            setSummary(res.data);
        } catch (error) {
            console.error("Failed to fetch summary", error);
        }
    };

    const filteredDonations = filter === 'All'
        ? donations
        : donations.filter(d => d.type === filter);

    // Group donations by date
    const groupedDonations = filteredDonations.reduce((groups, donation) => {
        const date = donation.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(donation);
        return groups;
    }, {} as Record<string, Donation[]>);

    // Sort dates descending
    const sortedDates = Object.keys(groupedDonations).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const typeColors: Record<string, string> = {
        'Tithe': 'bg-blue-100 text-blue-700',
        'Offering': 'bg-green-100 text-green-700',
        'Special Gift': 'bg-purple-100 text-purple-700',
        'Other': 'bg-slate-100 text-slate-700',
    };

    if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Donations</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/donations/compare')}
                        className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                    >
                        <TrendingUp className="w-4 h-4" />
                        Compare
                    </button>
                    <button
                        onClick={() => navigate('/donations/new')}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Record Donation
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Donations</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(summary.total)}</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-green-600" />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Tithes</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-400">{formatCurrency(summary.byType['Tithe'] || 0)}</p>
                        </div>
                        <Calendar className="w-8 h-8 text-blue-600" />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Offerings</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-400">{formatCurrency(summary.byType['Offering'] || 0)}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Count</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.count}</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-slate-600" />
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['All', 'Tithe', 'Offering', 'Special Gift', 'Other'].map(type => (
                    <button
                        key={type}
                        onClick={() => setFilter(type)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${filter === type
                            ? 'bg-primary-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            {/* Donations List Grouped by Date */}
            <div className="space-y-8">
                {sortedDates.map(date => (
                    <div key={date} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                {formatDate(date)}
                            </h3>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm">
                                Total: <span className="text-slate-900 dark:text-white font-bold">{formatCurrency(groupedDonations[date].reduce((sum, d) => sum + d.amount, 0))}</span>
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Donor</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {groupedDonations[date].map(donation => (
                                        <tr
                                            key={donation.id}
                                            onClick={() => navigate(`/donations/${donation.id}`)}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{donation.donorName}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[donation.type]}`}>
                                                    {donation.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-right text-slate-900 dark:text-white">{formatCurrency(donation.amount)}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">{donation.notes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}

                {sortedDates.length === 0 && (
                    <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <DollarSign className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-lg font-medium text-slate-900 dark:text-white">No donations found</p>
                        <p className="text-sm">Try adjusting your filters or record a new donation.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Donations;
