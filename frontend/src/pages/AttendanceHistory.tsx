import { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Calendar, Users, TrendingUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Attendance } from '../types';

const AttendanceHistory = () => {
    const navigate = useNavigate();
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAttendance();
    }, []);

    const fetchAttendance = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/attendance');
            setAttendance(res.data);
        } catch (error) {
            console.error("Failed to fetch attendance", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading attendance history...</div>;

    const totalAttendance = (record: Attendance) =>
        (record.men || 0) + (record.women || 0) + (record.children || 0) + (record.visitors || 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance History</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">View all recorded attendance records.</p>
                </div>
                <button
                    onClick={() => navigate('/attendance')}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Record Attendance
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {attendance.map((record) => (
                    <div
                        key={record.id}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow p-6"
                    >
                        <div className="flex flex-col lg:flex-row justify-between gap-4">
                            {/* Date */}
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {format(new Date(record.date), 'MMMM d, yyyy')}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {format(new Date(record.date), 'EEEE')}
                                    </p>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 flex-1">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                                    <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">Men</p>
                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{record.men || 0}</p>
                                </div>
                                <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 border border-pink-100 dark:border-pink-800">
                                    <p className="text-xs font-medium text-pink-900 dark:text-pink-300 mb-1">Women</p>
                                    <p className="text-2xl font-bold text-pink-900 dark:text-pink-100">{record.women || 0}</p>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-100 dark:border-amber-800">
                                    <p className="text-xs font-medium text-amber-900 dark:text-amber-300 mb-1">Children</p>
                                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{record.children || 0}</p>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-100 dark:border-emerald-800">
                                    <p className="text-xs font-medium text-emerald-900 dark:text-emerald-300 mb-1">Visitors</p>
                                    <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{record.visitors || 0}</p>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-100 dark:border-purple-800">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Users className="w-3 h-3 text-purple-700 dark:text-purple-300" />
                                        <p className="text-xs font-medium text-purple-900 dark:text-purple-300">Total</p>
                                    </div>
                                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{totalAttendance(record)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {record.notes && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    <span className="font-medium">Notes:</span> {record.notes}
                                </p>
                            </div>
                        )}
                    </div>
                ))}

                {attendance.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-600">
                        <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No attendance records yet</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">Start tracking your church attendance.</p>
                        <button
                            onClick={() => navigate('/attendance')}
                            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 inline-flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Record Attendance
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceHistory;
