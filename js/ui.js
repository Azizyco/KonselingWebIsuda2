export function toast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

// Initialize mobile navigation with hamburger menu
export function initMobileNav() {
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const mainNav = document.querySelector('.main-nav');
    
    if (mobileNavToggle && mainNav) {
        mobileNavToggle.addEventListener('click', () => {
            mainNav.classList.toggle('show');
            mobileNavToggle.classList.toggle('active');
            
            // Toggle aria-expanded for accessibility
            const expanded = mainNav.classList.contains('show');
            mobileNavToggle.setAttribute('aria-expanded', expanded);
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mainNav.contains(e.target) && !mobileNavToggle.contains(e.target) && mainNav.classList.contains('show')) {
                mainNav.classList.remove('show');
                mobileNavToggle.classList.remove('active');
                mobileNavToggle.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Close menu when clicking on a link
        const navLinks = mainNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('show');
                mobileNavToggle.classList.remove('active');
                mobileNavToggle.setAttribute('aria-expanded', 'false');
            });
        });
        
        // Set initial aria-expanded attribute
        mobileNavToggle.setAttribute('aria-expanded', 'false');
    }
}

export function skeletonList(container, count, template) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.innerHTML = template;
        container.appendChild(skeleton.firstElementChild);
    }
}

export function confirmDialog(text) {
    return new Promise((resolve) => {
        const confirmed = window.confirm(text);
        resolve(confirmed);
    });
}

export function setActiveNavLink() {
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname;

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}

export function renderAuthButtons(user) {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;

    if (user) {
        authContainer.innerHTML = `
            <a href="/profile.html" class="btn">Profil</a>
        `;
    } else {
        authContainer.innerHTML = `
            <a href="/login.html" class="btn">Masuk</a>
            <a href="/register.html" class="btn btn-primary">Daftar</a>
        `;
    }
}

export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('show');
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
}

export function setupModal(modalId, openTriggers, closeTriggers) {
    openTriggers.forEach(trigger => {
        if(trigger) trigger.addEventListener('click', () => showModal(modalId));
    });
    closeTriggers.forEach(trigger => {
        if(trigger) trigger.addEventListener('click', () => hideModal(modalId));
    });
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modalId);
            }
        });
    }
}
