
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/)[1];
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/)[1];
const client = createClient(url, key);

(async () => {
    try {
        const { data } = await client.from('assets').select('id, name, status, specific_location');
        let withOldLoc = 0;
        let withStatusHong = 0;
        for (const a of data) {
            if (a.specific_location && a.specific_location.includes('oldLocation')) withOldLoc++;
            if (a.status === 'H?ng') withStatusHong++;
        }
        console.log('Total:', data.length);
        console.log('OldLoc:', withOldLoc);
        console.log('Hong:', withStatusHong);
    } catch (e) {
        console.error(e.message);
    }
})();

