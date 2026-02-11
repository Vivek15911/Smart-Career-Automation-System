# Google Authentication Setup Guide

## 🚀 Quick Setup Steps

### 1. Supabase Configuration (Already Done ✅)
Your Supabase credentials are already configured in `supabase-config.js`:
- **Project URL:** `https://icrxyrafbosojimbfzin.supabase.co`
- **Anon Key:** Configured ✅

### 2. Create Database Table

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Copy the entire contents of `database-schema.sql`
5. Paste it into the SQL Editor
6. Click **Run** to execute

This will create:
- `applications` table with all required fields
- Row Level Security (RLS) policies
- Indexes for performance
- Auto-update triggers

### 3. Enable Google OAuth Provider

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Toggle **Enable Sign in with Google** to ON
4. You'll see a **Callback URL** like:
   ```
   https://icrxyrafbosojimbfzin.supabase.co/auth/v1/callback
   ```
5. Keep this tab open - you'll need this URL for Google Cloud Console

### 4. Configure Google Cloud Console

#### A. Create OAuth 2.0 Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - User Type: **External**
   - App name: **Job Application Tracker**
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue** through the remaining steps

#### B. Create OAuth Client ID
1. Application type: **Web application**
2. Name: **Job Tracker Web Client**
3. **Authorized JavaScript origins:**
   ```
   http://localhost:5500
   http://127.0.0.1:5500
   ```
   *(Add your actual local server port if different)*

4. **Authorized redirect URIs:**
   ```
   https://icrxyrafbosojimbfzin.supabase.co/auth/v1/callback
   ```
   *(This is the callback URL from Supabase)*

5. Click **CREATE**
6. Copy the **Client ID** and **Client Secret**

#### C. Add Credentials to Supabase
1. Go back to Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Paste your **Client ID** from Google
3. Paste your **Client Secret** from Google
4. Click **Save**

### 5. Test the Authentication

1. Open your project in a browser (e.g., `http://localhost:5500/index.html`)
2. Click the **Login** button
3. You should be redirected to Google sign-in
4. After signing in, you'll be redirected back to the tracker page
5. Your profile should appear in the navigation

---

## 📁 Files Created

- ✅ `supabase-config.js` - Supabase client initialization
- ✅ `auth.js` - Authentication logic (Google sign-in/out, session management)
- ✅ `auth.css` - Authentication UI styles
- ✅ `database-schema.sql` - Database table and security policies
- ✅ `index.html` - Updated with auth scripts
- ✅ `tracker.html` - Updated with auth protection

---

## 🔐 Security Features

### Row Level Security (RLS)
- Users can only see their own applications
- All CRUD operations are restricted to the authenticated user
- Data is completely isolated between users

### Authentication Flow
1. **Unauthenticated users** → Redirected to landing page
2. **Click Login** → Google OAuth popup
3. **After sign-in** → Redirected to tracker page
4. **Session persists** → No need to login again
5. **Sign out** → Clears session and redirects to landing page

---

## 🎯 Next Steps

### For Production Deployment:
1. Add your production domain to Google OAuth:
   - **JavaScript origins:** `https://yourdomain.com`
   - **Redirect URI:** Same Supabase callback URL

2. Update Supabase authentication settings:
   - Set site URL to your production domain
   - Configure email templates if needed

### Optional Enhancements:
- Add email/password authentication
- Enable social logins (GitHub, Facebook, etc.)
- Add user profile management
- Implement email notifications

---

## 🐛 Troubleshooting

### "Redirect URI mismatch" error
- Verify the redirect URI in Google Cloud Console exactly matches the Supabase callback URL
- Make sure there are no trailing slashes

### "Origin not allowed" error
- Add your local server URL to Authorized JavaScript origins in Google Cloud Console
- Check the port number matches your local server

### Not redirecting after login
- Clear browser cache and cookies
- Check browser console for errors
- Verify Supabase credentials are correct in `supabase-config.js`

### Applications not saving
- Run the `database-schema.sql` in Supabase SQL Editor
- Check that RLS policies are enabled
- Verify you're signed in (check browser console)

---

## 📞 Support

If you encounter issues:
1. Check browser console for error messages
2. Verify all credentials are correct
3. Ensure database schema is created
4. Test with a fresh browser session (incognito mode)

---

**Your authentication system is ready! Just complete the Google OAuth setup and run the database schema.** 🎉
