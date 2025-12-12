const payload = {
    name: 'Visitor Test',
    phoneNumber: '1234567890',
    dateOfBirth: '1990-01-01',
    gender: 'Male',
    type: 'Visitor',
    followUp: {
        lastContacted: null,
        notes: 'Initial visit'
    }
};

async function test() {
    try {
        // 1. Create Member
        console.log('Creating member...');
        const createRes = await fetch('http://localhost:5000/api/members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!createRes.ok) throw new Error(await createRes.text());
        const member = await createRes.json();
        console.log('Member created:', member.id);

        // 2. Update with Assignment
        console.log('Assigning to John Doe...');
        const updatePayload = {
            ...member,
            followUp: {
                ...member.followUp,
                assignedTo: 'John Doe',
                notes: 'Assigned for follow up'
            }
        };

        const updateRes = await fetch(`http://localhost:5000/api/members/${member.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
        });

        if (!updateRes.ok) throw new Error(await updateRes.text());
        const updatedMember = await updateRes.json();

        if (updatedMember.followUp.assignedTo === 'John Doe') {
            console.log('SUCCESS: Member assigned to John Doe');
        } else {
            console.error('FAILURE: Assignment did not persist', updatedMember);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
