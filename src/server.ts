
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import cron from 'node-cron';

const SECRET_KEY = "supersecretkey"; // In production, use env var

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, '../database.json');
const WRITE_INTERVAL = 5000; // 5 seconds

// --- In-Memory Database ---
interface Member {
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
    customReminders?: {
        name: string;
        contact: string;
        method: 'email' | 'sms';
    }[];
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

export interface User {
    id: string;
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'user';
}

interface Database {
    members: Member[];
    attendance: Attendance[];
    users: User[];
    groups: Group[];
    events: Event[];
    donations: Donation[];
}

let db: Database = { members: [], attendance: [], users: [], groups: [], events: [], donations: [] };
let isDbDirty = false;
let writeTimeout: NodeJS.Timeout | null = null;

// --- Zod Schemas ---
const memberSchema = z.object({
    name: z.string().min(1, "Name is required"),
    phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    gender: z.enum(['Male', 'Female']),
    type: z.enum(['Member', 'Visitor']),
    followUp: z.object({
        lastContacted: z.string().nullable().optional(),
        assignedTo: z.string().nullable().optional(),
        notes: z.string().optional(),
    }).optional(),
});

const attendanceSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    men: z.number().min(0),
    women: z.number().min(0),
    children: z.number().min(0),
    visitors: z.number().min(0),
    notes: z.string().optional(),
});

const groupSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().default(""),
    category: z.enum(['Small Group', 'Ministry', 'Team']),
    leaderId: z.string().nullable().optional(),
    schedule: z.string().default(""),
    location: z.string().default(""),
    memberIds: z.array(z.string()).default([]),
});

const eventSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().default(""),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    time: z.string().min(1, "Time is required"),
    location: z.string().default(""),
    type: z.enum(['Service', 'Event', 'Meeting']),
    groupId: z.string().nullable().optional(),
    reminderSent: z.boolean().optional(),
    customReminders: z.array(z.object({
        name: z.string(),
        contact: z.string(),
        method: z.enum(['email', 'sms']),
    })).optional(),
});

const donationSchema = z.object({
    amount: z.number().positive("Amount must be positive"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    donorName: z.string().min(1, "Donor name is required"),
    memberId: z.string().nullable().optional(),
    type: z.enum(['Tithe', 'Offering', 'Special Gift', 'Other']),
    category: z.string().optional(),
    notes: z.string().default(""),
});

// --- Notification Services ---
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
    }
});

const sendEmail = async (to: string, subject: string, text: string) => {
    console.log(`📧 [Mock Email] To: ${to}, Subject: ${subject}, Body: ${text}`);
    // In a real app, we would await transporter.sendMail(...)
};

const sendSMS = async (to: string, message: string) => {
    console.log(`📱 [Mock SMS] To: ${to}, Message: ${message}`);
};

// --- Scheduler ---
// Check for reminders every minute
cron.schedule('* * * * *', async () => {
    console.log('⏰ Checking for reminders...');
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let updates = false;

    db.events.forEach(event => {
        if (event.reminderSent) return;

        const eventDate = new Date(`${event.date}T${event.time}`);

        // Send reminder if event is within 24 hours and hasn't passed yet
        if (eventDate > now && eventDate <= tomorrow) {
            console.log(`🔔 Sending reminder for event: ${event.title}`);

            // Find recipients
            let recipients: Member[] = [];
            if (event.groupId) {
                const group = db.groups.find(g => g.id === event.groupId);
                if (group) {
                    recipients = db.members.filter(m => group.memberIds.includes(m.id));
                }
            } else {
                // General event - send to all members (for demo purposes, maybe limit this in prod)
                recipients = db.members;
            }

            recipients.forEach(member => {
                // Send Email
                // We assume member email is constructed or stored. 
                // For now, we'll mock it based on name since Member doesn't have email field yet.
                const mockEmail = `${member.name.replace(/\s+/g, '.').toLowerCase()}@example.com`;
                sendEmail(mockEmail, `Reminder: ${event.title}`, `Don't forget about ${event.title} tomorrow at ${event.time}!`);

                // Send SMS
                sendSMS(member.phoneNumber, `Reminder: ${event.title} is tomorrow at ${event.time}. See you there!`);
            });

            // Send to custom reminders
            if (event.customReminders) {
                event.customReminders.forEach(cr => {
                    if (cr.method === 'email') {
                        sendEmail(cr.contact, `Reminder: ${event.title}`, `Don't forget about ${event.title} tomorrow at ${event.time}!`);
                    } else {
                        sendSMS(cr.contact, `Reminder: ${event.title} is tomorrow at ${event.time}.`);
                    }
                });
            }

            event.reminderSent = true;
            updates = true;
        }
    });

    if (updates) {
        scheduleWrite();
    }
});

