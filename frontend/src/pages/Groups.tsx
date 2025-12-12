import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Users, Plus, MapPin, Calendar, ArrowRight } from 'lucide-react';
import type { Group } from '../types';

const Groups = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'All' | 'Small Group' | 'Ministry' | 'Team'>('All');

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/groups');
            setGroups(res.data);
        } catch (error) {
            console.error("Failed to fetch groups", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredGroups = filter === 'All'
        ? groups
        : groups.filter(g => g.category === filter);

    if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading groups...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Groups & Ministries</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Connect with small groups, teams, and ministries.</p>
                </div>
                <Link
                    to="/groups/new"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Create Group
                </Link>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['All', 'Small Group', 'Ministry', 'Team'].map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat as any)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === cat
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGroups.map(group => (
                    <Link
                        key={group.id}
                        to={`/groups/${group.id}`}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${group.category === 'Ministry' ? 'bg-purple-100 text-purple-700' :
                                group.category === 'Team' ? 'bg-blue-100 text-blue-700' :
                                    'bg-emerald-100 text-emerald-700'
                                }`}>
                                {group.category}
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-600 transition-colors" />
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{group.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2">{group.description}</p>

                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                {group.schedule || 'No schedule set'}
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                {group.location || 'No location set'}
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400" />
                                {group.memberIds.length} members
                            </div>
                        </div>
                    </Link>
                ))}

                {filteredGroups.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-600">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No groups found</h3>
                        <p className="text-slate-500 dark:text-slate-400">Create a new group to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Groups;
