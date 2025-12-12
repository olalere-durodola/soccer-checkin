const authPayload = {
    email: 'test@example.com',
    password: 'password123'
};

async function verify() {
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

        // 2. Create some donations
        const donations = [
            { amount: 100, date: '2025-11-15', donorName: 'John Doe', memberId: null, type: 'Tithe', category: '', notes: 'Weekly tithe' },
            { amount: 50, date: '2025-11-17', donorName: 'Jane Smith', memberId: null, type: 'Offering', category: 'Building Fund', notes: 'For new sanctuary' },
            { amount: 200, date: '2025-11-20', donorName: 'Bob Johnson', memberId: null, type: 'Special Gift', category: 'Missions', notes: 'Missionary support' },
            { amount: 75, date: '2025-11-22', donorName: 'Alice Brown', memberId: null, type: 'Offering', category: '', notes: '' },
        ];

        console.log('\\nCreating donations...');
        const createdIds = [];
        for (const donation of donations) {
            const res = await fetch('http://localhost:5000/api/donations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(donation)
            });
            if (!res.ok) throw new Error(`Failed to create donation: ${await res.text()}`);
            const created = await res.json();
            createdIds.push(created.id);
            console.log(`Created: $${donation.amount} - ${donation.type} from ${donation.donorName}`);
        }

        // 3. Get all donations
        console.log('\\nFetching all donations...');
        const getAllRes = await fetch('http://localhost:5000/api/donations', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!getAllRes.ok) throw new Error('Failed to fetch donations');
        const allDonations = await getAllRes.json();
        console.log(`Total donations: ${allDonations.length}`);

        // 4. Get summary
        console.log('\\nFetching summary...');
        const summaryRes = await fetch('http://localhost:5000/api/donations/summary', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!summaryRes.ok) throw new Error('Failed to fetch summary');
        const summary = await summaryRes.json();
        console.log(`Total amount: $${summary.total}`);
        console.log(`By type:`, summary.byType);
        console.log(`Total count: ${summary.count}`);

        // 5. Update a donation
        if (createdIds.length > 0) {
            console.log('\\nUpdating first donation...');
            const updateRes = await fetch(`http://localhost:5000/api/donations/${createdIds[0]}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ amount: 150, notes: 'Updated amount' })
            });
            if (!updateRes.ok) throw new Error('Failed to update donation');
            console.log('Update successful');
        }

        // 6. Delete a donation
        if (createdIds.length > 1) {
            console.log('\\nDeleting second donation...');
            const deleteRes = await fetch(`http://localhost:5000/api/donations/${createdIds[1]}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!deleteRes.ok) throw new Error('Failed to delete donation');
            console.log('Delete successful');
        }

        // 7. Verify final state
        console.log('\\nVerifying final state...');
        const finalRes = await fetch('http://localhost:5000/api/donations', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const finalDonations = await finalRes.json();
        console.log(`Final count: ${finalDonations.length}`);

        console.log('\\n✅ All verification tests passed!');

    } catch (error) {
        console.error('\\n❌ Verification failed:', error.message);
    }
}

verify();
