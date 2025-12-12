import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Calendar, Plus, MapPin, Clock, ChevronRight } from 'lucide-react';
import type { Event } from '../types';

const Events = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/events');
            setEvents(res.data);
        } catch (error) {
            console.error("Failed to fetch events", error);
        } finally {
            setLoading(false);
        }
    };



    if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading events...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Events & Calendar</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Upcoming church services and activities.</p>
                </div>
                <Link
                    to="/events/new"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Create Event
                </Link>
            </div>

            <div className="grid gap-4">
                {events.map(event => (
                    <Link
                        key={event.id}
                        to={`/events/${event.id}`}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-4 group"
                    >
                        <div className="flex-shrink-0 w-full sm:w-24 h-24 bg-primary-50 rounded-lg flex flex-col items-center justify-center text-primary-700 border border-primary-100">
                            <span className="text-xs font-bold uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-2xl font-bold">{new Date(event.date).getDate()}</span>
                            <span className="text-xs text-primary-600">{new Date(event.date).toLocaleString('default', { weekday: 'short' })}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${event.type === 'Service' ? 'bg-blue-100 text-blue-700' :
                                        event.type === 'Meeting' ? 'bg-orange-100 text-orange-700' :
                                            'bg-purple-100 text-purple-700'
                                        }`}>
                                        {event.type}
                                    </span>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 truncate">{event.title}</h3>
                                    {event.reminderSent && (
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 ml-2 border border-green-200">
                                            REMINDER SENT
                                        </span>
                                    )}
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-600 transition-colors" />
                            </div>

                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-3 line-clamp-2">{event.description}</p>

                            <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    {event.time}
                                </div>
                                {event.location && (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        {event.location}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}

                {events.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-600">
                        <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No upcoming events</h3>
                        <p className="text-slate-500 dark:text-slate-400">Schedule a new event to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Events;