// --- Database Functions ---
const loadDb = async () => {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        if (data.trim() === '') {
            db = { members: [], attendance: [], users: [], groups: [], events: [], donations: [] };
        } else {
            const parsed = JSON.parse(data);
            db = {
                members: parsed.members || [],
                attendance: parsed.attendance || [],
                users: parsed.users || [],
                groups: parsed.groups || [],
                events: parsed.events || [],
                donations: parsed.donations || [],
            };
        }
        console.log('🗃️ Database loaded successfully.');
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.log('🤔 No database file found, starting with an empty one.');
            db = { members: [], attendance: [], users: [], groups: [], events: [], donations: [] };
            await flushDb();
        } else {
            console.error('❌ Failed to load database:', error);
        }
    }
};

const flushDb = async () => {
    if (!isDbDirty) return;
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
        isDbDirty = false;
        if (writeTimeout) {
            clearTimeout(writeTimeout);
            writeTimeout = null;
        }
        console.log('💾 Database flushed to disk.');
    } catch (error) {
        console.error('❌ Failed to write database:', error);
    }
};

const scheduleWrite = () => {
    isDbDirty = true;
    if (!writeTimeout) {
        writeTimeout = setTimeout(flushDb, WRITE_INTERVAL);
    }
};

// --- Middleware ---
app.use(helmet());
app.use(cors({
    origin: '*',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// --- Middleware ---
// DEVELOPMENT MODE: Authentication disabled for testing
const authenticateToken = (req: any, res: any, next: any) => {
    // Skip authentication check during development
    // TODO: Re-enable authentication for production
    next();

    /* Original auth code - commented out for development:
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
    */
};

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        const existingUser = db.users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser: User = {
            id: uuidv4(),
            email,
            password: hashedPassword,
            name,
            role: 'user' // Default role
        };

        db.users.push(newUser);
        scheduleWrite();

        const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, SECRET_KEY);
        res.status(201).json({ token, user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role } });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.users.find(u => u.email === email);
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY);
            res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
        } else {
            res.status(403).json({ error: 'Invalid password' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    const user = db.users.find(u => u.id === req.user.id);
    if (!user) return res.sendStatus(404);
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

// --- Routes ---

// Health
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Members
app.get('/api/members', authenticateToken, (req, res) => {
    res.json(db.members);
});

app.post('/api/members', authenticateToken, (req, res) => {
    const result = memberSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.flatten() });
    }
    const now = new Date().toISOString();
    const newMember: Member = {
        id: uuidv4(),
        name: result.data.name,
        phoneNumber: result.data.phoneNumber,
        dateOfBirth: result.data.dateOfBirth,
        gender: result.data.gender,
        type: result.data.type,
        followUp: {
            lastContacted: result.data.followUp?.lastContacted ?? null,
            assignedTo: result.data.followUp?.assignedTo ?? null,
            notes: result.data.followUp?.notes || "",
        },
        createdAt: now,
        updatedAt: now,
    };
    db.members.push(newMember);
    scheduleWrite();
    res.status(201).json(newMember);
});

app.put('/api/members/:id', authenticateToken, (req, res) => {
    const idx = db.members.findIndex(m => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Member not found' });

    const result = memberSchema.partial().safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.flatten() });
    }

    const updates = { ...result.data };
    if (updates.followUp) {
        updates.followUp = {
            lastContacted: updates.followUp.lastContacted ?? db.members[idx].followUp.lastContacted,
            assignedTo: updates.followUp.assignedTo ?? db.members[idx].followUp.assignedTo,
            notes: updates.followUp.notes ?? db.members[idx].followUp.notes,
        };
    }

    db.members[idx] = {
        ...db.members[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    scheduleWrite();
    res.json(db.members[idx]);
});

app.delete('/api/members/:id', authenticateToken, (req, res) => {
    const idx = db.members.findIndex(m => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Member not found' });
    db.members.splice(idx, 1);
    scheduleWrite();
    res.status(204).send();
});

// Attendance
app.get('/api/attendance', authenticateToken, (req, res) => {
    const { date } = req.query;
    let results = db.attendance;
    if (date) {
        results = results.filter(a => a.date === date);
    }
    // Sort by date descending
    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(results);
});

app.post('/api/attendance', authenticateToken, (req, res) => {
    console.log("Received attendance payload:", req.body);
    const result = attendanceSchema.safeParse(req.body);
    if (!result.success) {
        console.error("Validation error:", result.error.flatten());
        return res.status(400).json({ error: result.error.flatten() });
    }

    const existingIdx = db.attendance.findIndex(a => a.date === result.data.date);

    if (existingIdx !== -1) {
        // Update existing record for this date
        db.attendance[existingIdx] = {
            ...db.attendance[existingIdx],
            ...result.data,
        };
        scheduleWrite();
        res.json(db.attendance[existingIdx]);
    } else {
        // Create new record
        const newRecord: Attendance = {
            id: uuidv4(),
            ...result.data,
        };
        db.attendance.push(newRecord);
        scheduleWrite();
        res.status(201).json(newRecord);
    }
});

// Groups
app.get('/api/groups', authenticateToken, (req, res) => {
    res.json(db.groups);
});

app.post('/api/groups', authenticateToken, (req, res) => {
    const result = groupSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.flatten() });
    }
    const newGroup: Group = {
        id: uuidv4(),
        name: result.data.name,
        description: result.data.description,
        category: result.data.category,
        leaderId: result.data.leaderId || null,
        schedule: result.data.schedule,
        location: result.data.location,
        memberIds: result.data.memberIds,
    };
    db.groups.push(newGroup);
    scheduleWrite();
    res.status(201).json(newGroup);
});

