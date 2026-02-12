// Supabase client and user state
let appSupabase = null;
let appCurrentUser = null;
let applications = [];
let editingId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function () {
    // Wait for Supabase client
    if (!window.supabaseClient) {
        console.error('Supabase client not initialized');
        return;
    }

    appSupabase = window.supabaseClient;

    // Get current user
    const { data: { session } } = await appSupabase.auth.getSession();
    if (session) {
        appCurrentUser = session.user;
        await loadApplications();
        updateDashboard();
        initializeCharts();
        renderCalendar();
    }

    setDefaultDate();

    // Subscribe to realtime changes
    if (appCurrentUser) {
        setupRealtimeSubscription();
    }
});

// Setup Realtime Subscription
function setupRealtimeSubscription() {
    appSupabase
        .channel('public:applications')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, payload => {
            console.log('Change received!', payload);
            loadApplications(); // Refresh data
            updateDashboard(); // Refresh stats
        })
        .subscribe();
}

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('applicationDate').value = today;
}

// Show add form modal
function showAddForm() {
    console.log('Opening add form modal');
    editingId = null;
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('applicationForm');
    const modal = document.getElementById('applicationModal');

    if (modalTitle) modalTitle.textContent = 'Add New Application';
    if (form) form.reset();
    setDefaultDate();

    if (modal) {
        modal.classList.add('active');
    } else {
        console.error('Modal element not found!');
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('applicationModal');
    const form = document.getElementById('applicationForm');

    if (modal) modal.classList.remove('active');
    if (form) form.reset();
    editingId = null;
}

// Expose functions globally
window.showAddForm = showAddForm;
window.closeModal = closeModal;
window.editApplication = editApplication;
window.deleteApplication = deleteApplication;

// Handle form submission
// Handle form submission
document.getElementById('applicationForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    console.log('📝 Form submission triggered');

    if (!appCurrentUser) {
        console.error('❌ No current user found during form submission');
        alert('Please sign in to save applications');
        return;
    }

    console.log('👤 Current user:', appCurrentUser.id);

    const formData = {
        user_id: appCurrentUser.id,
        company_name: document.getElementById('companyName').value,
        job_title: document.getElementById('jobTitle').value,
        job_description: document.getElementById('jobDescription').value,
        application_date: document.getElementById('applicationDate').value,
        source: document.getElementById('source').value,
        location: document.getElementById('location').value,
        status: document.getElementById('status').value,
        hr_name: document.getElementById('hrName').value,
        hr_email: document.getElementById('hrEmail').value,
        salary: document.getElementById('salary').value,
        job_url: document.getElementById('jobUrl').value
    };

    console.log('📦 Form data prepared:', formData);

    // Handle File Upload
    const fileInput = document.getElementById('resumeUsed');
    const file = fileInput.files[0];

    try {
        if (file) {
            console.log('Bg_> Uploading resume...');
            const fileExt = file.name.split('.').pop();
            const fileName = `${appCurrentUser.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await appSupabase.storage
                .from('resumes')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = appSupabase.storage
                .from('resumes')
                .getPublicUrl(filePath);

            formData.resume_url = publicUrl;
            console.log('✅ Resume uploaded, URL:', publicUrl);
        } else if (editingId) {
            // Keep existing resume URL if editing and no new file selected
            const existingApp = applications.find(a => a.id === editingId);
            if (existingApp && existingApp.resume_url) {
                formData.resume_url = existingApp.resume_url;
            }
        }

        let resultError = null;

        if (editingId) {
            // Update existing application
            console.log('🔄 Updating application:', editingId);
            const { error } = await appSupabase
                .from('applications')
                .update(formData)
                .eq('id', editingId)
                .eq('user_id', appCurrentUser.id);
            resultError = error;
        } else {
            // Insert new application
            console.log('➕ Inserting new application');
            const { error } = await appSupabase
                .from('applications')
                .insert([formData]);
            resultError = error;
        }

        if (resultError) {
            console.error('❌ Supabase error:', resultError);
            throw resultError;
        }

        console.log('✅ Application saved successfully');

        // Refresh everything
        await loadApplications();
        updateDashboard();
        updateCharts();
        renderCalendar();

        // Use window.closeModal if available, else local
        if (window.closeModal) window.closeModal();
        else closeModal();

        console.log('✨ UI refreshed and modal closed');

    } catch (error) {
        console.error('❌ Error saving application:', error);
        alert('Failed to save application: ' + error.message);
    }
});

// Load applications from Supabase
async function loadApplications() {
    console.log('📥 Loading applications...');
    if (!appCurrentUser) {
        console.log('⚠️ No current user in loadApplications');
        return;
    }

    const container = document.getElementById('applicationsList');

    try {
        const { data, error } = await appSupabase
            .from('applications')
            .select('*')
            .eq('user_id', appCurrentUser.id)
            .order('application_date', { ascending: false });

        if (error) throw error;

        console.log(`✅ Loaded ${data ? data.length : 0} applications`);
        applications = data || [];

        if (applications.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                        <rect x="20" y="30" width="80" height="70" rx="4" stroke="#ccc" stroke-width="3"/>
                        <path d="M35 50H85M35 65H85M35 80H65" stroke="#ccc" stroke-width="3" stroke-linecap="round"/>
                    </svg>
                    <h3>No Applications Yet</h3>
                    <p>Start tracking your job applications by adding your first one!</p>
                    <button class="btn-primary" onclick="showAddForm()">+ Add Your First Application</button>
                </div>
            `;
            return;
        }

        container.innerHTML = applications.map(app => `
            <div class="application-card">
                <div class="card-header">
                    <div class="header-main">
                        <h3>${app.company_name}</h3>
                        <span class="role">${app.job_title}</span>
                    </div>
                    <span class="status-badge status-${app.status.toLowerCase().replace(' ', '-').replace('scheduled', '')}">${app.status}</span>
                </div>
                
                <div class="card-body">
                    <div class="info-row">
                        <div class="info-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            <span>${new Date(app.application_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        ${app.location ? `
                        <div class="info-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            <span>${app.location}</span>
                        </div>` : ''}
                    </div>
                    
                    <div class="info-row">
                        ${app.salary ? `
                        <div class="info-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                            <span>${app.salary}</span>
                        </div>` : ''}
                        
                        ${app.job_url ? `
                        <div class="info-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                            <a href="${app.job_url}" target="_blank">Job Link</a>
                        </div>` : ''}
                    </div>
                </div>
                
                <div class="card-footer">
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" onclick="editApplication(${app.id})">Edit</button>
                        <button class="btn-action btn-delete" onclick="deleteApplication(${app.id})">Delete</button>
                        ${app.job_url ? `<a href="${app.job_url}" target="_blank" class="btn-action btn-view">View Job</a>` : ''}
                    </div>
                    ${app.resume_url ? `<a href="${app.resume_url}" target="_blank" class="resume-link">Resume</a>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading applications:', error);
        container.innerHTML = `
            <div class="empty-state">
                <h3>Error Loading Applications</h3>
                <p>${error.message}</p>
                <button class="btn-primary" onclick="loadApplications()">Retry</button>
            </div>
        `;
    }
}

// Edit application
async function editApplication(id) {
    editingId = id;
    const app = applications.find(a => a.id === id);

    if (!app) return;

    document.getElementById('modalTitle').textContent = 'Edit Application';
    document.getElementById('companyName').value = app.company_name;
    document.getElementById('jobTitle').value = app.job_title;
    document.getElementById('jobDescription').value = app.job_description || '';
    document.getElementById('applicationDate').value = app.application_date;
    document.getElementById('source').value = app.source;
    document.getElementById('location').value = app.location || '';
    document.getElementById('status').value = app.status;
    document.getElementById('hrName').value = app.hr_name || '';
    document.getElementById('hrEmail').value = app.hr_email || '';
    document.getElementById('salary').value = app.salary || '';
    document.getElementById('jobUrl').value = app.job_url || '';

    document.getElementById('applicationModal').classList.add('active');
}

// Delete application
async function deleteApplication(id) {
    if (!confirm('Are you sure you want to delete this application?')) return;

    try {
        const { error } = await appSupabase
            .from('applications')
            .delete()
            .eq('id', id)
            .eq('user_id', appCurrentUser.id);

        if (error) throw error;

        await loadApplications();
        updateDashboard();
        updateCharts();
        renderCalendar();
    } catch (error) {
        console.error('Error deleting application:', error);
        alert('Failed to delete application: ' + error.message);
    }
}

// Update dashboard metrics
function updateDashboard() {
    const total = applications.length;
    const interviews = applications.filter(a => a.status === 'Interview Scheduled').length;
    const offers = applications.filter(a => a.status === 'Offer').length;
    const rejections = applications.filter(a => a.status === 'Rejected').length;

    // Calculate follow-ups (applications older than 7 days with status "Applied")
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const followUps = applications.filter(a =>
        a.status === 'Applied' && new Date(a.application_date) < weekAgo
    ).length;

    document.getElementById('totalApplications').textContent = total;
    document.getElementById('totalInterviews').textContent = interviews;
    document.getElementById('totalOffers').textContent = offers;
    document.getElementById('totalRejections').textContent = rejections;
    document.getElementById('followUpsPending').textContent = followUps;
}

// Chart instances
let weeklyChart = null;
let statusChart = null;

// Initialize charts
function initializeCharts() {
    // Weekly Applications Chart
    const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');
    weeklyChart = new Chart(weeklyCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Applications',
                data: [],
                borderColor: '#1976D2',
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });

    // Status Pie Chart
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#1976D2',
                    '#4CAF50',
                    '#FF9800',
                    '#F44336',
                    '#9C27B0'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    updateCharts();
}

// Update charts with data
function updateCharts() {
    // Weekly applications data
    const last7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
    }

    const weeklyData = last7Days.map(date => {
        return applications.filter(app => app.application_date === date).length;
    });

    const weeklyLabels = last7Days.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { weekday: 'short' });
    });

    weeklyChart.data.labels = weeklyLabels;
    weeklyChart.data.datasets[0].data = weeklyData;
    weeklyChart.update();

    // Status distribution data
    const statusCounts = {
        'Applied': applications.filter(a => a.status === 'Applied').length,
        'Interview Scheduled': applications.filter(a => a.status === 'Interview Scheduled').length,
        'Offer': applications.filter(a => a.status === 'Offer').length,
        'Rejected': applications.filter(a => a.status === 'Rejected').length,
        'On Hold': applications.filter(a => a.status === 'On Hold').length
    };

    const statusLabels = Object.keys(statusCounts).filter(key => statusCounts[key] > 0);
    const statusData = statusLabels.map(label => statusCounts[label]);

    statusChart.data.labels = statusLabels;
    statusChart.data.datasets[0].data = statusData;
    statusChart.update();
}

// Render calendar
function renderCalendar() {
    const calendar = document.getElementById('calendarView');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let calendarHTML = dayHeaders.map(day =>
        `<div class="calendar-day header">${day}</div>`
    ).join('');

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day"></div>';
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasFollowUp = applications.some(app =>
            app.status === 'Applied' &&
            new Date(app.application_date).toISOString().split('T')[0] === dateStr &&
            new Date(app.application_date) < new Date(today.setDate(today.getDate() - 7))
        );

        calendarHTML += `
            <div class="calendar-day ${hasFollowUp ? 'has-followup' : ''}">
                <span class="calendar-day-number">${day}</span>
                ${hasFollowUp ? '<span class="calendar-day-indicator"></span>' : ''}
            </div>
        `;
    }

    calendar.innerHTML = calendarHTML;
}

// Close modal when clicking outside
document.getElementById('applicationModal').addEventListener('click', function (e) {
    if (e.target === this) {
        closeModal();
    }
});
