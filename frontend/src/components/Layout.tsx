import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarCheck, Church, UserPlus, LogOut, Calendar, DollarSign, Moon, Sun, History } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Layout = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    const { logout, user } = useAuth();
    const { isDark, toggleTheme } = useTheme();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Users, label: 'Members', path: '/members' },
        { icon: CalendarCheck, label: 'Record Attendance', path: '/attendance' },
        { icon: History, label: 'Attendance History', path: '/attendance/history' },
        { icon: Calendar, label: 'Events', path: '/events' },
        { icon: Users, label: 'Groups', path: '/groups' },
        { icon: UserPlus, label: 'Follow Up', path: '/follow-up' },
        { icon: DollarSign, label: 'Donations', path: '/donations' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 fixed h-full z-10 hidden md:block flex flex-col">
                <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-700 shrink-0">
                    <Church className="w-6 h-6 text-primary-600 mr-2" />
                    <span className="font-bold text-xl text-slate-800 dark:text-white">ChurchApp</span>
                </div>

                <nav className="p-4 space-y-1 flex-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                                    isActive
                                        ? "bg-primary-50 text-primary-700"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <Icon className={cn("w-5 h-5 mr-3", isActive ? "text-primary-600" : "text-slate-400")} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="px-4 py-3 mb-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role}</p>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className="flex items-center w-full px-4 py-2 mb-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        {isDark ? <Sun className="w-5 h-5 mr-3" /> : <Moon className="w-5 h-5 mr-3" />}
                        {isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button
                        onClick={logout}
                        className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10 px-4 h-16 flex items-center justify-between">
                <div className="flex items-center">
                    <Church className="w-6 h-6 text-primary-600 mr-2" />
                    <span className="font-bold text-xl text-slate-800 dark:text-white">ChurchApp</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={toggleTheme} className="text-slate-500 dark:text-slate-400">
                        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <button onClick={logout} className="text-slate-500 dark:text-slate-400">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-8 mt-16 md:mt-0">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
