import { supabase } from './supa.js';
import { getCurrentUser, getUserProfile } from './auth.js';
import { renderAuthButtons, toast } from './ui.js';

// Initialize mobile navigation with hamburger menu
function initMobileNav() {
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

document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    renderAuthButtons(user);
    
    loadLatestArticles();
    loadLatestMaterials();
    loadHeroSettings();

    if (user) {
        setupNotificationToggle(user);
    }
    
    // Initialize mobile navigation
    initMobileNav();
});

async function loadHeroSettings() {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'hero');

    if (data && data.length > 0) {
        const heroSettings = data[0].value;
        document.getElementById('hero-title').textContent = heroSettings.title || 'Portal Konseling & Materi Siswa';
        document.getElementById('hero-subtitle').textContent = heroSettings.subtitle || 'Temukan sumber daya, panduan karir, dan dukungan konseling di satu tempat.';
    }
}

async function loadLatestArticles() {
    const container = document.getElementById('latest-articles');
    const { data, error } = await supabase
        .from('articles')
        .select('id, title, cover_path, category')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error(error);
        container.innerHTML = '<p>Gagal memuat artikel.</p>';
        return;
    }

    container.innerHTML = '';
    data.forEach(article => {
        const coverUrl = article.cover_path ? supabase.storage.from('article_covers').getPublicUrl(article.cover_path).data.publicUrl : 'https://via.placeholder.com/300x180';
        const card = document.createElement('div');
        card.className = 'card article-card';
        card.innerHTML = `
            <div class="cover" style="background-image: url('${coverUrl}')"></div>
            <div class="card-content">
                <span class="badge">${article.category.replace('_', ' ')}</span>
                <h4>${article.title}</h4>
            </div>
        `;
        container.appendChild(card);
    });
}

async function loadLatestMaterials() {
    const container = document.getElementById('latest-materials');
    const { data, error } = await supabase
        .from('materials')
        .select('id, title, description, preview_path, type, materi_ke')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error(error);
        container.innerHTML = '<p>Gagal memuat materi.</p>';
        return;
    }

    container.innerHTML = '';
    data.forEach(material => {
        const previewUrl = material.preview_path ? supabase.storage.from('previews').getPublicUrl(material.preview_path).data.publicUrl : 'https://via.placeholder.com/300x150';
        const card = document.createElement('div');
        card.className = 'card material-card';
        card.innerHTML = `
            <div class="preview">
                <img src="${previewUrl}" alt="${material.title}" loading="lazy">
            </div>
            <div class="card-content">
                <div class="meta">
                    <span>Materi ke-${material.materi_ke}</span>
                    <span class="badge">${material.type}</span>
                </div>
                <h4>${material.title}</h4>
                <p>${material.description.substring(0, 80)}...</p>
                <div class="actions">
                    <a href="/materi-detail.html?id=${material.id}" class="btn">Preview</a>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function setupNotificationToggle(user) {
    const toggle = document.getElementById('notify-toggle');
    const banner = document.querySelector('.notification-banner');
    if (!toggle || !banner) return;

    const profile = await getUserProfile(user.id);
    if (profile) {
        toggle.checked = profile.notify_email;
    }

    toggle.addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        const { error } = await supabase
            .from('profiles')
            .update({ notify_email: isChecked })
            .eq('id', user.id);

        if (error) {
            toast('Gagal memperbarui preferensi notifikasi.', 'error');
            toggle.checked = !isChecked; // Revert on error
        } else {
            toast('Preferensi notifikasi berhasil disimpan.', 'success');
        }
    });
}
