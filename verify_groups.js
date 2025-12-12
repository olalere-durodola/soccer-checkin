const authPayload = {
    email: 'test@example.com',
    password: 'password123'
};

const groupPayload = {
    name: 'Worship Team',
    description: 'Music and singing',
    category: 'Team',
    schedule: 'Thursdays 7 PM',
    location: 'Main Hall'
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

        // 2. Create Group
        console.log('Creating group...');
        const createRes = await fetch('http://localhost:5000/api/groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(groupPayload)
        });

        if (!createRes.ok) throw new Error(`Create failed: ${await createRes.text()}`);
        const group = await createRes.json();
        console.log('Group created:', group.id);

        // 3. Get Groups
        console.log('Fetching groups...');
        const getRes = await fetch('http://localhost:5000/api/groups', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const groups = await getRes.json();
        console.log(`Fetched ${groups.length} groups`);

        // 4. Update Group
        console.log('Updating group...');
        const updateRes = await fetch(`http://localhost:5000/api/groups/${group.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ...group, name: 'Worship Ministry' })
        });
        const updatedGroup = await updateRes.json();
        console.log('Group updated:', updatedGroup.name);

        // 5. Delete Group
        console.log('Deleting group...');
        const deleteRes = await fetch(`http://localhost:5000/api/groups/${group.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (deleteRes.status === 204) {
            console.log('Group deleted successfully');
        } else {
            console.error('Delete failed');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
