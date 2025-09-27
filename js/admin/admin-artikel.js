import { adminGuard } from './guard.js';
import { supabase } from '../supa.js';
import { toast, showModal, hideModal, setupModal, confirmDialog } from '../ui.js';

let currentEditingId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await adminGuard();
    loadArticles();

    setupModal('form-modal', 
        [document.getElementById('add-new-btn')], 
        [document.querySelector('#form-modal .modal-close'), document.getElementById('cancel-btn')]
    );

    document.getElementById('add-new-btn').addEventListener('click', () => {
        resetForm();
        showModal('form-modal');
    });

    document.getElementById('article-form').addEventListener('submit', handleFormSubmit);
});

async function loadArticles() {
    const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        toast('Gagal memuat artikel.', 'error');
        return;
    }

    const tableBody = document.getElementById('articles-table-body');
    tableBody.innerHTML = '';
    data.forEach(article => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${article.title}</td>
            <td><span class="badge">${article.category.replace('_', ' ')}</span></td>
            <td>${article.is_published ? '<span style="color: var(--success);">Published</span>' : 'Draft'}</td>
            <td>
                <button class="btn edit-btn" data-id="${article.id}">Edit</button>
                <button class="btn btn-danger delete-btn" data-id="${article.id}" data-cover-path="${article.cover_path || ''}">Hapus</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEdit));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDelete));
}

function resetForm() {
    document.getElementById('article-form').reset();
    document.getElementById('form-title').textContent = 'Tambah Artikel Baru';
    currentEditingId = null;
}

async function handleEdit(event) {
    const id = event.target.dataset.id;
    const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();
    if (error) {
        toast('Gagal mengambil data artikel.', 'error');
        return;
    }
    
    currentEditingId = id;
    document.getElementById('article-id').value = data.id;
    document.getElementById('title').value = data.title;
    document.getElementById('category').value = data.category;
    document.getElementById('content').value = data.content;
    document.getElementById('is_published').checked = data.is_published;
    document.getElementById('form-title').textContent = 'Edit Artikel';
    
    showModal('form-modal');
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan...';

    const coverFile = document.getElementById('cover_file').files[0];
    let cover_path = null;

    if (coverFile) {
        const { data, error } = await supabase.storage.from('article_covers').upload(`${Date.now()}_${coverFile.name}`, coverFile);
        if (error) {
            toast(`Gagal mengunggah cover: ${error.message}`, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Simpan';
            return;
        }
        cover_path = data.path;
    }

    const articleData = {
        title: document.getElementById('title').value,
        category: document.getElementById('category').value,
        content: document.getElementById('content').value,
        is_published: document.getElementById('is_published').checked,
    };

    if (cover_path) articleData.cover_path = cover_path;

    let error;
    if (currentEditingId) {
        ({ error } = await supabase.from('articles').update(articleData).eq('id', currentEditingId));
    } else {
        ({ error } = await supabase.from('articles').insert([articleData]));
    }

    if (error) {
        toast(`Gagal menyimpan artikel: ${error.message}`, 'error');
    } else {
        toast('Artikel berhasil disimpan.', 'success');
        hideModal('form-modal');
        resetForm();
        loadArticles();
    }
    
    saveBtn.disabled = false;
    saveBtn.textContent = 'Simpan';
}

async function handleDelete(event) {
    const id = event.target.dataset.id;
    const coverPath = event.target.dataset.coverPath;

    const confirmed = await confirmDialog('Apakah Anda yakin ingin menghapus artikel ini?');
    if (!confirmed) return;

    const { error: dbError } = await supabase.from('articles').delete().eq('id', id);
    if (dbError) {
        toast(`Gagal menghapus data: ${dbError.message}`, 'error');
        return;
    }

    if (coverPath) {
        await supabase.storage.from('article_covers').remove([coverPath]);
    }

    toast('Artikel berhasil dihapus.', 'success');
    loadArticles();
}
