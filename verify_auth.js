const payload = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User'
};

async function test() {
    try {
        // 1. Register
        console.log('Registering...');
        const regRes = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (regRes.status === 400) {
            console.log('User might already exist, trying login...');
        } else if (!regRes.ok) {
            throw new Error(`Register failed: ${await regRes.text()}`);
        } else {
            console.log('Registered successfully');
        }

        // 2. Login
        console.log('Logging in...');
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: payload.email, password: payload.password })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`);
        const { token } = await loginRes.json();
        console.log('Login successful, token received');

        // 3. Access Protected Route (Members)
        console.log('Accessing protected route (Members)...');
        const membersRes = await fetch('http://localhost:5000/api/members', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!membersRes.ok) throw new Error(`Protected access failed: ${await membersRes.text()}`);
        const members = await membersRes.json();
        console.log(`Success! Fetched ${members.length} members.`);

        // 4. Access without Token (Should fail)
        console.log('Accessing without token (expecting 401)...');
        const failRes = await fetch('http://localhost:5000/api/members');
        if (failRes.status === 401) {
            console.log('Success! Access denied as expected.');
        } else {
            console.error(`Failure! Expected 401 but got ${failRes.status}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
