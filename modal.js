// modal.js - Standalone script for handling UI modals

console.log('✅ modal.js loaded');

// Helper to set default date
function setModalDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('applicationDate');
    if (dateInput) {
        dateInput.value = today;
    }
}

// Show add form modal
window.showAddForm = function () {
    console.log('📖 Opening Add Application Modal (from modal.js)');

    const modal = document.getElementById('applicationModal');
    const form = document.getElementById('applicationForm');
    const modalTitle = document.getElementById('modalTitle');

    if (!modal) {
        console.error('❌ Modal element #applicationModal not found in DOM');
        alert('Error: Application form not found. Please refresh the page.');
        return;
    }

    // specific logic for add form
    if (window.editingId !== undefined) window.editingId = null; // Reset editing global if exists

    if (modalTitle) modalTitle.textContent = 'Add New Application';
    if (form) form.reset();

    setModalDefaultDate();

    // Force display
    modal.classList.add('active');
    modal.style.display = 'flex'; // Direct style override as backup
}

// Close modal
window.closeModal = function () {
    console.log('Closing Modal');
    const modal = document.getElementById('applicationModal');
    const form = document.getElementById('applicationForm');

    if (modal) {
        modal.classList.remove('active');
        modal.style.display = ''; // Clear inline style
    }

    if (form) form.reset();
    if (window.editingId !== undefined) window.editingId = null;
}

// Close on outside click
document.addEventListener('click', function (e) {
    const modal = document.getElementById('applicationModal');
    if (modal && e.target === modal) {
        window.closeModal();
    }
});

// Attach to buttons directly if possible (fallback for onclick in HTML)
document.addEventListener('DOMContentLoaded', function () {
    const addBtns = document.querySelectorAll('.btn-primary');
    addBtns.forEach(btn => {
        if (btn.textContent.includes('Add') || btn.textContent.includes('+')) {
            btn.addEventListener('click', function (e) {
                // If the button also has onclick, this might run twice, which is fine for opening
                if (!btn.getAttribute('onclick')) {
                    window.showAddForm();
                }
            });
        }
    });
});
