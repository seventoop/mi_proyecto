const crypto = require('crypto');

const API_URL = 'http://localhost:3000/api/webhooks';
const META_VERIFY_TOKEN = 'test_token_123';
const META_WEBHOOK_SECRET = 'test_secret_456';
const TIKTOK_WEBHOOK_SECRET = 'tiktok_test_789';
const WHATSAPP_VERIFY_TOKEN = 'wa_test_000';
const WHATSAPP_WEBHOOK_SECRET = 'wa_secret_111';

// Set environment variables for the local server if running in same process, 
// but here we assume the server is already running with these (or we skip actual verification if they don't match).
// For the test to pass, the server needs to have these secrets in its .env

async function testMetaVerification() {
    console.log('\n--- Test 1: Meta Verification (GET) ---');
    try {
        const challenge = '123456789';
        const url = new URL(`${API_URL}/meta`);
        url.searchParams.append('hub.mode', 'subscribe');
        url.searchParams.append('hub.verify_token', META_VERIFY_TOKEN);
        url.searchParams.append('hub.challenge', challenge);

        const res = await fetch(url.toString());
        const text = await res.text();
        console.log('✅ Correct Token:', res.status === 200 && text === challenge ? 'PASS' : `FAIL (Status: ${res.status}, Body: ${text})`);

        const urlWrong = new URL(`${API_URL}/meta`);
        urlWrong.searchParams.append('hub.mode', 'subscribe');
        urlWrong.searchParams.append('hub.verify_token', 'wrong_token');
        urlWrong.searchParams.append('hub.challenge', challenge);

        const resWrong = await fetch(urlWrong.toString());
        console.log('✅ Wrong Token:', resWrong.status === 403 ? 'PASS' : `FAIL (${resWrong.status})`);
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

async function testMetaLeadPost() {
    console.log('\n--- Test 2: Meta Lead Ingestion (POST) ---');
    const payload = {
        object: 'page',
        entry: [{
            changes: [{
                field: 'leadgen',
                value: {
                    leadgen_id: 'test_lead_' + Date.now(),
                    ad_id: 'ad_test_' + Math.random(),
                    campaign_id: 'camp_test_456',
                    page_id: 'page_test_789',
                    form_id: 'form_test_000'
                }
            }]
        }]
    };

    const body = JSON.stringify(payload);
    const signature = 'sha256=' + crypto.createHmac('sha256', META_WEBHOOK_SECRET).update(body).digest('hex');

    try {
        const res = await fetch(`${API_URL}/meta`, {
            method: 'POST',
            headers: {
                'x-hub-signature-256': signature,
                'Content-Type': 'application/json'
            },
            body: body
        });
        const data = await res.json();
        console.log('✅ Ingestion:', res.status === 200 ? 'PASS' : `FAIL (Status: ${res.status}, Body: ${JSON.stringify(data)})`);
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

async function testMetaDeduplication() {
    console.log('\n--- Test 3: Meta Deduplication ---');
    const adId = 'dedup_test_' + Date.now();
    const payload = {
        object: 'page',
        entry: [{
            changes: [{
                field: 'leadgen',
                value: {
                    leadgen_id: 'lead_' + Date.now(),
                    ad_id: adId
                }
            }]
        }]
    };

    const body = JSON.stringify(payload);
    const signature = 'sha256=' + crypto.createHmac('sha256', META_WEBHOOK_SECRET).update(body).digest('hex');

    try {
        await fetch(`${API_URL}/meta`, {
            method: 'POST',
            headers: {
                'x-hub-signature-256': signature,
                'Content-Type': 'application/json'
            },
            body: body
        });
        const res2 = await fetch(`${API_URL}/meta`, {
            method: 'POST',
            headers: {
                'x-hub-signature-256': signature,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...payload, entry: [{ ...payload.entry[0], changes: [{ ...payload.entry[0].changes[0], value: { ...payload.entry[0].changes[0].value, leadgen_id: 'lead_dup_' + Date.now() } }] }] })
        });
        console.log('✅ Deduplication (Returning 200):', res2.status === 200 ? 'PASS' : 'FAIL');
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

async function testTikTokLeadPost() {
    console.log('\n--- Test 4: TikTok Lead Ingestion (POST) ---');
    const payload = {
        event: 'lead_form_submit',
        advertiser_id: 'tiktok_adv_123',
        ad_id: 'tiktok_ad_' + Date.now(),
        campaign_id: 'tiktok_camp_456',
        lead_data: {
            answers: [
                { field_id: 'full_name', value: 'Maria TikTok' },
                { field_id: 'email', value: 'maria@test.com' },
                { field_id: 'phone_number', value: '+5491111111111' }
            ]
        }
    };

    const body = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', TIKTOK_WEBHOOK_SECRET).update(body).digest('hex');

    try {
        const res = await fetch(`${API_URL}/tiktok`, {
            method: 'POST',
            headers: {
                'x-tiktok-signature': signature,
                'Content-Type': 'application/json'
            },
            body: body
        });
        const data = await res.json();
        console.log('✅ Ingestion:', res.status === 200 ? 'PASS' : `FAIL (Status: ${res.status}, Body: ${JSON.stringify(data)})`);
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

async function testWhatsAppInbound() {
    console.log('\n--- Test 5: WhatsApp Inbound ---');
    const tel = '54911' + Math.floor(Math.random() * 10000000);
    const payload = {
        telefono: tel,
        mensaje: 'Hola, quiero info del proyecto',
        nombre: 'User Prueba WA'
    };

    try {
        const res = await fetch(`${API_URL}/whatsapp`, {
            method: 'POST',
            headers: {
                'x-wa-signature': WHATSAPP_WEBHOOK_SECRET,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        console.log('✅ New Lead:', res.status === 200 ? 'PASS' : 'FAIL');

        const res2 = await fetch(`${API_URL}/whatsapp`, {
            method: 'POST',
            headers: {
                'x-wa-signature': WHATSAPP_WEBHOOK_SECRET,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        console.log('✅ Existing Lead (No Duplicate):', res2.status === 200 ? 'PASS' : 'FAIL');
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

async function runAll() {
    console.log('🚀 STARTING WEBHOOK TESTS...');
    await testMetaVerification();
    await testMetaLeadPost();
    await testMetaDeduplication();
    await testTikTokLeadPost();
    await testWhatsAppInbound();
    console.log('\n🏁 TESTS FINISHED.');
}

runAll();
