import { supabase } from './supa.js';
import { getCurrentUser } from './auth.js';
import { renderAuthButtons, initMobileNav } from './ui.js';
document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    renderAuthButtons(user);
    
    // Initialize mobile navigation
    initMobileNav();
    
    loadInfoItems('info_pekerjaan');
    loadInfoItems('prestasi');
    loadInfoItems('umum');
});

async function loadInfoItems(category) {
    const grid = document.getElementById(`${category}-grid`);
    const emptyMessage = document.getElementById(`empty-${category.replace('_', '')}`);
    
    if (!grid || !emptyMessage) return;

    const { data, error } = await supabase
        .from('info_items')
        .select('*')
        .eq('category', category)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        grid.innerHTML = `<p>Gagal memuat informasi.</p>`;
        return;
    }

    if (data.length === 0) {
        emptyMessage.style.display = 'block';
        grid.innerHTML = '';
        return;
    }

    emptyMessage.style.display = 'none';
    grid.innerHTML = '';
    data.forEach(item => {
        const imageUrl = item.image_path ? supabase.storage.from('info_images').getPublicUrl(item.image_path).data.publicUrl : '';
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            ${imageUrl ? `<img src="${imageUrl}" alt="${item.title}" style="width:100%; border-radius: var(--radius); margin-bottom: 1rem;">` : ''}
            <h4>${item.title}</h4>
            <p>${item.content}</p>
            ${item.link ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer" class="btn">Info Selengkapnya</a>` : ''}
        `;
        grid.appendChild(card);
    });
}
