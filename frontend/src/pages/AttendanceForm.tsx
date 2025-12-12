import React, { useEffect, useReducer } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Save } from 'lucide-react';

// Define state and action types
interface State {
    men: number;
    women: number;
    children: number;
    visitors: number;
    notes: string;
    loading: boolean;
    saving: boolean;
    selectedDate: string;
}

type Action =
    | { type: 'SET_DATE'; payload: string }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_SAVING'; payload: boolean }
    | { type: 'SET_DATA'; payload: Partial<State> }
    | { type: 'UPDATE_FIELD'; field: keyof State; value: any }
    | { type: 'RESET_DATA' };

const initialState: State = {
    men: 0,
    women: 0,
    children: 0,
    visitors: 0,
    notes: '',
    loading: false,
    saving: false,
    selectedDate: format(new Date(), 'yyyy-MM-dd'),
};

const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'SET_DATE':
            return { ...state, selectedDate: action.payload };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_SAVING':
            return { ...state, saving: action.payload };
        case 'SET_DATA':
            return { ...state, ...action.payload };
        case 'UPDATE_FIELD':
            return { ...state, [action.field]: action.value };
        case 'RESET_DATA':
            return { ...state, men: 0, women: 0, children: 0, visitors: 0, notes: '' };
        default:
            return state;
    }
};

const AttendancePage = () => {
    const [state, dispatch] = useReducer(reducer, initialState);

    useEffect(() => {
        const fetchAttendance = async () => {
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                const res = await axios.get(`http://localhost:5000/api/attendance?date=${state.selectedDate}`);
                if (res.data && res.data.length > 0) {
                    const record = res.data[0];
                    const payload = {
                        men: typeof record.men === 'number' ? record.men : 0,
                        women: typeof record.women === 'number' ? record.women : 0,
                        children: typeof record.children === 'number' ? record.children : 0,
                        visitors: typeof record.visitors === 'number' ? record.visitors : 0,
                        notes: record.notes || ''
                    };
                    dispatch({
                        type: 'SET_DATA',
                        payload: payload
                    });
                } else {
                    dispatch({ type: 'RESET_DATA' });
                }
            } catch (error) {
                console.error("Failed to fetch attendance", error);
            } finally {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };
        fetchAttendance();
    }, [state.selectedDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        dispatch({ type: 'SET_SAVING', payload: true });
        const payload = {
            date: state.selectedDate,
            men: state.men,
            women: state.women,
            children: state.children,
            visitors: state.visitors,
            notes: state.notes
        };
        try {
            await axios.post('http://localhost:5000/api/attendance', payload);
            alert('Attendance saved successfully!');
        } catch (error) {
            console.error('Failed to save attendance', error);
            alert('Error saving attendance');
        } finally {
            dispatch({ type: 'SET_SAVING', payload: false });
        }
    };

    const handleNumberChange = (field: keyof State, value: string) => {
        const intValue = value === '' ? 0 : parseInt(value, 10);
        dispatch({ type: 'UPDATE_FIELD', field, value: isNaN(intValue) ? 0 : intValue });
    };

    const total = (state.men || 0) + (state.women || 0) + (state.children || 0) + (state.visitors || 0);

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance Record</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Track attendance for church services and events.</p>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                    <div className="p-2 text-slate-400">
                        <CalendarIcon className="w-5 h-5" />
                    </div>
                    <input
                        type="date"
                        value={state.selectedDate}
                        onChange={(e) => dispatch({ type: 'SET_DATE', payload: e.target.value })}
                        className="border-none focus:ring-0 text-slate-700 dark:text-slate-200 dark:bg-slate-800 font-medium"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/50">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Headcount for {format(new Date(`${state.selectedDate}T00:00:00`), 'MMMM d, yyyy')}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Enter the number of attendees for each category.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                            <label className="block text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Men</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full text-2xl font-bold text-blue-900 dark:text-blue-100 bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={state.men}
                                onChange={e => handleNumberChange('men', e.target.value)}
                            />
                        </div>
                        <div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-xl border border-pink-100 dark:border-pink-800">
                            <label className="block text-sm font-semibold text-pink-900 dark:text-pink-300 mb-2">Women</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full text-2xl font-bold text-pink-900 dark:text-pink-100 bg-white dark:bg-slate-800 border-pink-200 dark:border-pink-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                value={state.women}
                                onChange={e => handleNumberChange('women', e.target.value)}
                            />
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                            <label className="block text-sm font-semibold text-amber-900 dark:text-amber-300 mb-2">Children</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full text-2xl font-bold text-amber-900 dark:text-amber-100 bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                value={state.children}
                                onChange={e => handleNumberChange('children', e.target.value)}
                            />
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                            <label className="block text-sm font-semibold text-emerald-900 dark:text-emerald-300 mb-2">Visitors</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full text-2xl font-bold text-emerald-900 dark:text-emerald-100 bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                value={state.visitors}
                                onChange={e => handleNumberChange('visitors', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-lg font-medium text-slate-700 dark:text-slate-300">Total Attendance</span>
                            <span className="text-3xl font-bold text-slate-900 dark:text-white">{total}</span>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
                            <textarea
                                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="Any additional notes about the service..."
                                value={state.notes}
                                onChange={e => dispatch({ type: 'UPDATE_FIELD', field: 'notes', value: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={state.saving}
                        className="w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-700 font-semibold shadow-lg shadow-primary-600/20 transition-all flex items-center justify-center gap-2"
                    >
                        <Save className="w-5 h-5" />
                        {state.saving ? 'Saving...' : 'Save Attendance Record'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AttendancePage;
