const authPayload = {
    email: 'test@example.com',
    password: 'password123'
};

const eventPayload = {
    title: 'Sunday Service',
    description: 'Weekly worship service',
    date: '2023-12-24',
    time: '10:00 AM',
    location: 'Main Sanctuary',
    type: 'Service'
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

        // 2. Create Event
        console.log('Creating event...');
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

        // 3. Get Events
        console.log('Fetching events...');
        const getRes = await fetch('http://localhost:5000/api/events', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const events = await getRes.json();
        console.log(`Fetched ${events.length} events`);

        // 4. Update Event
        console.log('Updating event...');
        const updateRes = await fetch(`http://localhost:5000/api/events/${event.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ...event, title: 'Christmas Eve Service' })
        });
        const updatedEvent = await updateRes.json();
        console.log('Event updated:', updatedEvent.title);

        // 5. Delete Event
        console.log('Deleting event...');
        const deleteRes = await fetch(`http://localhost:5000/api/events/${event.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (deleteRes.status === 204) {
            console.log('Event deleted successfully');
        } else {
            console.error('Delete failed');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
