/**
 * ProfDash - Express Server
 * Serves the static frontend and handles OAuth for Google Calendar
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Inject Supabase config into HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API endpoint to get Supabase config (for client-side initialization)
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
    });
});

// Google OAuth endpoints (optional - for calendar integration)
app.get('/auth/google', (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(400).json({ error: 'Google OAuth not configured' });
    }

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', process.env.REDIRECT_URI || `http://localhost:${PORT}/auth/google/callback`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    res.redirect(authUrl.toString());
});

app.get('/auth/google/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        return res.send(`
            <script>
                window.opener.postMessage({ type: 'google-auth-error', error: '${error}' }, '*');
                window.close();
            </script>
        `);
    }

    if (!code) {
        return res.status(400).send('No authorization code provided');
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.REDIRECT_URI || `http://localhost:${PORT}/auth/google/callback`,
                grant_type: 'authorization_code'
            })
        });

        const tokens = await tokenResponse.json();

        if (tokens.error) {
            throw new Error(tokens.error_description || tokens.error);
        }

        // Send tokens back to the opener window
        res.send(`
            <script>
                window.opener.postMessage({
                    type: 'google-auth-success',
                    tokens: ${JSON.stringify(tokens)}
                }, '*');
                window.close();
            </script>
        `);
    } catch (err) {
        console.error('OAuth error:', err);
        res.send(`
            <script>
                window.opener.postMessage({ type: 'google-auth-error', error: '${err.message}' }, '*');
                window.close();
            </script>
        `);
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎓 ProfDash - Academic Productivity Dashboard           ║
║                                                           ║
║   Server running at http://localhost:${PORT}                 ║
║                                                           ║
║   Features:                                               ║
║   • Task Management with Multiple Views                   ║
║   • Research Paper Pipeline Tracking                      ║
║   • Grant Management with Burn Rate                       ║
║   • Lab Personnel & Meeting Tracking                      ║
║   • Teaching Dashboard & Evaluations                      ║
║   • Dossier Builder for Promotion Materials               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
