import { supabase } from './supa.js';
import { getCurrentUser, requireAuth } from './auth.js';
import { renderAuthButtons, toast, initMobileNav } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    renderAuthButtons(user);
    
    // Initialize mobile navigation
    initMobileNav();
    
    const urlParams = new URLSearchParams(window.location.search);
    loadMaterialDetail();
    const materialId = urlParams.get('id');

    if (!materialId) {
        document.getElementById('material-detail-container').innerHTML = '<h1>Materi tidak ditemukan.</h1>';
        return;
    }

    loadMaterialDetail(materialId);
});

async function loadMaterialDetail(id) {
    const container = document.getElementById('material-detail-container');
    const { data: material, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !material) {
        container.innerHTML = '<h1>Login terlebih dahulu untuk melihat detail materi.</h1>';
        console.error(error);
        return;
    }

    let previewContent = '';
    if (material.external_url) {
        previewContent = `<iframe src="${material.external_url}" width="100%" height="450" frameborder="0" allowfullscreen></iframe>`;
    } else if (material.preview_path) {
        const publicURL = supabase.storage.from('previews').getPublicUrl(material.preview_path).data.publicUrl;
        if (material.type === 'video') {
            previewContent = `<video controls src="${publicURL}" style="width: 100%; border-radius: var(--radius);"></video>`;
        } else if (material.type === 'audio') {
            previewContent = `<audio controls src="${publicURL}" style="width: 100%;"></audio>`;
        } else {
            previewContent = `<img src="${publicURL}" alt="Preview ${material.title}" style="width: 100%; border-radius: var(--radius);">`;
        }
    } else {
        previewContent = '<p>Tidak ada preview tersedia.</p>';
    }

    container.innerHTML = `
        <div class="material-header">
            <h1>${material.title}</h1>
            <div class="meta">
                <span>Materi ke-${material.materi_ke}</span>
                <span class="badge">${material.type}</span>
                <span>Oleh: ${material.author || 'Admin'}</span>
            </div>
        </div>
        <div class="material-preview card">
            ${previewContent}
        </div>
        <div class="material-description card">
            <h3>Deskripsi</h3>
            <p>${material.description}</p>
        </div>
        <div class="material-actions">
            <button id="download-btn" class="btn btn-primary" data-path="${material.file_path}">Unduh File Penuh</button>
        </div>
    `;

    document.getElementById('download-btn').addEventListener('click', async (event) => {
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
        const { data, error } = await supabase.storage.from('materials').createSignedUrl(filePath, 300);

        if (error) {
            toast('Gagal membuat link unduhan.', 'error');
            console.error(error);
            return;
        }
        window.location.href = data.signedUrl;
    });
}
