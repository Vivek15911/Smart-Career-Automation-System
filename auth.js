// Authentication functions using Supabase
// Note: Using 'supabaseClient' variable to avoid conflict with global 'supabase' from CDN
let supabaseClient = null;

// Current user state
let currentUser = null;

// Initialize auth state
async function initAuth() {
    console.log('🔄 Initializing authentication...');

    // Wait for Supabase client to be ready with retry
    let retries = 0;
    while (!window.supabaseClient && retries < 10) {
        console.log('⏳ Waiting for Supabase client...');
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
    }

    if (!window.supabaseClient) {
        console.error('❌ Supabase client not initialized after retries');
        alert('Authentication system failed to load. Please refresh the page.');
        return;
    }

    supabaseClient = window.supabaseClient;
    console.log('✅ Supabase client ready');

    // Get current session
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        console.log('✅ User already logged in:', session.user.email);
        currentUser = session.user;
        updateUIForAuthenticatedUser(currentUser);
    } else {
        console.log('ℹ️ No active session, showing login button');
        updateUIForUnauthenticatedUser();

        // Protect tracker page
        if (window.location.pathname.includes('tracker.html')) {
            console.log('🚫 Unauthenticated user on tracker page, redirecting...');
            window.location.href = 'index.html';
        }
    }

    // Listen for auth changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('🔔 Auth state changed:', event);

        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            updateUIForAuthenticatedUser(currentUser);
            console.log('✅ User session active');
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            updateUIForUnauthenticatedUser();

            // Redirect to landing page if on tracker
            if (window.location.pathname.includes('tracker.html')) {
                window.location.href = 'index.html';
            }
        }
    });
}

// Sign in with Google
// Sign in with Google
async function signInWithGoogle() {
    console.log('Sign in with Google clicked');

    if (!supabaseClient) {
        console.error('Supabase not initialized');
        alert('Authentication system not ready. Please refresh the page.');
        return;
    }

    // Show loading overlay
    const overlay = document.getElementById('login-loading-overlay');
    if (overlay) {
        overlay.classList.add('active');
    }

    try {
        console.log('Initiating Google OAuth...');
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.href,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent select_account'
                }
            }
        });

        if (error) {
            console.error('OAuth error:', error);
            throw error;
        }

        console.log('OAuth initiated successfully', data);
    } catch (error) {
        // Hide loading overlay on error
        if (overlay) {
            overlay.classList.remove('active');
        }

        console.error('Error signing in:', error);
        alert('Failed to sign in: ' + error.message + '\n\nMake sure you have configured Google OAuth in Supabase.');
    }
}

// Sign out
async function signOut() {
    console.log('🚪 Sign out initiated');
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        console.log('✅ Supabase sign out successful');
    } catch (error) {
        console.error('Error signing out:', error.message);
        // Even if Supabase fails, we should clear local state
    } finally {
        // Force clear any local storage items related to supabase
        localStorage.clear();
        currentUser = null;
        updateUIForUnauthenticatedUser();

        // Force redirect to home
        window.location.href = 'index.html';
    }
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Check if user is authenticated
function isAuthenticated() {
    return currentUser !== null;
}

// Update UI for authenticated user
function updateUIForAuthenticatedUser(user) {
    // Update navigation buttons
    const loginBtn = document.querySelector('.btn-login');
    const existingUserMenu = document.querySelector('.user-menu');
    const ctaButtons = document.querySelectorAll('.btn-primary');

    // Create new user menu content
    const userMenuHtml = `
        <button class="btn-login user-profile-btn">
            <img src="${user.user_metadata.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.user_metadata.name || user.email)}" 
                 alt="Profile" class="user-avatar">
            <span>${user.user_metadata.name || user.email}</span>
        </button>
        <div class="user-dropdown">
            <div class="user-info">
                <p class="user-name">${user.user_metadata.name || 'User'}</p>
                <p class="user-email">${user.email}</p>
            </div>
            <hr>
            <button id="btn-signout" class="dropdown-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6M11 11L14 8M14 8L11 5M14 8H6" 
                          stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Sign Out
            </button>
        </div>
    `;

    if (existingUserMenu) {
        // If user menu already exists, just update its content or replace it
        // To be safe and simple, let's replace the whole element
        const newUserMenu = document.createElement('div');
        newUserMenu.className = 'user-menu';
        newUserMenu.innerHTML = userMenuHtml;
        existingUserMenu.parentElement.replaceChild(newUserMenu, existingUserMenu);

        // Re-attach listeners to the new menu
        attachDropdownListeners(newUserMenu);
    } else if (loginBtn) {
        // If no user menu but login button exists, replace login button
        const userMenu = document.createElement('div');
        userMenu.className = 'user-menu';
        userMenu.innerHTML = userMenuHtml;
        loginBtn.parentElement.replaceChild(userMenu, loginBtn);

        // Attach listeners
        attachDropdownListeners(userMenu);
    }
}

function attachDropdownListeners(userMenu) {
    const profileBtn = userMenu.querySelector('.user-profile-btn');
    const dropdown = userMenu.querySelector('.user-dropdown');
    const signOutBtn = userMenu.querySelector('#btn-signout');

    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent closing dropdown from interfering
            signOut();
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        dropdown.classList.remove('active');
    });

    // Update CTA buttons to go to tracker
    ctaButtons.forEach(btn => {
        if (btn.textContent.includes('Get Started') || btn.textContent.includes('Start')) {
            btn.onclick = () => window.location.href = 'tracker.html';
        }
    });
}

// Update UI for unauthenticated user
function updateUIForUnauthenticatedUser() {
    console.log('🔄 Updating UI for unauthenticated user');
    const loginBtn = document.querySelector('.btn-login');
    const userMenu = document.querySelector('.user-menu');

    if (userMenu) {
        console.log('📝 Replacing user menu with login button');
        const newLoginBtn = document.createElement('button');
        newLoginBtn.className = 'btn-login';
        newLoginBtn.textContent = 'Login';
        newLoginBtn.onclick = signInWithGoogle;
        userMenu.parentElement.replaceChild(newLoginBtn, userMenu);
        console.log('✅ Login button created and click handler attached');
    } else if (loginBtn) {
        console.log('📝 Attaching click handler to existing login button');
        loginBtn.textContent = 'Login';
        loginBtn.onclick = signInWithGoogle;
        console.log('✅ Click handler attached to login button');
    } else {
        console.error('❌ Login button not found in DOM');
    }
}

// Protect tracker page - redirect if not authenticated
async function protectPage() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = 'index.html';
        return false;
    }

    currentUser = session.user;
    return true;
}

// Export functions
window.initAuth = initAuth;
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;
window.isAuthenticated = isAuthenticated;
window.protectPage = protectPage;
