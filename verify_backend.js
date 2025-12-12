const payload = {
    date: '2023-10-27',
    men: 10,
    women: 10,
    children: 0,
    visitors: 0,
    notes: 'Test note'
};

async function test() {
    try {
        console.log('Sending payload:', payload);
        const res = await fetch('http://localhost:5000/api/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP error! status: ${res.status}, body: ${errorText}`);
        }

        const data = await res.json();
        console.log('Success:', data);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
