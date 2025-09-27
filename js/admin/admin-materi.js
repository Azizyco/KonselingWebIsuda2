import { adminGuard } from './guard.js';
import { supabase } from '../supa.js';
import { toast, showModal, hideModal, setupModal, confirmDialog } from '../ui.js';

let currentEditingId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await adminGuard();
    loadMaterials();

    setupModal('form-modal', 
        [document.getElementById('add-new-btn')], 
        [document.querySelector('#form-modal .modal-close'), document.getElementById('cancel-btn')]
    );

    document.getElementById('add-new-btn').addEventListener('click', () => {
        resetForm();
        showModal('form-modal');
    });

    document.getElementById('material-form').addEventListener('submit', handleFormSubmit);
});

async function loadMaterials() {
    const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('materi_ke', { ascending: true });

    if (error) {
        toast('Gagal memuat materi.', 'error');
        return;
    }

    const tableBody = document.getElementById('materials-table-body');
    tableBody.innerHTML = '';
    data.forEach(material => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${material.materi_ke}</td>
            <td>${material.title}</td>
            <td><span class="badge">${material.type}</span></td>
            <td>${material.is_published ? '<span style="color: var(--success);">Published</span>' : 'Draft'}</td>
            <td>
                <button class="btn edit-btn" data-id="${material.id}">Edit</button>
                <button class="btn btn-danger delete-btn" data-id="${material.id}" data-preview-path="${material.preview_path || ''}" data-file-path="${material.file_path || ''}">Hapus</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEdit));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDelete));
}

function resetForm() {
    document.getElementById('material-form').reset();
    document.getElementById('form-title').textContent = 'Tambah Materi Baru';
    currentEditingId = null;
}

async function handleEdit(event) {
    const id = event.target.dataset.id;
    const { data, error } = await supabase.from('materials').select('*').eq('id', id).single();
    if (error) {
        toast('Gagal mengambil data materi.', 'error');
        return;
    }
    
    currentEditingId = id;
    document.getElementById('material-id').value = data.id;
    document.getElementById('materi_ke').value = data.materi_ke;
    document.getElementById('title').value = data.title;
    document.getElementById('type').value = data.type;
    document.getElementById('description').value = data.description;
    document.getElementById('external_url').value = data.external_url || '';
    document.getElementById('is_published').checked = data.is_published;
    document.getElementById('form-title').textContent = 'Edit Materi';
    
    showModal('form-modal');
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan...';

    const previewFile = document.getElementById('preview_file').files[0];
    const mainFile = document.getElementById('main_file').files[0];

    let preview_path = null;
    let file_path = null;

    if (previewFile) {
        const { data, error } = await supabase.storage.from('previews').upload(`${Date.now()}_${previewFile.name}`, previewFile);
        if (error) {
            toast(`Gagal mengunggah preview: ${error.message}`, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Simpan';
            return;
        }
        preview_path = data.path;
    }

    if (mainFile) {
        const { data, error } = await supabase.storage.from('materials').upload(`${Date.now()}_${mainFile.name}`, mainFile);
        if (error) {
            toast(`Gagal mengunggah file utama: ${error.message}`, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Simpan';
            return;
        }
        file_path = data.path;
    }

    const materialData = {
        materi_ke: document.getElementById('materi_ke').value,
        title: document.getElementById('title').value,
        type: document.getElementById('type').value,
        description: document.getElementById('description').value,
        external_url: document.getElementById('external_url').value || null,
        is_published: document.getElementById('is_published').checked,
        author: (await supabase.auth.getUser()).data.user.email,
    };

    if (preview_path) materialData.preview_path = preview_path;
    if (file_path) materialData.file_path = file_path;

    let error;
    if (currentEditingId) {
        ({ error } = await supabase.from('materials').update(materialData).eq('id', currentEditingId));
    } else {
        ({ error } = await supabase.from('materials').insert([materialData]));
    }

    if (error) {
        toast(`Gagal menyimpan materi: ${error.message}`, 'error');
    } else {
        toast('Materi berhasil disimpan.', 'success');
        hideModal('form-modal');
        resetForm();
        loadMaterials();
    }
    
    saveBtn.disabled = false;
    saveBtn.textContent = 'Simpan';
}

async function handleDelete(event) {
    const id = event.target.dataset.id;
    const previewPath = event.target.dataset.previewPath;
    const filePath = event.target.dataset.filePath;

    const confirmed = await confirmDialog('Apakah Anda yakin ingin menghapus materi ini? Tindakan ini tidak dapat dibatalkan.');
    if (!confirmed) return;

    // Delete from DB
    const { error: dbError } = await supabase.from('materials').delete().eq('id', id);
    if (dbError) {
        toast(`Gagal menghapus data: ${dbError.message}`, 'error');
        return;
    }

    // Delete files from storage
    const filesToDelete = [];
    if (previewPath) filesToDelete.push(previewPath);
    if (filePath) filesToDelete.push(filePath);

    if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage.from('materials').remove(filesToDelete.filter(p => p.startsWith(filePath)));
        const { error: previewStorageError } = await supabase.storage.from('previews').remove(filesToDelete.filter(p => p.startsWith(previewPath)));
        if (storageError || previewStorageError) {
            toast('Data dihapus, tapi gagal menghapus file dari storage.', 'error');
        }
    }

    toast('Materi berhasil dihapus.', 'success');
    loadMaterials();
}
