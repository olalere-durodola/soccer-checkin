const authPayload = {
    email: 'test@example.com',
    password: 'password123'
};

async function test() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(authPayload)
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`);
        const { token } = await loginRes.json();
        console.log('Login successful');

        // 2. Create Event for Tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);

        const eventPayload = {
            title: 'Reminder Test Event',
            description: 'Testing auto reminders',
            date: tomorrow.toISOString().split('T')[0],
            time: '10:00',
            location: 'Test Location',
            type: 'Meeting',
            customReminders: [
                { name: 'Guest User', contact: '555-0199', method: 'sms' }
            ]
        };

        console.log('Creating event for tomorrow...');
        const createRes = await fetch('http://localhost:5000/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(eventPayload)
        });

        if (!createRes.ok) throw new Error(`Create failed: ${await createRes.text()}`);
        const event = await createRes.json();
        console.log('Event created:', event.id);

        console.log('Waiting 70 seconds for cron job...');
        await new Promise(resolve => setTimeout(resolve, 70000));

        // 3. Check if reminderSent is true
        console.log('Checking event status...');
        const getRes = await fetch('http://localhost:5000/api/events', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const events = await getRes.json();
        const updatedEvent = events.find(e => e.id === event.id);

        if (updatedEvent.reminderSent) {
            console.log('SUCCESS: Reminder sent flag is true!');
        } else {
            console.error('FAILURE: Reminder sent flag is false.');
        }

        // Cleanup
        await fetch(`http://localhost:5000/api/events/${event.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
