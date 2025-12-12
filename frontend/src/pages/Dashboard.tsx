import { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, UserPlus, CalendarCheck, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Member, Attendance, Event } from '../types';
import { cn } from '../lib/utils';

const Dashboard = () => {
    const navigate = useNavigate();
    const [members, setMembers] = useState<Member[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [latestAttendance, setLatestAttendance] = useState<Attendance | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [membersRes, attendanceRes, eventsRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/members'),
                    axios.get('http://localhost:5000/api/attendance'),
                    axios.get('http://localhost:5000/api/events')
                ]);
                setMembers(membersRes.data);
                setAttendance(attendanceRes.data);
                setEvents(eventsRes.data);
                // Get the most recent attendance record
                if (attendanceRes.data && attendanceRes.data.length > 0) {
                    setLatestAttendance(attendanceRes.data[0]); // Assumes sorted by date desc from backend
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Calculate Breakdown from Latest Attendance
    const attendanceBreakdown = latestAttendance ? [
        { name: 'Men', value: latestAttendance.men || 0, color: '#0ea5e9' },
        { name: 'Women', value: latestAttendance.women || 0, color: '#ec4899' },
        { name: 'Children', value: latestAttendance.children || 0, color: '#f59e0b' },
        { name: 'Visitors', value: latestAttendance.visitors || 0, color: '#10b981' },
    ] : [
        { name: 'No Data', value: 1, color: '#e2e8f0' }
    ];

    const avgAttendance = attendance.length > 0
        ? Math.round(attendance.reduce((acc, curr) => acc + ((curr.men || 0) + (curr.women || 0) + (curr.children || 0) + (curr.visitors || 0)), 0) / attendance.length)
        : 0;

    const stats = [
        {
            label: 'Total Members',
            value: members.length,
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-100',
        },
        {
            label: 'New Members (Month)',
            value: members.filter(m => new Date(m.createdAt).getMonth() === new Date().getMonth()).length,
            icon: UserPlus,
            color: 'text-green-600',
            bg: 'bg-green-50',
            border: 'border-green-100',
        },
        {
            label: 'Avg. Attendance',
            value: avgAttendance,
            icon: TrendingUp,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            border: 'border-purple-100',
        },
        {
            label: 'Recent Events',
            value: '4',
            icon: CalendarCheck,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
            border: 'border-orange-100',
        },
    ];

    // Calculate Next Event
    const getNextEvent = () => {
        const now = new Date();
        const upcoming = events
            .filter(e => new Date(`${e.date}T${e.time}`) > now)
            .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
        return upcoming.length > 0 ? upcoming[0] : null;
    };

    const nextEvent = getNextEvent();

    const getDaysLeft = (dateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Append time to ensure local timezone parsing
        const eventDate = new Date(`${dateStr}T00:00:00`);

        const diff = eventDate.getTime() - today.getTime();
        const days = Math.round(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return 'Passed';
        return days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days left`;
    };

    const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500">Loading...</div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Overview of your church's growth and activities.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className={cn(
                                "bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border dark:border-slate-700 transition-all duration-200 hover:shadow-md hover:-translate-y-1",
                                stat.border
                            )}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stat.value}</p>
                                </div>
                                <div className={cn("p-3 rounded-xl", stat.bg)}>
                                    <Icon className={cn("w-6 h-6", stat.color)} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Members</h2>
                        <button className="text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1">
                            View All <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="space-y-4">
                        {members.slice(-5).reverse().map(member => (
                            <div key={member.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 flex items-center justify-center text-slate-600 dark:text-white font-bold shadow-sm group-hover:border-primary-200 group-hover:text-primary-600 transition-colors">
                                        {member.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{member.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{member.phoneNumber}</p>
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-slate-400 dark:text-slate-300 bg-white dark:bg-slate-600 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-500">
                                    {new Date(member.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                        {members.length === 0 && <p className="text-slate-500 dark:text-slate-400 text-center py-8">No members yet.</p>}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-fit">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                        <button
                            onClick={() => navigate('/members')}
                            className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 font-medium"
                        >
                            <UserPlus className="w-5 h-5" />
                            Add New Member
                        </button>
                        <button
                            onClick={() => navigate('/attendance')}
                            className="w-full py-3 px-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2 font-medium"
                        >
                            <CalendarCheck className="w-5 h-5 text-slate-500 dark:text-slate-300" />
                            Record Attendance
                        </button>
                    </div>

                    <div className="mt-8 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800">
                        <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-100 mb-1">Next Event</h3>
                        {nextEvent ? (
                            <>
                                <p className="text-xs text-primary-700 dark:text-primary-200 mb-3">{nextEvent.title} • {formatTime(nextEvent.time)}</p>
                                <div className="w-full bg-primary-200 dark:bg-primary-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-primary-500 h-full w-3/4 rounded-full"></div>
                                </div>
                                <p className="text-[10px] text-primary-600 dark:text-primary-300 mt-2 text-right">{getDaysLeft(nextEvent.date)}</p>
                            </>
                        ) : (
                            <p className="text-xs text-primary-500 dark:text-primary-300">No upcoming events scheduled.</p>
                        )}
                    </div>

                    <div className="mt-6 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                            Attendance Breakdown
                            {latestAttendance && <span className="text-slate-400 dark:text-slate-500 font-normal ml-2">({latestAttendance.date})</span>}
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={attendanceBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {attendanceBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
