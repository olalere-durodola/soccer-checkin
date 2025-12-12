export interface Member {
    id: string;
    name: string;
    phoneNumber: string;
    dateOfBirth: string;
    gender: 'Male' | 'Female';
    type: 'Member' | 'Visitor';
    followUp: {
        lastContacted: string | null;
        assignedTo: string | null;
        notes: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface Attendance {
    id: string;
    date: string;
    men: number;
    women: number;
    children: number;
    visitors: number;
    notes?: string;
}

export interface Group {
    id: string;
    name: string;
    description: string;
    category: 'Small Group' | 'Ministry' | 'Team';
    leaderId: string | null;
    schedule: string;
    location: string;
    memberIds: string[];
}

export interface Event {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    type: 'Service' | 'Event' | 'Meeting';
    groupId: string | null;
    reminderSent?: boolean;
    customReminders?: CustomReminder[];
}

export interface CustomReminder {
    name: string;
    contact: string;
    method: 'email' | 'sms';
}

export interface Donation {
    id: string;
    amount: number;
    date: string;
    donorName: string;
    memberId: string | null;
    type: 'Tithe' | 'Offering' | 'Special Gift' | 'Other';
    category?: string;
    notes: string;
    createdAt: string;
}