app.put('/api/groups/:id', authenticateToken, (req, res) => {
    const idx = db.groups.findIndex(g => g.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Group not found' });

    const result = groupSchema.partial().safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.flatten() });
    }

    db.groups[idx] = {
        ...db.groups[idx],
        ...result.data,
    };
    scheduleWrite();
    res.json(db.groups[idx]);
});

app.delete('/api/groups/:id', authenticateToken, (req, res) => {
    const idx = db.groups.findIndex(g => g.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Group not found' });
    db.groups.splice(idx, 1);
    scheduleWrite();
    res.status(204).send();
});

// Events
app.get('/api/events', authenticateToken, (req, res) => {
    const { month } = req.query;
    let results = db.events;
    if (month && typeof month === 'string') {
        results = results.filter(e => e.date.startsWith(month));
    }
    // Sort by date ascending
    results.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
    res.json(results);
});

app.post('/api/events', authenticateToken, (req, res) => {
    const result = eventSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.flatten() });
    }
    const newEvent: Event = {
        id: uuidv4(),
        title: result.data.title,
        description: result.data.description,
        date: result.data.date,
        time: result.data.time,
        location: result.data.location,
        type: result.data.type,
        groupId: result.data.groupId || null,
        reminderSent: false,
        customReminders: result.data.customReminders || [],
    };
    db.events.push(newEvent);
    scheduleWrite();
    res.status(201).json(newEvent);
});

app.put('/api/events/:id', authenticateToken, (req, res) => {
    const idx = db.events.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Event not found' });

    const result = eventSchema.partial().safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.flatten() });
    }

    db.events[idx] = {
        ...db.events[idx],
        ...result.data,
    };
    scheduleWrite();
    res.json(db.events[idx]);
});

app.delete('/api/events/:id', authenticateToken, (req, res) => {
    const idx = db.events.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Event not found' });
    db.events.splice(idx, 1);
    scheduleWrite();
    res.status(204).send();
});

// Donations
app.get('/api/donations', authenticateToken, (req, res) => {
    const { startDate, endDate, memberId, type } = req.query;
    let results = db.donations;

    if (startDate && typeof startDate === 'string') {
        results = results.filter(d => d.date >= startDate);
    }
    if (endDate && typeof endDate === 'string') {
        results = results.filter(d => d.date <= endDate);
    }
    if (memberId && typeof memberId === 'string') {
        results = results.filter(d => d.memberId === memberId);
    }
    if (type && typeof type === 'string') {
        results = results.filter(d => d.type === type);
    }

    // Sort by date descending
    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(results);
});

app.get('/api/donations/summary', authenticateToken, (req, res) => {
    const { startDate, endDate } = req.query;
    let donations = db.donations;

    if (startDate && typeof startDate === 'string') {
        donations = donations.filter(d => d.date >= startDate);
    }
    if (endDate && typeof endDate === 'string') {
        donations = donations.filter(d => d.date <= endDate);
    }

    const total = donations.reduce((sum, d) => sum + d.amount, 0);
    const byType = donations.reduce((acc, d) => {
        acc[d.type] = (acc[d.type] || 0) + d.amount;
        return acc;
    }, {} as Record<string, number>);

    res.json({ total, byType, count: donations.length });
});

app.post('/api/donations', authenticateToken, (req, res) => {
    const result = donationSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.flatten() });
    }

    const newDonation: Donation = {
        id: uuidv4(),
        amount: result.data.amount,
        date: result.data.date,
        donorName: result.data.donorName,
        memberId: result.data.memberId || null,
        type: result.data.type,
        category: result.data.category,
        notes: result.data.notes,
        createdAt: new Date().toISOString(),
    };

    db.donations.push(newDonation);
    scheduleWrite();
    res.status(201).json(newDonation);
});

app.put('/api/donations/:id', authenticateToken, (req, res) => {
    const idx = db.donations.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Donation not found' });

    const result = donationSchema.partial().safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.flatten() });
    }

    db.donations[idx] = {
        ...db.donations[idx],
        ...result.data,
    };
    scheduleWrite();
    res.json(db.donations[idx]);
});

app.delete('/api/donations/:id', authenticateToken, (req, res) => {
    const idx = db.donations.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Donation not found' });
    db.donations.splice(idx, 1);
    scheduleWrite();
    res.status(204).send();
});

// Start
const startServer = async () => {
    await loadDb();
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
};

if (require.main === module) {
    startServer();
}

export { app };
