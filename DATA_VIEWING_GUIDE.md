# 📊 Where to View Your Data in Supabase

## 🔐 User Login Data

### View All Users Who Have Logged In:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **icrxyrafbosojimbfzin**
3. Navigate to **Authentication** → **Users** (left sidebar)

**What you'll see:**
- ✅ **Email** - User's Google email
- ✅ **Name** - User's full name from Google
- ✅ **Provider** - Shows "google"
- ✅ **Created At** - When they first signed up
- ✅ **Last Sign In** - Most recent login time
- ✅ **User ID** - Unique identifier (UUID)

### User Details:
Click on any user to see:
- Profile picture (avatar_url)
- Full metadata from Google
- Authentication history
- Sessions

---

## 📝 Application Data

### View All Job Applications:

1. In Supabase Dashboard, navigate to **Table Editor** (left sidebar)
2. Select the **applications** table

**What you'll see:**
- ✅ **id** - Unique application ID
- ✅ **user_id** - Which user owns this application
- ✅ **company_name** - Company name
- ✅ **job_title** - Job position
- ✅ **application_date** - When they applied
- ✅ **status** - Current status (Applied/Interview/Offer/Rejected/On Hold)
- ✅ **location** - Job location
- ✅ **salary** - Salary information
- ✅ **job_url** - Link to job posting
- ✅ **notes** - User's notes
- ✅ **created_at** - When record was created
- ✅ **updated_at** - Last modification time

### Filter by User:
To see applications for a specific user:
1. Click the **Filter** button
2. Select **user_id**
3. Choose **equals**
4. Paste the user's UUID (from Authentication → Users)

---

## 📈 Quick Stats & Queries

### Run SQL Queries:

Go to **SQL Editor** and run queries like:

```sql
-- Count total users
SELECT COUNT(*) as total_users FROM auth.users;

-- Count applications per user
SELECT 
  u.email,
  u.raw_user_meta_data->>'name' as name,
  COUNT(a.id) as application_count
FROM auth.users u
LEFT JOIN applications a ON u.id = a.user_id
GROUP BY u.id, u.email, u.raw_user_meta_data
ORDER BY application_count DESC;

-- Recent applications (last 7 days)
SELECT 
  u.email,
  a.company_name,
  a.job_title,
  a.application_date,
  a.status
FROM applications a
JOIN auth.users u ON a.user_id = u.id
WHERE a.created_at >= NOW() - INTERVAL '7 days'
ORDER BY a.created_at DESC;

-- Applications by status
SELECT 
  status,
  COUNT(*) as count
FROM applications
GROUP BY status
ORDER BY count DESC;
```

---

## 🔍 User Profile Information

### Where User Name & Email are Stored:

**In the Database:**
- User's **email** and **name** are stored in `auth.users` table
- Accessed via `user.email` and `user.user_metadata.name`

**In Your Application:**
When a user logs in, you can access:
```javascript
const user = session.user;
console.log(user.email);              // Email address
console.log(user.user_metadata.name); // Full name from Google
console.log(user.user_metadata.avatar_url); // Profile picture
```

**Custom Display Name:**
Currently, the app uses the name from Google. To allow custom names:
1. Add a `profiles` table in Supabase
2. Store custom display names there
3. Link via `user_id`

---

## 📊 Dashboard Views

### Quick Access Links:

1. **All Users**: https://supabase.com/dashboard/project/icrxyrafbosojimbfzin/auth/users
2. **Applications Table**: https://supabase.com/dashboard/project/icrxyrafbosojimbfzin/editor (select `applications`)
3. **SQL Editor**: https://supabase.com/dashboard/project/icrxyrafbosojimbfzin/sql
4. **API Logs**: https://supabase.com/dashboard/project/icrxyrafbosojimbfzin/logs/explorer

---

## 🎯 Common Use Cases

### See who logged in today:
**Authentication → Users** → Sort by "Last Sign In"

### See all applications for a user:
**Table Editor → applications** → Filter by user_id

### Export data:
**Table Editor → applications** → Click **Export** → Download as CSV

### View real-time activity:
**Logs → Explorer** → See all database queries and auth events

---

## 💡 Pro Tips

1. **Bookmark the Users page** for quick access to login data
2. **Use SQL Editor** for complex queries and reports
3. **Enable Email Notifications** in Supabase for new user signups
4. **Set up Database Webhooks** to get notified of new applications
5. **Use Supabase Studio** (local) for development

---

**Your data is now in the cloud and accessible from anywhere!** 🎉
