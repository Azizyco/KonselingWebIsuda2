import { supabase } from './supa.js';
import { getCurrentUser } from './auth.js';
import { renderAuthButtons, setupModal, showModal, hideModal, initMobileNav } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    renderAuthButtons(user);
    
    // Initialize mobile navigation
    initMobileNav();
    
    loadArticles();
    const tabs = document.querySelectorAll('.tab-link');
    const grid = document.getElementById('articles-grid');
    const emptyMessage = document.getElementById('empty-message');

    loadArticles('konseling'); // Load initial category

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const category = tab.dataset.category;
            loadArticles(category);
        });
    });

    setupModal('article-modal', [], [document.querySelector('#article-modal .modal-close')]);
});

async function loadArticles(category) {
    const grid = document.getElementById('articles-grid');
    const emptyMessage = document.getElementById('empty-message');
    grid.innerHTML = '<!-- Skeleton loaders here -->'; // Add skeletons if desired
    emptyMessage.style.display = 'none';

    const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('category', category)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        grid.innerHTML = '<p>Gagal memuat artikel.</p>';
        return;
    }

    if (data.length === 0) {
        emptyMessage.style.display = 'block';
        grid.innerHTML = '';
        return;
    }

    grid.innerHTML = '';
    data.forEach(article => {
        const coverUrl = article.cover_path ? supabase.storage.from('article_covers').getPublicUrl(article.cover_path).data.publicUrl : 'https://via.placeholder.com/300x180';
        const card = document.createElement('div');
        card.className = 'card article-card';
        card.style.cursor = 'pointer';
        card.innerHTML = `
            <div class="cover" style="background-image: url('${coverUrl}')"></div>
            <div class="card-content">
                <h4>${article.title}</h4>
            </div>
        `;
        card.addEventListener('click', () => showArticleDetail(article));
        grid.appendChild(card);
    });
}

function showArticleDetail(article) {
    const modalBody = document.getElementById('modal-body');
    const coverUrl = article.cover_path ? supabase.storage.from('article_covers').getPublicUrl(article.cover_path).data.publicUrl : '';
    
    modalBody.innerHTML = `
        ${coverUrl ? `<img src="${coverUrl}" alt="${article.title}" style="width:100%; border-radius: var(--radius); margin-bottom: 1rem;">` : ''}
        <h1>${article.title}</h1>
        <div class="article-content">${article.content.replace(/\n/g, '<br>')}</div>
    `;
    showModal('article-modal');
}
