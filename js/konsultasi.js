import { supabase } from './supa.js';
import { getCurrentUser } from './auth.js';
import { renderAuthButtons, toast, initMobileNav } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const user = await getCurrentUser();
    renderAuthButtons(user);
  } catch {}
  initMobileNav();
  await initConsultLinks();
});

function normalizePhone(num) {
  if (!num) return "";
  let n = String(num).replace(/\D/g, "");
  // convert 08xxxxxxxx → 628xxxxxxxx
  if (n.startsWith("0")) n = "62" + n.slice(1);
  // collapse any accidental 620... to 62...
  n = n.replace(/^620+/, "62");
  return n;
}

async function fetchSettings() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['consult_whatsapp', 'consult_email']);

    if (error) throw error;

    const map = {};
    (data || []).forEach(({ key, value }) => {
      try {
        map[key] = typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        map[key] = value;
      }
    });
    return map;
  } catch (e) {
    console.error('[konsultasi] fetchSettings error:', e);
    return {};
  }
}

async function initConsultLinks() {
  // Default (so links still work even if DB fails)
  const defaults = {
    consult_whatsapp: {
      number: "", // e.g., 6281234567890
      default_text: "Halo, saya ingin menjadwalkan sesi konsultasi."
    },
    consult_email: {
      to: "", // e.g., "bk@sekolah.sch.id"
      subject: "Konsultasi BK",
      body: "Halo BK, saya ingin berkonsultasi."
    }
  };

  const settings = { ...defaults, ...(await fetchSettings()) };

  // WhatsApp
  const waBtn = document.getElementById('whatsapp-link');
  if (waBtn) {
    const raw = settings.consult_whatsapp?.number || "";
    const num = normalizePhone(raw);
    const text = encodeURIComponent(settings.consult_whatsapp?.default_text || defaults.consult_whatsapp.default_text);

    if (num) {
      waBtn.href = `https://wa.me/${num}?text=${text}`;
      waBtn.removeAttribute('aria-disabled');
    } else {
      waBtn.href = '#';
      waBtn.setAttribute('aria-disabled', 'true');
      waBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toast('Nomor WhatsApp BK belum disetel di Pengaturan.', 'error');
      });
    }
  }

  // Email (Gmail)
  const emailBtn = document.getElementById('email-link');
  const emailAddress = document.getElementById('email-address');
  if (emailBtn && emailAddress) {
    const to = settings.consult_email?.to || "";
    const subject = encodeURIComponent(settings.consult_email?.subject || defaults.consult_email.subject);
    const body = encodeURIComponent(settings.consult_email?.body || defaults.consult_email.body);

    if (to) {
      emailAddress.textContent = to;
      // Menggunakan URL Gmail untuk membuka Gmail inbox dengan email baru
      emailBtn.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
      emailBtn.target = "_blank"; // Membuka di tab baru
      emailBtn.removeAttribute('aria-disabled');
    } else {
      emailAddress.textContent = '—';
      emailBtn.href = '#';
      emailBtn.setAttribute('aria-disabled', 'true');
      emailBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toast('Alamat email BK belum disetel di Pengaturan.', 'error');
      });
    }
  }
}
