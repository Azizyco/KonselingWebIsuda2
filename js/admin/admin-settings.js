import { adminGuard } from './guard.js';
import { supabase } from '../supa.js';
import { toast } from '../ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    await adminGuard();
    loadSettings();

    document.getElementById('settings-form').addEventListener('submit', handleFormSubmit);
});

async function loadSettings() {
    const { data, error } = await supabase
        .from('settings')
        .select('key, value');

    if (error) {
        toast('Gagal memuat pengaturan.', 'error');
        return;
    }

    data.forEach(setting => {
        const { key, value } = setting;
        for (const prop in value) {
            const input = document.querySelector(`[data-key="${key}"][data-prop="${prop}"]`);
            if (input) {
                input.value = value[prop];
            }
        }
    });
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan...';

    const inputs = document.querySelectorAll('#settings-form [data-key]');
    const settingsToUpdate = {};

    inputs.forEach(input => {
        const key = input.dataset.key;
        const prop = input.dataset.prop;
        if (!settingsToUpdate[key]) {
            settingsToUpdate[key] = {};
        }
        settingsToUpdate[key][prop] = input.value;
    });

    const updates = Object.keys(settingsToUpdate).map(key => ({
        key: key,
        value: settingsToUpdate[key]
    }));

    const { error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'key' });

    if (error) {
        toast(`Gagal menyimpan pengaturan: ${error.message}`, 'error');
    } else {
        toast('Pengaturan berhasil disimpan.', 'success');
    }

    saveBtn.disabled = false;
    saveBtn.textContent = 'Simpan Pengaturan';
}
