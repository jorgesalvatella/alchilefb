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
  storageBucket: 'studio-9824031244-700aa.firebasestorage.app',
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

    // La URL pública funciona gracias a las reglas de Storage
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

// GET a single business unit by ID
app.get('/api/control/unidades-de-negocio/:id', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { id } = req.params;
        const db = admin.firestore();
        const docRef = db.collection('businessUnits').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ message: 'Business unit not found' });
        }

        res.status(200).json({ id: docSnap.id, ...docSnap.data() });
    } catch (error) {
        console.error('Error fetching business unit:', error);
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

// POST a new department for a business unit
app.post('/api/control/unidades-de-negocio/:unidadId/departamentos', authMiddleware, async (req, res) => {
  try {
    // Verificar que el usuario sea admin o super_admin
    if (!req.user || (!req.user.admin && !req.user.super_admin)) {
      return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
    }

    const { unidadId } = req.params;
    const { name, description } = req.body;

    // Validar campos requeridos
    if (!name) {
      return res.status(400).json({ message: 'Missing required field: name' });
    }

    const db = admin.firestore();
    const newDepartment = {
      name,
      description: description || '',
      businessUnitId: unidadId,
      deleted: false,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('departamentos').add(newDepartment);

    res.status(201).json({ id: docRef.id, ...newDepartment });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET all departments for a business unit
app.get('/api/control/unidades-de-negocio/:unidadId/departamentos', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { unidadId } = req.params;
        const db = admin.firestore();
        const snapshot = await db.collection('departamentos')
            .where('businessUnitId', '==', unidadId)
            .where('deleted', '==', false)
            .get();

        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        const departments = [];
        snapshot.forEach(doc => {
            departments.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// GET a single department by ID
app.get('/api/control/departamentos/:id', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { id } = req.params;
        const db = admin.firestore();
        const docRef = db.collection('departamentos').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ message: 'Department not found' });
        }

        res.status(200).json({ id: docSnap.id, ...docSnap.data() });
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// GET all groups for a department
app.get('/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { deptoId } = req.params;
        const db = admin.firestore();
        const snapshot = await db.collection('grupos')
            .where('departmentId', '==', deptoId)
            .where('deleted', '==', false)
            .get();

        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        const groups = [];
        snapshot.forEach(doc => {
            groups.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// GET a single group by ID
app.get('/api/control/grupos/:id', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { id } = req.params;
        const db = admin.firestore();
        const docRef = db.collection('grupos').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ message: 'Group not found' });
        }

        res.status(200).json({ id: docSnap.id, ...docSnap.data() });
    } catch (error) {
        console.error('Error fetching group:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// POST a new group for a department
app.post('/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }

        const { unidadId, deptoId } = req.params;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Missing required field: name' });
        }

        const db = admin.firestore();
        const newGroup = {
            name,
            description: description || '',
            businessUnitId: unidadId,
            departmentId: deptoId,
            deleted: false,
            createdAt: new Date().toISOString(),
        };

        const docRef = await db.collection('grupos').add(newGroup);
        res.status(201).json({ id: docRef.id, ...newGroup });

    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// GET all concepts for a group
app.get('/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos/:grupoId/conceptos', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { grupoId } = req.params;
        const db = admin.firestore();
        const snapshot = await db.collection('conceptos')
            .where('groupId', '==', grupoId)
            .where('deleted', '==', false)
            .get();

        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        const concepts = [];
        snapshot.forEach(doc => {
            concepts.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(concepts);
    } catch (error) {
        console.error('Error fetching concepts:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// POST a new concept for a group
app.post('/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos/:grupoId/conceptos', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }

        const { unidadId, deptoId, grupoId } = req.params;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Missing required field: name' });
        }

        const db = admin.firestore();
        const newConcept = {
            name,
            description: description || '',
            businessUnitId: unidadId,
            departmentId: deptoId,
            groupId: grupoId,
            proveedoresIds: [], // Inicializar como array vacío
            deleted: false,
            createdAt: new Date().toISOString(),
        };

        const docRef = await db.collection('conceptos').add(newConcept);
        res.status(201).json({ id: docRef.id, ...newConcept });

    } catch (error) {
        console.error('Error creating concept:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// PUT to update a business unit
app.put('/api/control/unidades-de-negocio/:unidadId', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { unidadId } = req.params;
        const { name, razonSocial, address, phone, taxIdUrl } = req.body;

        if (!name || !razonSocial) {
            return res.status(400).json({ message: 'Missing required fields: name, razonSocial' });
        }

        const db = admin.firestore();
        const businessUnitRef = db.collection('businessUnits').doc(unidadId);
        const updatedData = {
            name,
            razonSocial,
            address: address || '',
            phone: phone || '',
            taxIdUrl: taxIdUrl || '',
            updatedAt: new Date().toISOString(),
        };
        await businessUnitRef.update(updatedData);
        res.status(200).json({ id: unidadId, ...updatedData });
    } catch (error) {
        console.error('Error updating business unit:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// PUT to update a department
app.put('/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { deptoId } = req.params;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Missing required field: name' });
        }

        const db = admin.firestore();
        const departmentRef = db.collection('departamentos').doc(deptoId);
        const updatedData = {
            name,
            description: description || '',
            updatedAt: new Date().toISOString(),
        };
        await departmentRef.update(updatedData);
        res.status(200).json({ id: deptoId, ...updatedData });
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// PUT to update a group
app.put('/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos/:grupoId', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { grupoId } = req.params;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Missing required field: name' });
        }

        const db = admin.firestore();
        const groupRef = db.collection('grupos').doc(grupoId);
        const updatedData = {
            name,
            description: description || '',
            updatedAt: new Date().toISOString(),
        };
        await groupRef.update(updatedData);
        res.status(200).json({ id: grupoId, ...updatedData });
    } catch (error) {
        console.error('Error updating group:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// PUT to update a concept
app.put('/api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos/:grupoId/conceptos/:conceptoId', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { conceptoId } = req.params;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Missing required field: name' });
        }

        const db = admin.firestore();
        const conceptRef = db.collection('conceptos').doc(conceptoId);
        const updatedData = {
            name,
            description: description || '',
            updatedAt: new Date().toISOString(),
        };
        await conceptRef.update(updatedData);
        res.status(200).json({ id: conceptoId, ...updatedData });
    } catch (error) {
        console.error('Error updating concept:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// --- Supplier and Relationship Management ---

// GET all suppliers
app.get('/api/control/proveedores', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const db = admin.firestore();
        const snapshot = await db.collection('proveedores')
            .where('deleted', '==', false)
            .get();

        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        const suppliers = [];
        snapshot.forEach(doc => {
            suppliers.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// POST a new supplier
app.post('/api/control/proveedores', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { name, contactName, phone, email } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Missing required field: name' });
        }
        const db = admin.firestore();
        const newSupplier = {
            name,
            contactName: contactName || '',
            phone: phone || '',
            email: email || '',
            deleted: false,
            createdAt: new Date().toISOString(),
        };
        const docRef = await db.collection('proveedores').add(newSupplier);
        res.status(201).json({ id: docRef.id, ...newSupplier });
    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// PUT to update a supplier
app.put('/api/control/proveedores/:proveedorId', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { proveedorId } = req.params;
        const { name, contactName, phone, email } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Missing required field: name' });
        }
        const db = admin.firestore();
        const supplierRef = db.collection('proveedores').doc(proveedorId);
        const updatedData = {
            name,
            contactName,
            phone,
            email,
            updatedAt: new Date().toISOString(),
        };
        await supplierRef.update(updatedData);
        res.status(200).json({ id: proveedorId, ...updatedData });
    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// DELETE a supplier (soft delete)
app.delete('/api/control/proveedores/:proveedorId', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { proveedorId } = req.params;
        const db = admin.firestore();
        const supplierRef = db.collection('proveedores').doc(proveedorId);
        await supplierRef.update({
            deleted: true,
            deletedAt: new Date().toISOString(),
        });
        res.status(200).json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// GET associated suppliers for a concept
app.get('/api/control/conceptos/:conceptoId/proveedores', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { conceptoId } = req.params;
        const db = admin.firestore();

        // Get the concept to retrieve proveedoresIds
        const conceptDoc = await db.collection('conceptos').doc(conceptoId).get();
        if (!conceptDoc.exists) {
            return res.status(404).json({ message: 'Concept not found' });
        }

        const conceptData = conceptDoc.data();
        const proveedoresIds = conceptData.proveedoresIds || [];

        if (proveedoresIds.length === 0) {
            return res.status(200).json([]);
        }

        // Fetch all suppliers with those IDs
        const suppliers = [];
        for (const supplierId of proveedoresIds) {
            const supplierDoc = await db.collection('proveedores').doc(supplierId).get();
            if (supplierDoc.exists) {
                suppliers.push({ id: supplierDoc.id, ...supplierDoc.data() });
            }
        }

        res.status(200).json(suppliers);
    } catch (error) {
        console.error('Error fetching associated suppliers:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// POST to associate a supplier with a concept
app.post('/api/control/conceptos/:conceptoId/proveedores', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { conceptoId } = req.params;
        const { proveedorId } = req.body;

        if (!proveedorId) {
            return res.status(400).json({ message: 'Missing required field: proveedorId' });
        }

        const db = admin.firestore();
        const conceptRef = db.collection('conceptos').doc(conceptoId);
        await conceptRef.update({
            proveedoresIds: admin.firestore.FieldValue.arrayUnion(proveedorId)
        });
        res.status(200).json({ message: 'Supplier associated successfully' });
    } catch (error) {
        console.error('Error associating supplier:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// DELETE to disassociate a supplier from a concept
app.delete('/api/control/conceptos/:conceptoId/proveedores/:proveedorId', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { conceptoId, proveedorId } = req.params;
        const db = admin.firestore();
        const conceptRef = db.collection('conceptos').doc(conceptoId);
        await conceptRef.update({
            proveedoresIds: admin.firestore.FieldValue.arrayRemove(proveedorId)
        });
        res.status(200).json({ message: 'Supplier disassociated successfully' });
    } catch (error) {
        console.error('Error disassociating supplier:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// ... (otros endpoints)

module.exports = app;
