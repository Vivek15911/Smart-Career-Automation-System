// Supabase client and user state
let supabase = null;
let currentUser = null;
let applications = [];
let editingId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function () {
    // Wait for Supabase client
    if (!window.supabaseClient) {
        console.error('Supabase client not initialized');
        return;
    }

    supabase = window.supabaseClient;

    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await loadApplications();
        updateDashboard();
        initializeCharts();
        renderCalendar();
    }

    setDefaultDate();

    // Subscribe to realtime changes
    if (currentUser) {
        setupRealtimeSubscription();
    }
});

// Setup Realtime Subscription
function setupRealtimeSubscription() {
    supabase
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
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Add New Application';
    document.getElementById('applicationForm').reset();
    setDefaultDate();
    document.getElementById('applicationModal').classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('applicationModal').classList.remove('active');
    document.getElementById('applicationForm').reset();
    editingId = null;
}

// Handle form submission
document.getElementById('applicationForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!currentUser) {
        alert('Please sign in to save applications');
        return;
    }

    const formData = {
        user_id: currentUser.id,
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
        job_url: document.getElementById('jobUrl').value,
        notes: document.getElementById('notes').value
    };

    // Handle File Upload
    const fileInput = document.getElementById('resumeUsed');
    const file = fileInput.files[0];

    try {
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('resumes')
                .getPublicUrl(filePath);

            formData.resume_url = publicUrl;
        } else if (editingId) {
            // Keep existing resume URL if editing and no new file selected
            const existingApp = applications.find(a => a.id === editingId);
            if (existingApp && existingApp.resume_url) {
                formData.resume_url = existingApp.resume_url;
            }
        }

        if (editingId) {
            // Update existing application
            const { error } = await supabase
                .from('applications')
                .update(formData)
                .eq('id', editingId)
                .eq('user_id', currentUser.id);

            if (error) throw error;
        } else {
            // Insert new application
            const { error } = await supabase
                .from('applications')
                .insert([formData]);

            if (error) throw error;
        }

        await loadApplications();
        updateDashboard();
        updateCharts();
        renderCalendar();
        closeModal();
    } catch (error) {
        console.error('Error saving application:', error);
        alert('Failed to save application: ' + error.message);
    }
});

// Load applications from Supabase
async function loadApplications() {
    if (!currentUser) return;

    const container = document.getElementById('applicationsList');

    try {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('application_date', { ascending: false });

        if (error) throw error;

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
            <div class="application-item">
                <div class="application-header">
                    <div class="application-title">
                        <h3>${app.company_name}</h3>
                        <p>${app.job_title}</p>
                    </div>
                    <span class="application-status status-${app.status.toLowerCase().replace(' ', '-').replace('scheduled', '')}">${app.status}</span>
                </div>
                
                <div class="application-details">
                    <div class="detail-item">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="2" y="3" width="12" height="11" rx="1" stroke="currentColor" stroke-width="1.5"/>
                            <path d="M2 6H14M5 3V2M11 3V2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                        <span class="value">${new Date(app.application_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    ${app.location ? `
                    <div class="detail-item">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 2C5.79 2 4 3.79 4 6C4 9 8 14 8 14C8 14 12 9 12 6C12 3.79 10.21 2 8 2Z" stroke="currentColor" stroke-width="1.5"/>
                            <circle cx="8" cy="6" r="1.5" stroke="currentColor" stroke-width="1.5"/>
                        </svg>
                        <span class="value">${app.location}</span>
                    </div>
                    ` : ''}
                    ${app.salary ? `
                    <div class="detail-item">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                            <path d="M8 5V11M6 7H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                        <span class="value">${app.salary}</span>
                    </div>
                    ` : ''}
                    ${app.job_url ? `
                    <div class="detail-item">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M7 3H3V13H13V9M10 2H14V6M14 2L7 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="value">Job Link</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="application-actions">
                    ${app.resume_url ? `
                    <a href="${app.resume_url}" target="_blank" class="btn-download-resume" title="Download Resume">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M8 12L8 4M8 12L11 9M8 12L5 9M3 14H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Resume
                    </a>
                    ` : ''}
                    <button class="btn-edit" onclick="editApplication(${app.id})">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M11.5 2L14 4.5L5 13.5L2 14L2.5 11L11.5 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Edit
                    </button>
                    <button class="btn-delete" onclick="deleteApplication(${app.id})">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M3 4H13M5 4V3H11V4M6 7V11M10 7V11M4 4L5 13H11L12 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Delete
                    </button>
                    ${app.job_url ? `
                    <a href="${app.job_url}" target="_blank" class="btn-view-job">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M7 3H3V13H13V9M10 2H14V6M14 2L7 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        View Job
                    </a>
                    ` : ''}
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
    document.getElementById('notes').value = app.notes || '';

    document.getElementById('applicationModal').classList.add('active');
}

// Delete application
async function deleteApplication(id) {
    if (!confirm('Are you sure you want to delete this application?')) return;

    try {
        const { error } = await supabase
            .from('applications')
            .delete()
            .eq('id', id)
            .eq('user_id', currentUser.id);

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
