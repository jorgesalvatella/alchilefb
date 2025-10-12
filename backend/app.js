const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const multer = require('multer');
const { getStorage } = require('firebase-admin/storage');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

// Initialize Firebase Admin SDK
initializeApp({
  credential: applicationDefault(),
  projectId: 'studio-9824031244-700aa',
  storageBucket: 'studio-9824031244-700aa.firebasestorage.app',
});

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize Firestore DB instance
const db = admin.firestore();

// Middleware to require admin or super_admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || (!req.user.admin && !req.user.super_admin)) {
    return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
  }
  next();
};

// --- Swagger Configuration ---
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Al Chile FB API',
      version: '1.0.0',
      description: 'API para la gestión de catálogos, pedidos y más.',
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Servidor de Desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [path.join(__dirname, '*.js')], // Archivos que contienen anotaciones para la documentación
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Middleware to ensure only super_admins can access Swagger docs
const checkSuperAdminForSwagger = (req, res, next) => {
  if (req.user && req.user.super_admin) {
    return next();
  }
  return res.status(403).send('Forbidden: Access to API docs requires super_admin role.');
};

const authMiddleware = require('./authMiddleware');

app.use('/api-docs', authMiddleware, checkSuperAdminForSwagger, swaggerUi.serve, swaggerUi.setup(swaggerDocs));
// Middleware
app.use(cors());
app.use(express.json());

// --- API Routes ---

app.get('/', (req, res) => {
  res.status(200).send('Hello from the Al Chile API Backend!');
});

