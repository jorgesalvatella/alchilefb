const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const multer = require('multer');
const { getStorage } = require('firebase-admin/storage');

// Initialize Firebase Admin SDK
initializeApp({
  credential: applicationDefault(),
  projectId: 'studio-9824031244-700aa',
  storageBucket: 'studio-9824031244-700aa.appspot.com',
});

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());

const authMiddleware = require('./authMiddleware');

// --- API Routes ---

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('Hello from the Al Chile API Backend!');
});

// Endpoint para subir archivos
app.post('/api/control/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded.' });
  }

  try {
    const bucket = getStorage().bucket();
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const fileRef = bucket.file(`tax_ids/${fileName}`);

    await fileRef.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
    });

    // Hacer el archivo público
    await fileRef.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileRef.name}`;
    res.status(200).send({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send({ message: 'Internal Server Error', error: error.message });
  }
});


// GET all business units
app.get('/api/control/unidades-de-negocio', authMiddleware, async (req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('businessUnits')
      .where('deleted', '==', false)
      .get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const businessUnits = [];
    snapshot.forEach(doc => {
      businessUnits.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(businessUnits);
  } catch (error) {
    console.error('Error fetching business units:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST a new business unit
app.post('/api/control/unidades-de-negocio', authMiddleware, async (req, res) => {
  try {
    // Verificar que el usuario sea super_admin
    if (!req.user || !req.user.super_admin) {
      return res.status(403).json({ message: 'Forbidden: super_admin role required' });
    }

    const { name, razonSocial, address, phone, taxIdUrl } = req.body;

    // Validar campos requeridos
    if (!name || !razonSocial) {
      return res.status(400).json({ message: 'Missing required fields: name, razonSocial' });
    }

    const db = admin.firestore();
    const newBusinessUnit = {
      name,
      razonSocial,
      address: address || '',
      phone: phone || '',
      taxIdUrl: taxIdUrl || '',
      deleted: false,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('businessUnits').add(newBusinessUnit);

    res.status(201).json({ id: docRef.id, ...newBusinessUnit });
  } catch (error) {
    console.error('Error creating business unit:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// ... (otros endpoints)

module.exports = app;
