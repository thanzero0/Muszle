const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Muszle aktif!' });
});

// 2. Chat/Analysis Endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // Gunakan API Key dari client (jika ada), kalau tidak ada gunakan dari backend .env
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API Key Gemini tidak ditemukan di server maupun request.' });
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-3.5-flash' });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    res.json({ text: response.text() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Terjadi kesalahan pada server AI.' });
  }
});

// 3. Sync to Google Drive Endpoint (Simulasi Backend)
app.post('/api/sync-drive', async (req, res) => {
  try {
    const { workouts } = req.body;
    if (!workouts || workouts.length === 0) {
      return res.status(400).json({ error: 'Data latihan kosong!' });
    }
    
    // Di sini nantinya kita bisa memasukkan logic menggunakan package `googleapis` 
    // untuk mengunggah CSV yang kita generate dari data `workouts` ke Google Drive.
    // Sementara kita gunakan simulasi delay API.
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    res.json({ success: true, message: 'Data berhasil disinkronisasi ke folder Muszle di Google Drive via Backend!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal sinkronisasi ke Google Drive.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
