// Supabase Configuration
const SUPABASE_URL = 'https://icrxyrafbosojimbfzin.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljcnh5cmFmYm9zb2ppbWJmemluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDE5MzEsImV4cCI6MjA4NjI3NzkzMX0.qxppJRf7b7dTy63F2RYrTPYEA7ql6ylUmWof39SlLmM';

// Wait for Supabase library to load, then initialize client
(function initSupabase() {
    // Check if supabase is available
    if (typeof supabase === 'undefined') {
        console.error('Supabase library not loaded. Make sure the CDN script is included.');
        return;
    }

    // Initialize Supabase client using the global supabase object from CDN
    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Export for use in other files
    window.supabaseClient = supabaseClient;

    console.log('✅ Supabase client initialized successfully');
})();
