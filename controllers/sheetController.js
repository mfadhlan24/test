import { google } from 'googleapis';

const SHEET_ID = process.env.SHEET_ID;

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

const norm = (s) => String(s || '').trim().toLowerCase();
const safeGet = (row, i) => (i >= 0 && i < row.length ? (row[i] ?? '') : '');

function buildIndex(headers) {
  const candidates = {
    Nama: ['nama'],
    Kategori: ['kategori', 'kategory'],
    Satker: ['satker (jika ppk)', 'satker', 'satker ppk'],
    Pengadaan: ['pengadaan (jika ppk)', 'pengadaan'],
    Ulasan: ['ulasan'],
    Link: ['link gmaps validasi', 'link gmaps', 'link validasi'],
    Tanggal: ['tanggal', 'tgl']
  };
  const idx = {};
  for (const key of Object.keys(candidates)) {
    idx[key] = -1;
    for (const cand of candidates[key]) {
      const i = headers.findIndex((h) => norm(h) === norm(cand));
      if (i !== -1) { idx[key] = i; break; }
    }
  }
  return idx;
}

// GET /api/search?tab=SK%20PUSAT&name=birgita
export async function searchByName(req, res) {
  try {
    const tab = req.query.tab || process.env.DEFAULT_TAB || 'SK PUSAT';
    const q = norm(req.query.name || '');
    if (!q) return res.json({ tab, results: [] });

    const sheets = getSheetsClient();
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A1:Z`
    });

    const rows = data.values || [];
    if (rows.length < 2) return res.json({ tab, results: [] });

    const headers = rows[0].map((h) => String(h).trim());
    const idx = buildIndex(headers);

    const results = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const nama = safeGet(row, idx.Nama);
      if (!nama) continue;
      const nlow = nama.toLowerCase();
      if (nlow.includes('lantai')) continue; // skip baris pemisah

      if (nlow.includes(q)) {
        results.push({
          rowIndex: r + 1,
          Nama: nama,
          Kategori: safeGet(row, idx.Kategori),
          Satker: safeGet(row, idx.Satker),
          Pengadaan: safeGet(row, idx.Pengadaan),
          Ulasan: safeGet(row, idx.Ulasan),
          LinkGmaps: safeGet(row, idx.Link),
          Tanggal: safeGet(row, idx.Tanggal),
        });
      }
    }

    res.json({ tab, results });
  } catch (err) {
    console.error('searchByName error:', err?.response?.data || err);
    res.status(500).json({ error: 'Gagal mengambil data dari Sheet.' });
  }
}

// POST /api/submit
// Body: { tab, rowIndex, link } — link sudah diformat "<maps> - <content-type> - <img?>"
export async function submitLink(req, res) {
  try {
    const tab = req.body.tab || process.env.DEFAULT_TAB || 'SK PUSAT';
    const rowIndex = Number(req.body.rowIndex);
    const link = String(req.body.link || '').trim();
    if (!rowIndex || !link) {
      return res.status(400).json({ error: 'rowIndex dan link wajib diisi.' });
    }

    const sheets = getSheetsClient();
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A1:Z1`
    });
    const headers = (data.values && data.values[0]) || [];
    const hIndex = (name) => headers.findIndex((x) => norm(x) === norm(name));

    let colLink = hIndex('Link Gmaps Validasi');
    let colTanggal = hIndex('Tanggal');

    if (colLink === -1) colLink = 7;   // H
    if (colTanggal === -1) colTanggal = 8; // I

    const toCol = (n) => {
      let s = '', num = n + 1;
      while (num > 0) {
        const rem = (num - 1) % 26;
        s = String.fromCharCode(65 + rem) + s;
        num = Math.floor((num - 1) / 26);
      }
      return s;
    };

    const linkCell = `${tab}!${toCol(colLink)}${rowIndex}`;
    const tglCell = `${tab}!${toCol(colTanggal)}${rowIndex}`;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const tanggal = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: linkCell, values: [[link]] },
          { range: tglCell, values: [[tanggal]] }
        ]
      }
    });

    res.json({ ok: true, linkCell, tglCell, tanggal });
  } catch (err) {
    console.error('submitLink error:', err?.response?.data || err);
    res.status(500).json({ error: 'Gagal menulis ke Sheet.' });
  }
}
