import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { Donation } from '../types';
import { format, parseISO, isSameDay } from 'date-fns';

const DonationComparison = () => {
    const navigate = useNavigate();
    const [donations, setDonations] = useState<Donation[]>([]);
    const [loading, setLoading] = useState(true);

    // Default to today and yesterday (or last week)
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [dateA, setDateA] = useState(lastWeek);
    const [dateB, setDateB] = useState(today);

    useEffect(() => {
        fetchDonations();
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

    const getStatsForDate = (date: string) => {
        const daysDonations = donations.filter(d => d.date === date);
        const total = daysDonations.reduce((sum, d) => sum + d.amount, 0);
        const tithes = daysDonations.filter(d => d.type === 'Tithe').reduce((sum, d) => sum + d.amount, 0);
        const offerings = daysDonations.filter(d => d.type === 'Offering').reduce((sum, d) => sum + d.amount, 0);
        const count = daysDonations.length;
        return { total, tithes, offerings, count };
    };

    const statsA = getStatsForDate(dateA);
    const statsB = getStatsForDate(dateB);

    const getPercentChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const renderComparisonCard = (label: string, valueA: number, valueB: number, isCurrency = true) => {
        const diff = valueB - valueA;
        const percent = getPercentChange(valueB, valueA);
        const isPositive = diff > 0;
        const isNeutral = diff === 0;

        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">{label}</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p className="text-xs text-slate-400 mb-1">{format(parseISO(dateA), 'MMM d, yyyy')}</p>
                        <p className="text-xl font-bold text-slate-700 dark:text-slate-300">
                            {isCurrency ? formatCurrency(valueA) : valueA}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 mb-1">{format(parseISO(dateB), 'MMM d, yyyy')}</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">
                            {isCurrency ? formatCurrency(valueB) : valueB}
                        </p>
                    </div>
                </div>

                <div className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : isNeutral ? 'text-slate-500' : 'text-red-600'}`}>
                    {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : isNeutral ? null : <TrendingDown className="w-4 h-4 mr-1" />}
                    {isNeutral ? 'No Change' : `${Math.abs(percent).toFixed(1)}% ${isPositive ? 'Increase' : 'Decrease'}`}
                    <span className="ml-auto text-xs text-slate-400">
                        ({isCurrency ? (diff > 0 ? '+' : '') + formatCurrency(diff) : (diff > 0 ? '+' : '') + diff})
                    </span>
                </div>
            </div>
        );
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/donations')}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Compare Donations</h1>
                    <p className="text-slate-500 dark:text-slate-400">Compare donation performance between two dates.</p>
                </div>
            </div>

            {/* Date Selection */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Base Date (A)</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                value={dateA}
                                onChange={(e) => setDateA(e.target.value)}
                                className="w-full pl-10 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Comparison Date (B)</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                value={dateB}
                                onChange={(e) => setDateB(e.target.value)}
                                className="w-full pl-10 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {renderComparisonCard('Total Donations', statsA.total, statsB.total)}
                {renderComparisonCard('Tithes', statsA.tithes, statsB.tithes)}
                {renderComparisonCard('Offerings', statsA.offerings, statsB.offerings)}
                {renderComparisonCard('Number of Donations', statsA.count, statsB.count, false)}
            </div>
        </div>
    );
};

export default DonationComparison;