app.post('/api/control/productos-venta/upload-image', authMiddleware, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded.' });
  }

  try {
    const bucket = getStorage().bucket();
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const fileRef = bucket.file(`productos/${fileName}`);

    // Upload file
    await fileRef.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Generate a download token to create a public URL
    const crypto = require('crypto');
    const token = crypto.randomUUID();
    await fileRef.setMetadata({
      metadata: {
        firebaseStorageDownloadTokens: token,
      }
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileRef.name)}?alt=media&token=${token}`;
    
    res.status(200).send({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading product image:', error);
    res.status(500).send({ message: 'Internal Server Error', error: error.message });
  }
});
/**
 * @swagger
 * /api/control/unidades-de-negocio:
 *   get:
 *     summary: Obtiene todas las unidades de negocio
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de unidades de negocio
 */
app.get('/api/control/unidades-de-negocio', authMiddleware, async (req, res) => {
  try {
    console.log('[GET /api/control/unidades-de-negocio] Request received from user:', req.user?.uid);
    const db = admin.firestore();
    console.log('[GET /api/control/unidades-de-negocio] Querying Firestore...');

    const snapshot = await db.collection('businessUnits')
      .where('deleted', '==', false)
      .get();

    console.log('[GET /api/control/unidades-de-negocio] Query successful, documents found:', snapshot.size);

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const businessUnits = [];
    snapshot.forEach(doc => {
      businessUnits.push({ id: doc.id, ...doc.data() });
    });

    console.log('[GET /api/control/unidades-de-negocio] Sending response with', businessUnits.length, 'units');
    res.status(200).json(businessUnits);
  } catch (error) {
    console.error('[GET /api/control/unidades-de-negocio] ERROR:', error);
    console.error('[GET /api/control/unidades-de-negocio] Error stack:', error.stack);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

/**
 * @swagger
 * /api/control/unidades-de-negocio/{id}:
 *   get:
 *     summary: Obtiene una unidad de negocio por ID
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Detalles de la unidad de negocio
 *       '404':
 *         description: Unidad de negocio no encontrada
 */
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

/**
 * @swagger
 * /api/control/unidades-de-negocio:
 *   post:
 *     summary: Crea una nueva unidad de negocio
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               razonSocial:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Unidad de negocio creada
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/unidades-de-negocio/{unidadId}:
 *   delete:
 *     summary: Elimina una unidad de negocio (soft delete)
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unidadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Unidad de negocio eliminada
 *       '403':
 *         description: No autorizado
 */
app.delete('/api/control/unidades-de-negocio/:unidadId', authMiddleware, async (req, res) => {
    try {
        if (!req.user || !req.user.super_admin) {
            return res.status(403).json({ message: 'Forbidden: super_admin role required' });
        }
        const { unidadId } = req.params;
        const db = admin.firestore();

        // Check for active departments in this business unit
        const departmentsSnapshot = await db.collection('departamentos')
            .where('businessUnitId', '==', unidadId)
            .where('deleted', '==', false)
            .limit(1)
            .get();

        if (!departmentsSnapshot.empty) {
            return res.status(400).json({ message: 'No se puede eliminar la unidad de negocio porque contiene departamentos activos. Por favor, elimine los departamentos primero.' });
        }

        const businessUnitRef = db.collection('businessUnits').doc(unidadId);
        await businessUnitRef.update({
            deleted: true,
            deletedAt: new Date().toISOString(),
        });
        res.status(200).json({ message: 'Business unit deleted successfully' });
    } catch (error) {
        console.error('Error deleting business unit:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/unidades-de-negocio/{unidadId}/departamentos:
 *   post:
 *     summary: Crea un nuevo departamento para una unidad de negocio
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unidadId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Departamento creado
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/unidades-de-negocio/{unidadId}/departamentos:
 *   get:
 *     summary: Obtiene todos los departamentos de una unidad de negocio
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unidadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Lista de departamentos
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/departamentos/{id}:
 *   get:
 *     summary: Obtiene un departamento por ID
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Detalles del departamento
 *       '404':
 *         description: Departamento no encontrado
 */
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

/**
 * @swagger
 * /api/control/departamentos/{id}:
 *   get:
 *     summary: Obtiene un departamento por ID
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Detalles del departamento
 *       '404':
 *         description: Departamento no encontrado
 */
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

/**
 * @swagger
 * /api/control/departamentos/{deptoId}:
 *   delete:
 *     summary: Elimina un departamento (soft delete)
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deptoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Departamento eliminado
 *       '403':
 *         description: No autorizado
 */
app.delete('/api/control/departamentos/:deptoId', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { deptoId } = req.params;
        const db = admin.firestore();

        // Check for active groups in this department
        const groupsSnapshot = await db.collection('grupos')
            .where('departmentId', '==', deptoId)
            .where('deleted', '==', false)
            .limit(1)
            .get();

        if (!groupsSnapshot.empty) {
            return res.status(400).json({ message: 'No se puede eliminar el departamento porque contiene grupos activos. Por favor, elimine los grupos primero.' });
        }

        const departmentRef = db.collection('departamentos').doc(deptoId);
        await departmentRef.update({
            deleted: true,
            deletedAt: new Date().toISOString(),
        });
        res.status(200).json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/unidades-de-negocio/{unidadId}/departamentos/{deptoId}/grupos:
 *   get:
 *     summary: Obtiene todos los grupos de un departamento
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unidadId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: deptoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Lista de grupos
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/grupos/{id}:
 *   get:
 *     summary: Obtiene un grupo por ID
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Detalles del grupo
 *       '404':
 *         description: Grupo no encontrado
 */
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

/**
 * @swagger
 * /api/control/unidades-de-negocio/{unidadId}/departamentos/{deptoId}/grupos:
 *   post:
 *     summary: Crea un nuevo grupo para un departamento
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unidadId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: deptoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Grupo creado
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/grupos/{grupoId}:
 *   delete:
 *     summary: Elimina un grupo (soft delete)
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grupoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Grupo eliminado
 *       '403':
 *         description: No autorizado
 */
app.delete('/api/control/grupos/:grupoId', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { grupoId } = req.params;
        const db = admin.firestore();

        // Check for active concepts in this group
        const conceptsSnapshot = await db.collection('conceptos')
            .where('groupId', '==', grupoId)
            .where('deleted', '==', false)
            .limit(1)
            .get();

        if (!conceptsSnapshot.empty) {
            return res.status(400).json({ message: 'No se puede eliminar el grupo porque contiene conceptos activos. Por favor, elimine los conceptos primero.' });
        }

        const groupRef = db.collection('grupos').doc(grupoId);
        await groupRef.update({
            deleted: true,
            deletedAt: new Date().toISOString(),
        });
        res.status(200).json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/unidades-de-negocio/{unidadId}/departamentos/{deptoId}/grupos/{grupoId}/conceptos:
 *   get:
 *     summary: Obtiene todos los conceptos de un grupo
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unidadId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: deptoId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: grupoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Lista de conceptos
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/unidades-de-negocio/{unidadId}/departamentos/{deptoId}/grupos/{grupoId}/conceptos:
 *   post:
 *     summary: Crea un nuevo concepto para un grupo
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unidadId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: deptoId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: grupoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Concepto creado
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/unidades-de-negocio/{unidadId}:
 *   put:
 *     summary: Actualiza una unidad de negocio
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unidadId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               razonSocial:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Unidad de negocio actualizada
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/unidades-de-negocio/{unidadId}/departamentos/{deptoId}:
 *   put:
 *     summary: Actualiza un departamento
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unidadId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: deptoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Departamento actualizado
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/unidades-de-negocio/{unidadId}/departamentos/{deptoId}/grupos/{grupoId}:
 *   put:
 *     summary: Actualiza un grupo
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unidadId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: deptoId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: grupoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Grupo actualizado
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/unidades-de-negocio/{unidadId}/departamentos/{deptoId}/grupos/{grupoId}/conceptos/{conceptoId}:
 *   put:
 *     summary: Actualiza un concepto
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: unidadId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: deptoId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: grupoId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: conceptoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Concepto actualizado
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/conceptos/{conceptoId}:
 *   delete:
 *     summary: Elimina un concepto (soft delete)
 *     tags: [Catalogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conceptoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Concepto eliminado
 *       '403':
 *         description: No autorizado
 */
app.delete('/api/control/conceptos/:conceptoId', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { conceptoId } = req.params;
        const db = admin.firestore();
        const conceptRef = db.collection('conceptos').doc(conceptoId);
        await conceptRef.update({
            deleted: true,
            deletedAt: new Date().toISOString(),
        });
        res.status(200).json({ message: 'Concept deleted successfully' });
    } catch (error) {
        console.error('Error deleting concept:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// --- Supplier and Relationship Management ---

/**
 * @swagger
 * /api/control/proveedores:
 *   get:
 *     summary: Obtiene todos los proveedores
 *     tags: [Proveedores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de proveedores
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/proveedores:
 *   post:
 *     summary: Crea un nuevo proveedor
 *     tags: [Proveedores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Proveedor creado
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/proveedores/{proveedorId}:
 *   put:
 *     summary: Actualiza un proveedor
 *     tags: [Proveedores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: proveedorId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Proveedor actualizado
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/proveedores/{proveedorId}:
 *   delete:
 *     summary: Elimina un proveedor (soft delete)
 *     tags: [Proveedores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: proveedorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Proveedor eliminado
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/conceptos/{conceptoId}/proveedores:
 *   get:
 *     summary: Obtiene los proveedores asociados a un concepto
 *     tags: [Proveedores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conceptoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Lista de proveedores asociados
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/conceptos/{conceptoId}/proveedores:
 *   post:
 *     summary: Asocia un proveedor a un concepto
 *     tags: [Proveedores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conceptoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               proveedorId:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Proveedor asociado
 *       '403':
 *         description: No autorizado
 */
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

/**
 * @swagger
 * /api/control/conceptos/{conceptoId}/proveedores/{proveedorId}:
 *   delete:
 *     summary: Desasocia un proveedor de un concepto
 *     tags: [Proveedores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conceptoId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: proveedorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Proveedor desasociado
 *       '403':
 *         description: No autorizado
 */
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

// --- Sale Categories (categoriasDeVenta) Endpoints ---

/**
 * @swagger
 * /api/control/catalogo/categorias-venta:
 *   post:
 *     summary: Crea una nueva categoría de venta
 *     tags: [Catalogo de Venta]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               businessUnitId:
 *                 type: string
 *               departmentId:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Categoría de venta creada
 *       '400':
 *         description: Faltan campos requeridos
 *       '403':
 *         description: No autorizado
 */
app.post('/api/control/catalogo/categorias-venta', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { name, description, businessUnitId, departmentId } = req.body;

        if (!name || !businessUnitId || !departmentId) {
            return res.status(400).json({ message: 'Missing required fields: name, businessUnitId, departmentId' });
        }

        const newCategory = {
            name,
            description: description || '',
            businessUnitId,
            departmentId,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
        };

        const docRef = await db.collection('categoriasDeVenta').add(newCategory);
        res.status(201).json({ id: docRef.id, ...newCategory });
    } catch (error) {
        console.error('Error creating sale category:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/catalogo/categorias-venta:
 *   get:
 *     summary: Obtiene todas las categorías de venta
 *     tags: [Catalogo de Venta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de categorías de venta
 *       '403':
 *         description: No autorizado
 */
app.get('/api/control/catalogo/categorias-venta', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const snapshot = await db.collection('categoriasDeVenta')
            .where('deletedAt', '==', null)
            .orderBy('createdAt', 'desc')
            .get();

        const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error fetching sale categories:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/departamentos/{deptoId}/categorias-venta:
 *   get:
 *     summary: Obtiene todas las categorías de venta de un departamento específico
 *     tags: [Catalogo de Venta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deptoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Lista de categorías de venta para el departamento
 *       '403':
 *         description: No autorizado
 */
app.get('/api/control/departamentos/:deptoId/categorias-venta', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { deptoId } = req.params;
        const snapshot = await db.collection('categoriasDeVenta')
            .where('departmentId', '==', deptoId)
            .where('deletedAt', '==', null)
            .orderBy('createdAt', 'desc')
            .get();

        const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error fetching sale categories for department:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/catalogo/categorias-venta/{id}:
 *   put:
 *     summary: Actualiza una categoría de venta
 *     tags: [Catalogo de Venta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               businessUnitId:
 *                 type: string
 *               departmentId:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Categoría de venta actualizada
 *       '400':
 *         description: Faltan campos requeridos
 *       '403':
 *         description: No autorizado
 */
app.put('/api/control/catalogo/categorias-venta/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, businessUnitId, departmentId } = req.body;

        if (!name || !businessUnitId || !departmentId) {
            return res.status(400).json({ message: 'Missing required fields: name, businessUnitId, departmentId' });
        }

        const categoryRef = db.collection('categoriasDeVenta').doc(id);
        const updatedData = {
            name,
            description: description || '',
            businessUnitId,
            departmentId,
            updatedAt: new Date(),
        };

        await categoryRef.update(updatedData);
        res.status(200).json({ id, ...updatedData });
    } catch (error) {
        console.error('Error updating sale category:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/catalogo/categorias-venta/{id}:
 *   delete:
 *     summary: Elimina una categoría de venta (soft delete)
 *     tags: [Catalogo de Venta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Categoría de venta eliminada
 *       '400':
 *         description: No se puede eliminar porque tiene productos asociados
 *       '403':
 *         description: No autorizado
 */
app.delete('/api/control/catalogo/categorias-venta/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Protection against deleting a category that has products
        const productsSnapshot = await db.collection('productosDeVenta')
            .where('categoriaVentaId', '==', id)
            .where('deletedAt', '==', null)
            .limit(1)
            .get();

        if (!productsSnapshot.empty) {
            return res.status(400).json({ message: 'Cannot delete category with active products. Please delete products first.' });
        }

        const categoryRef = db.collection('categoriasDeVenta').doc(id);
        await categoryRef.update({
            deletedAt: new Date(),
        });

        res.status(200).json({ message: 'Sale category deleted successfully' });
    } catch (error) {
        console.error('Error deleting sale category:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// ... (otros endpoints)

// --- Productos de Venta Endpoints ---

// POST (Crear)

app.post('/api/control/productos-venta', authMiddleware, requireAdmin, async (req, res) => {

  const { 

    name, 

    price, 

    description, 

    imageUrl, 

    isAvailable, 

    cost, 

    platformFeePercent, 

    isTaxable,

    businessUnitId,

    departmentId,

    categoriaVentaId 

  } = req.body;

  if (!name || !price || !businessUnitId || !departmentId || !categoriaVentaId) {

    return res.status(400).send('Missing required fields: name, price, businessUnitId, departmentId, categoriaVentaId');

  }

  try {

    const finalPrice = parseFloat(price);

    const basePrice = isTaxable ? finalPrice / 1.16 : finalPrice;

    const newProduct = {

      name,

      price: finalPrice,

      basePrice,

      description: description || '',

      imageUrl: imageUrl || '',

      isAvailable: isAvailable !== undefined ? isAvailable : true,

      cost: cost ? parseFloat(cost) : 0,

      platformFeePercent: platformFeePercent ? parseFloat(platformFeePercent) : 0,

      isTaxable: isTaxable !== undefined ? isTaxable : true,

      businessUnitId,

      departmentId,

      categoriaVentaId,

      createdAt: new Date(),

      updatedAt: new Date(),

      deletedAt: null,

    };

    const docRef = await db.collection('productosDeVenta').add(newProduct);

    res.status(201).send({ id: docRef.id, ...newProduct });

  } catch (error) {

    console.error("Error creating sale product:", error);

    res.status(500).send('Internal Server Error');

  }

});

// GET (Listar)

app.get('/api/control/productos-venta', authMiddleware, requireAdmin, async (req, res) => {

  try {

    const snapshot = await db.collection('productosDeVenta').where('deletedAt', '==', null).orderBy('createdAt', 'desc').get();

    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(products);

  } catch (error) {

    console.error("Error fetching sale products:", error);

    res.status(500).send('Internal Server Error');

  }

});



// GET (Single by ID)

app.get('/api/control/productos-venta/:id', authMiddleware, requireAdmin, async (req, res) => {

  try {

    const { id } = req.params;

    const docRef = db.collection('productosDeVenta').doc(id);

    const docSnap = await docRef.get();



    if (!docSnap.exists) {

      return res.status(404).json({ message: 'Product not found' });

    }



    res.status(200).json({ id: docSnap.id, ...docSnap.data() });

  } catch (error) {

    console.error("Error fetching sale product:", error);

    res.status(500).send('Internal Server Error');

  }

});

// GET (Público - Menú)

app.get('/api/menu', async (req, res) => {

    try {

        console.log('[/api/menu] Fetching products...');

        const snapshot = await db.collection('productosDeVenta')

            .where('deletedAt', '==', null)

            .where('isAvailable', '==', true)

            .orderBy('createdAt', 'desc')

            .get();

        console.log('[/api/menu] Found', snapshot.size, 'products');

        const products = snapshot.docs.map(doc => {
            const data = doc.data();
            // Convert Firestore Timestamps to ISO strings for JSON serialization
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
                deletedAt: data.deletedAt?.toDate ? data.deletedAt.toDate().toISOString() : data.deletedAt,
            };
        });

        console.log('[/api/menu] Sending response with', products.length, 'products');

        res.status(200).json(products);

    } catch (error) {

        console.error("[/api/menu] Error fetching menu:", error);
        console.error("[/api/menu] Error stack:", error.stack);

        res.status(500).json({ message: 'Internal Server Error', error: error.message });

    }

});



// GET (Público - Categorías de Venta)

app.get('/api/categorias-venta', async (req, res) => {

    try {

        const snapshot = await db.collection('categoriasDeVenta')

            .where('deletedAt', '==', null)

            .orderBy('createdAt', 'desc')

            .get();

        const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json(categories);

    } catch (error) {

        console.error("Error fetching sale categories:", error);

                res.status(500).send('Internal Server Error');

            }

        });

        

        app.get('/api/generate-signed-url', async (req, res) => {
          const { filePath } = req.query;

          if (!filePath) {
            return res.status(400).send('Missing required query parameter: filePath');
          }

          try {
            const bucket = getStorage().bucket();
            const file = bucket.file(filePath);

            // Verify file exists
            const [exists] = await file.exists();
            if (!exists) {
              return res.status(404).send('File not found');
            }

            // Generate a download token (works without service account JSON)
            const [metadata] = await file.getMetadata();

            // If file already has a downloadToken, use it
            let token = metadata.metadata?.firebaseStorageDownloadTokens;

            // If no token exists, create one
            if (!token) {
              const crypto = require('crypto');
              token = crypto.randomUUID();

              await file.setMetadata({
                metadata: {
                  firebaseStorageDownloadTokens: token
                }
              });
            }

            // Build the public URL with token
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;

            res.status(200).json({ signedUrl: publicUrl });

          } catch (error) {
            console.error('Error generating signed URL:', error);
            res.status(500).send('Internal Server Error');
          }
        });

        

        // PUT (Actualizar)

        app.put('/api/control/productos-venta/:id', authMiddleware, requireAdmin, async (req, res) => {

          const { id } = req.params;

          const { 

            name, 

            price,  

    description, 

    imageUrl, 

    isAvailable, 

    cost, 

    platformFeePercent, 

    isTaxable,

    businessUnitId,

    departmentId,

    categoriaVentaId 

  } = req.body;

  if (!name || !price || !businessUnitId || !departmentId || !categoriaVentaId) {

    return res.status(400).send('Missing required fields: name, price, businessUnitId, departmentId, categoriaVentaId');

  }

  try {

    const docRef = db.collection('productosDeVenta').doc(id);

    const finalPrice = parseFloat(price);

    const basePrice = isTaxable ? finalPrice / 1.16 : finalPrice;

    const updatedProduct = {

      name,

      price: finalPrice,

      basePrice,

      description: description || '',

      imageUrl: imageUrl || '',

      isAvailable: isAvailable !== undefined ? isAvailable : true,

      cost: cost ? parseFloat(cost) : 0,

      platformFeePercent: platformFeePercent ? parseFloat(platformFeePercent) : 0,

      isTaxable: isTaxable !== undefined ? isTaxable : true,

      businessUnitId,

      departmentId,

      categoriaVentaId,

      updatedAt: new Date(),

    };

    await docRef.update(updatedProduct);

    res.status(200).send({ id, ...updatedProduct });

  } catch (error) {

    console.error("Error updating sale product:", error);

    res.status(500).send('Internal Server Error');

  }

});

// DELETE (Borrado Lógico)

app.delete('/api/control/productos-venta/:id', authMiddleware, requireAdmin, async (req, res) => {

  const { id } = req.params;

  try {

    const docRef = db.collection('productosDeVenta').doc(id);

    await docRef.update({ deletedAt: new Date() });

    res.status(200).send({ id, message: 'Product soft deleted' });

  } catch (error) {

    console.error("Error soft deleting sale product:", error);

    res.status(500).send('Internal Server Error');

  }

});

                    

                    

                    // --- User Profile and Addresses ---

// Get user profile
app.get('/api/me/profile', authMiddleware, async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.user.uid);
    const doc = await userRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Update user profile
app.put('/api/me/profile', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber } = req.body;
    const userRef = db.collection('users').doc(req.user.uid);

    const updateData = {
      firstName,
      lastName,
      phoneNumber,
      updatedAt: new Date().toISOString(),
    };

    await userRef.update(updateData);
    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get all user addresses
app.get('/api/me/addresses', authMiddleware, async (req, res) => {
  try {
    const addressesRef = db.collection('users').doc(req.user.uid).collection('delivery_addresses');
    const snapshot = await addressesRef.get();
    const addresses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(addresses);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Add a new address
app.post('/api/me/addresses', authMiddleware, async (req, res) => {
  try {
    const { streetAddress, city, state, zipCode } = req.body;
    if (!streetAddress || !city || !state || !zipCode) {
      return res.status(400).json({ message: 'Missing required address fields' });
    }
    const addressesRef = db.collection('users').doc(req.user.uid).collection('delivery_addresses');
    const newAddress = { streetAddress, city, state, zipCode };
    const docRef = await addressesRef.add(newAddress);
    res.status(201).json({ id: docRef.id, ...newAddress });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Update an address
app.put('/api/me/addresses/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { streetAddress, city, state, zipCode } = req.body;
    if (!streetAddress || !city || !state || !zipCode) {
      return res.status(400).json({ message: 'Missing required address fields' });
    }
    const addressRef = db.collection('users').doc(req.user.uid).collection('delivery_addresses').doc(id);
    await addressRef.update({ streetAddress, city, state, zipCode });
    res.status(200).json({ message: 'Address updated successfully' });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Delete an address
app.delete('/api/me/addresses/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const addressRef = db.collection('users').doc(req.user.uid).collection('delivery_addresses').doc(id);
    await addressRef.delete();
    res.status(200).json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Set default address
app.put('/api/me/addresses/set-default/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userRef = db.collection('users').doc(req.user.uid);
    await userRef.update({ defaultDeliveryAddressId: id });
    res.status(200).json({ message: 'Default address updated successfully' });
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// --- Cart Verification ---
app.post('/api/cart/verify-totals', async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ message: 'Request body must contain an array of items.' });
  }

  try {
    let grandSubtotal = 0;
    let grandTotal = 0;
    const detailedItems = [];

    for (const item of items) {
      if (!item.productId || !item.quantity) {
        return res.status(400).json({ message: `Invalid item in cart: ${JSON.stringify(item)}` });
      }

      const productRef = db.collection('productosDeVenta').doc(item.productId);
      const docSnap = await productRef.get();

      if (!docSnap.exists) {
        return res.status(400).json({ message: `Producto con ID ${item.productId} no encontrado.` });
      }

      const productData = docSnap.data();
      let itemSubtotal = productData.basePrice || 0;
      let itemTotal = productData.price || 0;
      let customName = productData.name;
      const addedCustomizations = [];

      // Handle added ingredients securely from DB
      if (item.customizations && item.customizations.added && Array.isArray(item.customizations.added)) {
        for (const addedName of item.customizations.added) {
          const extra = (productData.ingredientesExtra || []).find(e => e.nombre === addedName);
          if (extra && extra.precio) {
            const extraPrice = parseFloat(extra.precio);
            // If the main product is taxable, assume extras are too.
            const extraBasePrice = productData.isTaxable ? extraPrice / 1.16 : extraPrice;
            itemSubtotal += extraBasePrice;
            itemTotal += extraPrice;
            addedCustomizations.push(extra.nombre);
          }
        }
      }
      
      if (addedCustomizations.length > 0) {
        customName = `${productData.name} (+ ${addedCustomizations.join(', ')})`;
      }

      const finalItemSubtotal = itemSubtotal * item.quantity;
      const finalItemTotal = itemTotal * item.quantity;

      grandSubtotal += finalItemSubtotal;
      grandTotal += finalItemTotal;

      detailedItems.push({
        ...item,
        name: customName,
        subtotalItem: finalItemSubtotal,
        totalItem: finalItemTotal,
        removed: (item.customizations && item.customizations.removed) || [],
      });
    }

    const ivaDesglosado = grandTotal - grandSubtotal;

    res.status(200).json({
      items: detailedItems,
      summary: {
        subtotalGeneral: grandSubtotal,
        ivaDesglosado: ivaDesglosado,
        totalFinal: grandTotal,
      },
    });

  } catch (error) {
    console.error("Error verifying cart totals:", error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});


module.exports = app;

