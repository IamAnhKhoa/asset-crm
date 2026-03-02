const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
});

function setEnv(name, value) {
    if (!value) return;
    try { execSync('npx vercel env rm ' + name + ' production -y', { stdio: 'ignore' }); } catch (e) { }
    try {
        execSync('npx vercel env add ' + name + ' production', { input: value });
        console.log('Set ' + name + ' successfully');
    } catch (e) {
        console.error('Failed to set ' + name);
    }
}

// Push all gathered variables
Object.entries(env).forEach(([k, v]) => {
    if (k === 'NEXTAUTH_URL') {
        // Force production URL
        setEnv(k, 'https://qlts-tah.vercel.app');
    } else {
        setEnv(k, v);
    }
});

console.log('Done pushing environment variables.');
