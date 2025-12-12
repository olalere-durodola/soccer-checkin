const authPayload = {
    email: 'test@example.com',
    password: 'password123'
};

async function setup() {
    try {
        // 1. Login
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(authPayload)
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`);
        const { token } = await loginRes.json();

        // 2. Create Event for Tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);

        const eventPayload = {
            title: 'Dashboard Test Event',
            description: 'Testing dashboard next event tile',
            date: tomorrow.toISOString().split('T')[0],
            time: '10:00',
            location: 'Main Hall',
            type: 'Service'
        };

        const createRes = await fetch('http://localhost:5000/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(eventPayload)
        });

        if (!createRes.ok) throw new Error(`Create failed: ${await createRes.text()}`);
        console.log('Event created successfully');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

setup();
