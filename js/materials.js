import { supabase } from './supa.js';
import { getCurrentUser, requireAuth } from './auth.js';
import { renderAuthButtons, toast, skeletonList, initMobileNav } from './ui.js';

const MATERIALS_PER_PAGE = 9;
let currentPage = 0;
let currentSort = 'latest';
let currentSearch = '';
let hasMore = true;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    renderAuthButtons(user);
    
    // Initialize mobile navigation
    initMobileNav();

    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const sortSelect = document.getElementById('sort-select');
    const loadMoreBtn = document.getElementById('load-more-btn');

    loadMaterials(true);

    searchBtn.addEventListener('click', () => {
        currentSearch = searchInput.value;
        loadMaterials(true);
    });
    
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            currentSearch = searchInput.value;
            loadMaterials(true);
        }
    });

    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        loadMaterials(true);
    });

    loadMoreBtn.addEventListener('click', () => {
        loadMaterials(false);
    });
});

async function loadMaterials(isNewQuery = false) {
    if (isNewQuery) {
        currentPage = 0;
        hasMore = true;
        document.getElementById('materials-grid').innerHTML = '';
    }

    if (!hasMore) return;

    const grid = document.getElementById('materials-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const emptyMessage = document.getElementById('empty-message');
    
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Memuat...';

    let query = supabase
        .from('materials')
        .select('id, title, description, preview_path, type, materi_ke, file_path')
        .eq('is_published', true);

    if (currentSearch) {
        query = query.eq('materi_ke', parseInt(currentSearch));
    }

    if (currentSort === 'latest') {
        query = query.order('created_at', { ascending: false });
    } else {
        query = query.order('materi_ke', { ascending: true });
    }

    const { data, error } = await query.range(
        currentPage * MATERIALS_PER_PAGE,
        (currentPage + 1) * MATERIALS_PER_PAGE - 1
    );

    if (error) {
        toast('Gagal memuat materi.', 'error');
        console.error(error);
        return;
    }

    if (data.length === 0 && isNewQuery) {
        emptyMessage.style.display = 'block';
    } else {
        emptyMessage.style.display = 'none';
    }

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
                    <button class="btn btn-primary download-btn" data-path="${material.file_path}">Unduh</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', handleDownload);
    });

    currentPage++;
    hasMore = data.length === MATERIALS_PER_PAGE;
    loadMoreBtn.style.display = hasMore ? 'inline-block' : 'none';
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Muat Lebih Banyak';
}

async function handleDownload(event) {
    const user = await getCurrentUser();
    if (!user) {
        toast('Masuk untuk unduh materi.', 'error');
        window.location.href = '/login.html';
        return;
    }

    const filePath = event.target.dataset.path;
    if (!filePath) {
        toast('File tidak ditemukan.', 'error');
        return;
    }

    toast('Mempersiapkan unduhan...', 'success');

    const { data, error } = await supabase
        .storage
        .from('materials')
        .createSignedUrl(filePath, 300); // URL valid for 5 minutes

    if (error) {
        toast('Gagal membuat link unduhan.', 'error');
        console.error(error);
        return;
    }

    window.location.href = data.signedUrl;
}
