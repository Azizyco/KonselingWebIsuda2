import { adminGuard } from './guard.js';
import { supabase } from '../supa.js';
import { toast, showModal, hideModal, setupModal, confirmDialog } from '../ui.js';

let currentEditingId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await adminGuard();
    loadInfoItems();

    setupModal('form-modal', 
        [document.getElementById('add-new-btn')], 
        [document.querySelector('#form-modal .modal-close'), document.getElementById('cancel-btn')]
    );

    document.getElementById('add-new-btn').addEventListener('click', () => {
        resetForm();
        showModal('form-modal');
    });

    document.getElementById('info-form').addEventListener('submit', handleFormSubmit);
});

async function loadInfoItems() {
    const { data, error } = await supabase
        .from('info_items')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        toast('Gagal memuat info.', 'error');
        return;
    }

    const tableBody = document.getElementById('info-table-body');
    tableBody.innerHTML = '';
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.title}</td>
            <td><span class="badge">${item.category.replace('_', ' ')}</span></td>
            <td>${item.is_published ? '<span style="color: var(--success);">Published</span>' : 'Draft'}</td>
            <td>
                <button class="btn edit-btn" data-id="${item.id}">Edit</button>
                <button class="btn btn-danger delete-btn" data-id="${item.id}" data-image-path="${item.image_path || ''}">Hapus</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEdit));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDelete));
}

function resetForm() {
    document.getElementById('info-form').reset();
    document.getElementById('form-title').textContent = 'Tambah Info Baru';
    currentEditingId = null;
}

async function handleEdit(event) {
    const id = event.target.dataset.id;
    const { data, error } = await supabase.from('info_items').select('*').eq('id', id).single();
    if (error) {
        toast('Gagal mengambil data info.', 'error');
        return;
    }
    
    currentEditingId = id;
    document.getElementById('info-id').value = data.id;
    document.getElementById('title').value = data.title;
    document.getElementById('category').value = data.category;
    document.getElementById('content').value = data.content;
    document.getElementById('link').value = data.link || '';
    document.getElementById('is_published').checked = data.is_published;
    document.getElementById('form-title').textContent = 'Edit Info';
    
    showModal('form-modal');
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan...';

    const imageFile = document.getElementById('image_file').files[0];
    let image_path = null;

    if (imageFile) {
        const { data, error } = await supabase.storage.from('info_images').upload(`${Date.now()}_${imageFile.name}`, imageFile);
        if (error) {
            toast(`Gagal mengunggah gambar: ${error.message}`, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Simpan';
            return;
        }
        image_path = data.path;
    }

    const infoData = {
        title: document.getElementById('title').value,
        category: document.getElementById('category').value,
        content: document.getElementById('content').value,
        link: document.getElementById('link').value || null,
        is_published: document.getElementById('is_published').checked,
    };

    if (image_path) infoData.image_path = image_path;

    let error;
    if (currentEditingId) {
        ({ error } = await supabase.from('info_items').update(infoData).eq('id', currentEditingId));
    } else {
        ({ error } = await supabase.from('info_items').insert([infoData]));
    }

    if (error) {
        toast(`Gagal menyimpan info: ${error.message}`, 'error');
    } else {
        toast('Info berhasil disimpan.', 'success');
        hideModal('form-modal');
        resetForm();
        loadInfoItems();
    }
    
    saveBtn.disabled = false;
    saveBtn.textContent = 'Simpan';
}

async function handleDelete(event) {
    const id = event.target.dataset.id;
    const imagePath = event.target.dataset.imagePath;

    const confirmed = await confirmDialog('Apakah Anda yakin ingin menghapus info ini?');
    if (!confirmed) return;

    const { error: dbError } = await supabase.from('info_items').delete().eq('id', id);
    if (dbError) {
        toast(`Gagal menghapus data: ${dbError.message}`, 'error');
        return;
    }

    if (imagePath) {
        await supabase.storage.from('info_images').remove([imagePath]);
    }

    toast('Info berhasil dihapus.', 'success');
    loadInfoItems();
}
