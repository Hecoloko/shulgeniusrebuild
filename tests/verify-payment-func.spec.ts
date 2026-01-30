import { test, expect } from '@playwright/test';

test('Manual process-payment verification', async ({ request }) => {
    const supabaseUrl = "https://eoqkmpxsltresnqdnfmz.supabase.co";
    const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvcWttcHhzbHRyZXNucWRuZm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDgxMjMsImV4cCI6MjA4NTE4NDEyM30.CN_L7TKsNR6E9spIhLjl-gXLui_zDzoRcup1k";
    // const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

    if (!supabaseUrl || !anonKey) {
        throw new Error('Missing env vars');
    }

    // 1. Login to get a token (or use a test user)
    // Actually, let's use the service role key to bypass auth if we modified the function to allow it?
    // No, the function explicitly checks user token.
    // So we MUST login.

    const loginRes = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        headers: {
            'apikey': anonKey,
            'Content-Type': 'application/json',
        },
        data: {
            email: 'heco2k19@gmail.com',
            password: 'Xoxoxo123',
        }
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) {
        // If login fails, try to sign up or assume we need a valid user.
        console.log('Login failed', loginData);
        // Try to create a dummy user via admin API?
        // Skipped for now, assuming this user exists from previous context.
    }
    const token = loginData.access_token;
    expect(token).toBeTruthy();

    // 2. Call process-payment
    const response = await request.post(`${supabaseUrl}/functions/v1/process-payment`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        data: {
            subscriptionId: '95d1b6b6-fb71-4c62-9608-ccc9b5479697',
            memberId: '6768a484-b749-4adb-846c-72635aea48bb',
            organizationId: 'e54e2a1d-6695-477a-a0f8-4afa74a0906c',
            amount: 1,
            description: 'Test via Playwright'
        }
    });

    const responseBody = await response.text();
    console.log('Response Status:', response.status());
    console.log('Response Body:', responseBody);

    expect(response.status()).toBe(200);

    try {
        JSON.parse(responseBody);
    } catch (e) {
        throw new Error('Response is not valid JSON: ' + responseBody);
    }
});
