# ⚙️ Scanin Backend

**Scanin Backend** adalah layanan utama (core service) berbasis **Node.js** dan **Express** yang menangani seluruh logika bisnis aplikasi NoteScanin, mulai dari autentikasi pengguna, penyimpanan gambar dan PDF, hingga meneruskan tugas pemrosesan Optical Character Recognition (OCR) ke AI Service.

## ✨ Fitur Utama

- **RESTful API**: Menyediakan endpoint untuk manajemen catatan (unggah, daftar, detail, hapus).
- **Integrasi AI Seamless**: Mengelola antrean (*job polling* & Server-Sent Events) ke Hugging Face Space AI untuk hasil OCR yang *real-time*.
- **Pemrosesan File**: Menangani pengunggahan gambar dengan `multer` dan menghasilkan PDF terstruktur secara dinamis menggunakan `pdfkit`.
- **Autentikasi Aman**: Didukung oleh sistem JWT (JSON Web Tokens) dan integrasi Google OAuth.
- **Penyimpanan Lokal & CORS Fleksibel**: Menggunakan SQLite lokal (`better-sqlite3`) yang ideal untuk arsitektur monolith/wadah, serta pengaturan CORS bawaan yang otomatis mengizinkan berbagai origin (termasuk domain kustom `.web.id`).

## 🛠️ Teknologi yang Digunakan

- **[Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)** - Core web server
- **[SQLite](https://www.sqlite.org/)** (via `better-sqlite3`) - Database relasional ringan
- **[JWT](https://jwt.io/) & [Google Auth Library](https://github.com/googleapis/google-auth-library-nodejs)** - Sistem Keamanan & Login
- **[PDFKit](https://pdfkit.org/)** - Generator dokumen PDF
- **[Swagger UI](https://swagger.io/tools/swagger-ui/)** - Dokumentasi API interaktif

## 🚀 Cara Menjalankan Project (Local Development)

### 1. Instalasi Dependensi
Pastikan Anda berada di direktori `backend`, lalu jalankan:
```bash
npm install
```

### 2. Konfigurasi Environment (Lingkungan)
Buat file `.env` di folder `backend` dengan konfigurasi seperti berikut:
```env
PORT=8000
JWT_SECRET=rahasia_super_aman_anda
GOOGLE_CLIENT_ID=client_id_google_anda.apps.googleusercontent.com
AI_SERVICE_URL=http://localhost:8080 # Atau URL Hugging Face AI Service
FRONTEND_URL=https://note-scanin.vercel.app,https://notescanin.web.id
```

### 3. Menjalankan Server
Jalankan mode *development* dengan fitur *hot-reload* (Nodemon):
```bash
npm run dev
```
Server akan berjalan di `http://localhost:8000`. 
Dokumentasi API lengkap bisa diakses langsung melalui endpoint: `http://localhost:8000/api-docs`.

## 📂 Struktur Direktori Utama

- `src/server.js` : Entry point aplikasi dan konfigurasi *middleware* (termasuk CORS).
- `src/routes/` : Kumpulan endpoint REST API (auth, notes, ocr, pdf).
- `src/db/` : Pengaturan koneksi SQLite dan inisialisasi tabel database.
- `src/middleware/` : Pemeriksaan token JWT dan pengelolaan rute yang dilindungi (*protected routes*).
- `src/storage/` : Tempat penyimpanan lokal untuk file gambar yang diunggah dan PDF yang dihasilkan.
- `src/swagger.json` : Definisi dokumentasi standar OpenAPI.

## ☁️ Catatan Deployment (Railway)

Aplikasi ini telah dirancang untuk mudah di-*deploy* ke platform berbasis wadah (*container-based*) seperti **Railway**. 
- Pastikan untuk mengatur variabel `FRONTEND_URL` di dashboard Railway jika Anda ingin menambahkan domain *frontend* baru yang diizinkan (CORS). Pisahkan beberapa domain dengan menggunakan koma.

---
Dibuat dengan ❤️ oleh Tim Scanin.
