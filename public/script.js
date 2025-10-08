const qs = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => [...el.querySelectorAll(s)];
const resultsBox = qs('#results');
const formSearch = qs('#formSearch');
const btnReset = qs('#btnReset');

// === Mapping link review per tab (dari kamu)
const tabLinks = {
  "SK PUSAT": "https://share.google/hB6fm0u4KBj0kxybG",
  "SK BANDUNG": "https://g.page/r/CdGME0-aM1AzEBM/review",
  "SK SURABAYA": "https://share.google/HwN0igBgOn6PrIBPQ",
  "SK JAKARTA": "https://share.google/HwN0igBgOn6PrIBPQ", // kamu tulis nama toko, aku pakai link surabaya yg sama; kalau ada link khusus, ganti di sini
  "SK SEMARANG": "https://g.page/r/CUduJTGAPJOREBM/review",
  "SK MEDAN": "https://maps.app.goo.gl/TvuaYYh7PuXyd9wr5",
  "SK KALIMANTAN": "https://share.google/p4R3fjrWfbvbgmyCI",
  "KREASI NUSANTARA P": "https://share.google/mpfknD4kR4kUFKr5L",
  "DAMAR HANJAYA": "https://share.google/KgU3CJTwBAk7Uvk5s",
  "TAMARO NUSANTARA": "https://maps.app.goo.gl/tQAUAge6PC9gei5i9",
  "BRILIAN CAHYA SUKSES": "https://share.google/uRy9nyO9OpCfHi3T7",
  "INDOTECH GLOBAL": "https://share.google/roXMJlHeOQZUPCAqh"
};

// --- SweetAlert helpers
function toast(type, title) {
  Swal.fire({ toast: true, position: 'top-end', icon: type, title,
    showConfirmButton: false, timer: 1800, timerProgressBar: true });
}
function modal(type, title, text='') {
  Swal.fire({ icon: type, title, text, confirmButtonText: 'OK', confirmButtonColor: '#0d6efd' });
}

// optional: tombol perusahaan link (kalau kamu isi manual)
qs('#company').addEventListener('change', (e) => {
  const company = e.target.value.trim();
  const map = {
    "Solusi Klik": "https://share.google/hB6fm0u4KBj0kxybG"
    // tambahkan kalau ada link web perusahaan lain (bukan review)
  };
  const link = map[company];
  if (link) {
    qs('#goCompany').classList.remove('d-none');
    qs('#goCompanyLink').href = link;
  } else {
    qs('#goCompany').classList.add('d-none');
  }
});

btnReset.addEventListener('click', () => {
  formSearch.reset();
  resultsBox.innerHTML = '';
  toast('info', 'Form direset');
});

formSearch.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultsBox.innerHTML = '';

  const name = qs('#name').value.trim();
  const tabSel = qs('#tab').value.trim();

  const params = new URLSearchParams();
  params.set('name', name);
  if (tabSel) params.set('tab', tabSel);

  Swal.showLoading();
  try {
    const res = await fetch(`/api/search?${params.toString()}`);
    const json = await res.json();
    Swal.close();

    if (!json.results || json.results.length === 0) {
      modal('warning', 'Tidak ditemukan', `Nama "${name}" tidak ada di tab "${json.tab}".`);
      return;
    }

    renderResults(json.tab, json.results);
    toast('success', `Ketemu ${json.results.length} baris di "${json.tab}"`);
  } catch (err) {
    console.error(err);
    Swal.close();
    modal('error', 'Gagal mengambil data', 'Coba beberapa saat lagi.');
  }
});

function renderResults(tab, items) {
  const company = qs('#company').value.trim();
  const reviewLink = tabLinks[tab] || null;

  resultsBox.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'result-card shadow-sm';

    const ulasanRaw = item.Ulasan || '(Belum ada ulasan di sheet)';
    const ulasanFinal = company ? replaceCompany(ulasanRaw, company) : ulasanRaw;

    card.innerHTML = `
      <div class="result-header">
        <div>
          <div class="h6 mb-1">${item.Nama}</div>
          <div class="small-muted">
            <span class="badge badge-soft rounded-pill me-1">${item.Kategori || '-'}</span>
            <span class="me-2"><b>Satker:</b> ${item.Satker || '-'}</span>
            <span class="me-2"><b>Pengadaan:</b> ${item.Pengadaan || '-'}</span>
          </div>
        </div>
        <div class="text-end">
          <div class="small-muted">Tab: <b>${tab}</b></div>
          <div class="small-muted">Row: ${item.rowIndex}</div>
          <div class="small-muted">Tanggal: ${item.Tanggal || '-'}</div>
        </div>
      </div>

      ${reviewLink ? `
      <div class="mt-3 mb-2 d-flex gap-2">
        <a href="${reviewLink}" target="_blank" class="btn btn-outline-success btn-sm">
          🌐 Buka Halaman Review Google Maps
        </a>
        <button class="btn btn-outline-secondary btn-sm copy-btn" data-target="ulasan-${item.rowIndex}">
          Copy Ulasan
        </button>
      </div>` : `
      <div class="mt-3 mb-2">
        <button class="btn btn-outline-secondary btn-sm copy-btn" data-target="ulasan-${item.rowIndex}">
          Copy Ulasan
        </button>
      </div>`}

      <label class="form-label fw-semibold">Ulasan</label>
      <div class="d-flex gap-2 align-items-start">
        <pre class="pre flex-grow-1" id="ulasan-${item.rowIndex}">${escapeHtml(ulasanFinal)}</pre>
      </div>

      <div class="row g-2 mt-3">
        <div class="col-md-5">
          <label class="form-label fw-semibold">Link Gmaps Validasi</label>
          <input type="url" class="form-control" placeholder="https://maps.app.goo.gl/..." id="link-${item.rowIndex}" value="">
        </div>
        <div class="col-md-3">
          <label class="form-label fw-semibold">Tipe Konten</label>
          <select class="form-select" id="content-type-${item.rowIndex}">
            <option value="caption only">Caption Only</option>
            <option value="caption + foto">Caption + Foto</option>
            <option value="caption + video">Caption + Video</option>
            <option value="caption + foto + video">Caption + Foto + Video</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label fw-semibold">URL Gambar (opsional)</label>
          <input type="url" class="form-control" placeholder="https://..." id="image-url-${item.rowIndex}">
        </div>
        <div class="col-md-1 d-grid">
          <label class="form-label opacity-0">.</label>
          <button class="btn btn-success btn-rounded" data-action="submit" data-row="${item.rowIndex}" data-tab="${tab}">
            Simpan
          </button>
        </div>
      </div>
    `;
    resultsBox.appendChild(card);
  });
}

// klik copy / simpan
resultsBox.addEventListener('click', async (ev) => {
  const copyBtn = ev.target.closest('.copy-btn');
  if (copyBtn) {
    const id = copyBtn.getAttribute('data-target');
    const text = qs('#' + id)?.innerText ?? '';
    await navigator.clipboard.writeText(text);
    toast('success', 'Ulasan disalin');
    return;
  }

  const submitBtn = ev.target.closest('[data-action="submit"]');
  if (submitBtn) {
    const rowIndex = Number(submitBtn.getAttribute('data-row'));
    const tab = submitBtn.getAttribute('data-tab');
    const linkVal = qs(`#link-${rowIndex}`).value.trim();
    const typeVal = qs(`#content-type-${rowIndex}`).value.trim();
    const imgVal = qs(`#image-url-${rowIndex}`).value.trim();

    if (!linkVal) {
      modal('warning', 'Link belum diisi', 'Tempel link Google Maps validasi dahulu.');
      return;
    }

    let finalValue = `${linkVal} - ${typeVal}`;
    if (imgVal) finalValue += ` - ${imgVal}`;

    Swal.showLoading();
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab, rowIndex, link: finalValue })
      });
      const json = await res.json();
      Swal.close();

      if (json.ok) {
        toast('success', 'Tersimpan ke Sheet');
      } else {
        modal('error', 'Gagal menyimpan', json.error || 'Periksa izin & header kolom.');
      }
    } catch (err) {
      console.error(err);
      Swal.close();
      modal('error', 'Gagal menyimpan', 'Coba lagi beberapa saat.');
    }
  }
});

// helpers
function escapeHtml(str) {
  return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}
function replaceCompany(text, company) {
  const patterns = [/solusi\s*klik/gi, /klik\s*solusi/gi, /solusi\s*k\.?/gi];
  let out = text;
  patterns.forEach(re => out = out.replace(re, company));
  return out;
}
