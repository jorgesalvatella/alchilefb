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

// --- Helper Functions ---

/**
 * Obtiene o crea la categoría especial para promociones/paquetes
 * @param {string} type - 'package' o 'promotion'
 * @returns {Promise<string|null>} - ID de la categoría o null si no se pudo crear
 */
async function getOrCreatePromotionCategory(type) {
  const categoryName = type === 'package' ? 'Paquetes' : 'Promociones';

  try {
    // Buscar si ya existe la categoría
    const existingSnapshot = await db.collection('categoriasDeVenta')
      .where('name', '==', categoryName)
      .where('deletedAt', '==', null)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return existingSnapshot.docs[0].id;
    }

    // Si no existe, necesitamos obtener la primera unidad de negocio y departamento
    // Buscar businessUnits activas (sin deletedAt o con deletedAt = null)
    const allBusinessUnits = await db.collection('businessUnits').limit(10).get();

    // Filtrar las que no están eliminadas (deletedAt es null o undefined)
    const activeBusinessUnits = allBusinessUnits.docs.filter(doc => {
      const data = doc.data();
      return !data.deletedAt || data.deletedAt === null;
    });

    if (activeBusinessUnits.length === 0) {
      return null;
    }

    // Intentar encontrar una businessUnit que tenga departamentos
    let businessUnitId = null;
    let businessUnitData = null;
    let activeDepartments = [];

    for (const businessUnit of activeBusinessUnits) {
      const tempBusinessUnitId = businessUnit.id;
      const tempBusinessUnitData = businessUnit.data();

      // Obtener departamentos de esta unidad de negocio
      const allDepartments = await db.collection('departamentos')
        .where('businessUnitId', '==', tempBusinessUnitId)
        .limit(10)
        .get();

      // Filtrar los que no están eliminados
      const tempActiveDepartments = allDepartments.docs.filter(doc => {
        const data = doc.data();
        return !data.deletedAt || data.deletedAt === null;
      });

      if (tempActiveDepartments.length > 0) {
        // Encontramos una businessUnit con departamentos!
        businessUnitId = tempBusinessUnitId;
        businessUnitData = tempBusinessUnitData;
        activeDepartments = tempActiveDepartments;
        break;
      }
    }

    if (!businessUnitId || activeDepartments.length === 0) {
      return null;
    }

    const departmentId = activeDepartments[0].id;
    const departmentData = activeDepartments[0].data();

    // Crear la categoría
    const newCategory = {
      name: categoryName,
      description: `Categoría automática para ${categoryName.toLowerCase()}`,
      businessUnitId,
      departmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    const docRef = await db.collection('categoriasDeVenta').add(newCategory);

    return docRef.id;
  } catch (error) {
    console.error(`Error al obtener/crear categoría ${categoryName}:`, error);
    return null;
  }
}

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
 * /api/control/promociones/upload-image:
 *   post:
 *     summary: Sube una imagen para un paquete
 *     tags: [Promociones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '200':
 *         description: Imagen subida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                 storagePath:
 *                   type: string
 *       '400':
 *         description: No se subió ningún archivo
 *       '403':
 *         description: No autorizado
 */
app.post('/api/control/promociones/upload-image', authMiddleware, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded.' });
  }

  try {
    const bucket = getStorage().bucket();
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const storagePath = `paquetes/${fileName}`;
    const fileRef = bucket.file(storagePath);

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

    res.status(200).send({
      url: publicUrl,
      storagePath: storagePath
    });
  } catch (error) {
    console.error('Error uploading package image:', error);
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
    console.error('[GET /api/control/unidades-de-negocio] ERROR:', error);
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

// --- Driver Management ---

/**
 * @swagger
 * /api/control/drivers:
 *   get:
 *     summary: Obtiene una lista de repartidores
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, busy, offline]
 *         description: Filtrar repartidores por estado.
 *     responses:
 *       '200':
 *         description: Lista de repartidores
 *       '403':
 *         description: No autorizado
 */
app.get('/api/control/drivers', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let driversQuery = db.collection('drivers');

    if (status) {
      driversQuery = driversQuery.where('status', '==', status);
    }

    const snapshot = await driversQuery.get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(drivers);

  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/control/drivers:
 *   post:
 *     summary: Crea un nuevo repartidor
 *     tags: [Repartidores]
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
 *               phone:
 *                 type: string
 *               vehicle:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Repartidor creado exitosamente
 *       '400':
 *         description: Faltan campos requeridos
 *       '403':
 *         description: No autorizado
 */
app.post('/api/control/drivers', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { name, phone, vehicle } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El campo "name" es requerido.' });
    }

    const newDriver = {
      name,
      phone: phone || '',
      vehicle: vehicle || '',
      status: 'available', // Default status
      currentOrderId: null,
      createdAt: new Date(),
    };

    const docRef = await db.collection('drivers').add(newDriver);

    res.status(201).json({ id: docRef.id, ...newDriver });

  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
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

      categoriaVentaId,

      ingredientesBase,

      ingredientesExtra

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

        ingredientesBase: ingredientesBase || [],

        ingredientesExtra: ingredientesExtra || [],

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

            const products = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    price: data.price,
                    description: data.description,
                    imageUrl: data.imageUrl,
                    isAvailable: data.isAvailable,
                    isTaxable: data.isTaxable,
                    cost: data.cost,
                    platformFeePercent: data.platformFeePercent,
                    basePrice: data.basePrice,
                    businessUnitId: data.businessUnitId,
                    departmentId: data.departmentId,
                    categoriaVentaId: data.categoriaVentaId,
                    ingredientesBase: data.ingredientesBase || [],
                    ingredientesExtra: data.ingredientesExtra || [],
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
                };
            });
    res.status(200).json(products);

  } catch (error) {

    console.error("Error fetching sale products:", error);

    res.status(500).send('Internal Server Error');

  }

});

// GET publico para los productos destacados (solo 4 para home page)
app.get('/api/productos-venta/latest', async (req, res) => {
  try {
    // Buscar productos marcados como destacados (isFeatured: true)
    const snapshot = await db.collection('productosDeVenta')
      .where('deletedAt', '==', null)
      .where('isFeatured', '==', true)
      .limit(10) // Traer algunos extras para filtrar
      .get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    // Filtrar y mapear en memoria
    const products = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          price: data.price,
          imageUrl: data.imageUrl,
          description: data.description,
          isAvailable: data.isAvailable !== false, // Default true si no existe
          createdAt: data.createdAt,
        };
      })
      .filter(product => product.isAvailable) // Filtrar disponibles
      .sort((a, b) => {
        // Ordenar por createdAt desc
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      })
      .slice(0, 4) // Solo 4 productos destacados
      .map(({ createdAt, isAvailable, ...product }) => product); // Limpiar campos

    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching featured sale products:", error);
    // Devolver array vacío en lugar de error 500
    res.status(200).json([]);
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

        const snapshot = await db.collection('productosDeVenta')

            .where('deletedAt', '==', null)

            .where('isAvailable', '==', true)

            .orderBy('createdAt', 'desc')

            .get();

        const products = snapshot.docs.map(doc => {
            const data = doc.data();
            // Explicitly map all fields to ensure everything is included
            return {
                id: doc.id,
                name: data.name,
                price: data.price,
                basePrice: data.basePrice,
                description: data.description,
                imageUrl: data.imageUrl,
                isAvailable: data.isAvailable,
                cost: data.cost,
                platformFeePercent: data.platformFeePercent,
                isTaxable: data.isTaxable,
                businessUnitId: data.businessUnitId,
                departmentId: data.departmentId,
                categoriaVentaId: data.categoriaVentaId,
                ingredientesBase: data.ingredientesBase || [],
                ingredientesExtra: data.ingredientesExtra || [],
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
                deletedAt: data.deletedAt?.toDate ? data.deletedAt.toDate().toISOString() : data.deletedAt,
            };
        });

        res.status(200).json(products);

    } catch (error) {

        console.error("[/api/menu] Error fetching menu:", error);

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

        categoriaVentaId,

        ingredientesBase,

        ingredientesExtra

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

          ingredientesBase: ingredientesBase || [],

          ingredientesExtra: ingredientesExtra || [],

          updatedAt: new Date(),

        };

    await docRef.update(updatedProduct);

    res.status(200).send({ id, ...updatedProduct });

  } catch (error) {

    console.error("Error updating sale product:", error);

    res.status(500).send('Internal Server Error');

  }

});

// PUT (Toggle Featured)
app.put('/api/control/productos-venta/:id/toggle-featured', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { isFeatured } = req.body;

  if (typeof isFeatured !== 'boolean') {
    return res.status(400).send({ message: 'Missing required field: isFeatured (must be a boolean)' });
  }

  try {
    const docRef = db.collection('productosDeVenta').doc(id);
    await docRef.update({
      isFeatured: isFeatured,
      updatedAt: new Date(),
    });
    res.status(200).send({ id, message: `Product feature status set to ${isFeatured}` });
  } catch (error) {
    console.error("Error toggling product feature status:", error);
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

                    

                    

// --- Promotions Management ---

/**
 * @swagger
 * /api/promotions:
 *   get:
 *     summary: Obtiene todas las promociones activas (endpoint público)
 *     tags: [Promociones]
 *     responses:
 *       '200':
 *         description: Lista de promociones activas
 */
app.get('/api/promotions', async (req, res) => {
  try {
    const snapshot = await db.collection('promotions')
      .where('isActive', '==', true)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const now = new Date();
    const promotions = [];

    snapshot.forEach(doc => {
      const data = doc.data();

      // Validar vigencia de fechas
      if (data.startDate && data.startDate.toDate() > now) {
        return; // Promoción aún no inicia
      }
      if (data.endDate && data.endDate.toDate() < now) {
        return; // Promoción ya expiró
      }

      promotions.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        type: data.type,
        isActive: data.isActive,
        categoryId: data.categoryId,
        startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : null,
        endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : null,
        // Campos específicos de paquetes
        packagePrice: data.packagePrice,
        packageItems: data.packageItems,
        imagePath: data.imagePath,
        imageUrl: data.imageUrl,
        // Campos específicos de promociones
        promoType: data.promoType,
        promoValue: data.promoValue,
        appliesTo: data.appliesTo,
        targetIds: data.targetIds,
      });
    });

    res.status(200).json(promotions);
  } catch (error) {
    console.error('[GET /api/promotions] ERROR:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

/**
 * @swagger
 * /api/promotions/featured:
 *   get:
 *     summary: Obtiene promociones/paquetes destacados (solo 4 para home page)
 *     tags: [Promociones]
 *     responses:
 *       '200':
 *         description: Lista de promociones destacadas
 */
app.get('/api/promotions/featured', async (req, res) => {
  try {
    const snapshot = await db.collection('promotions')
      .where('isActive', '==', true)
      .where('deletedAt', '==', null)
      .where('isFeatured', '==', true) // Solo las marcadas como destacadas
      .limit(10) // Traer extras para filtrar
      .get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const now = new Date();
    const promotions = [];

    snapshot.forEach(doc => {
      const data = doc.data();

      // Validar vigencia de fechas
      if (data.startDate && data.startDate.toDate() > now) {
        return; // Promoción aún no inicia
      }
      if (data.endDate && data.endDate.toDate() < now) {
        return; // Promoción ya expiró
      }

      promotions.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        type: data.type,
        packagePrice: data.packagePrice,
        imageUrl: data.imageUrl,
        createdAt: data.createdAt,
      });
    });

    // Ordenar y limitar a 4
    const featured = promotions
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      })
      .slice(0, 4)
      .map(({ createdAt, ...promo }) => promo);

    res.status(200).json(featured);
  } catch (error) {
    console.error('[GET /api/promotions/featured] ERROR:', error);
    // Devolver array vacío en lugar de error
    res.status(200).json([]);
  }
});

/**
 * @swagger
 * /api/control/promotions:
 *   get:
 *     summary: Obtiene todas las promociones (admin)
 *     tags: [Promociones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de todas las promociones
 *       '403':
 *         description: No autorizado
 */
app.get('/api/control/promotions', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('promotions')
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get();

    const promotions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        type: data.type,
        isActive: data.isActive,
        categoryId: data.categoryId,
        startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : null,
        endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : null,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        packagePrice: data.packagePrice,
        packageItems: data.packageItems,
        imagePath: data.imagePath,
        imageUrl: data.imageUrl,
        promoType: data.promoType,
        promoValue: data.promoValue,
        appliesTo: data.appliesTo,
        targetIds: data.targetIds,
      };
    });

    res.status(200).json(promotions);
  } catch (error) {
    console.error('[GET /api/control/promotions] ERROR:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

/**
 * @swagger
 * /api/control/promotions:
 *   post:
 *     summary: Crea una nueva promoción (admin)
 *     tags: [Promociones]
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
 *               type:
 *                 type: string
 *                 enum: [package, promotion]
 *     responses:
 *       '201':
 *         description: Promoción creada
 *       '400':
 *         description: Datos inválidos
 *       '403':
 *         description: No autorizado
 */
app.post('/api/control/promotions', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      isActive,
      startDate,
      endDate,
      packagePrice,
      packageItems,
      imagePath,
      imageUrl,
      promoType,
      promoValue,
      appliesTo,
      targetIds
    } = req.body;

    // Validaciones básicas
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El campo "name" es requerido' });
    }

    if (!type || !['package', 'promotion'].includes(type)) {
      return res.status(400).json({ message: 'El campo "type" debe ser "package" o "promotion"' });
    }

    // Validaciones de fechas
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        return res.status(400).json({
          message: 'La fecha de fin debe ser posterior a la fecha de inicio'
        });
      }
    }

    // Validaciones específicas de paquetes
    if (type === 'package') {
      if (!packagePrice || packagePrice <= 0) {
        return res.status(400).json({
          message: 'El campo "packagePrice" debe ser mayor a 0 para paquetes'
        });
      }

      if (!packageItems || !Array.isArray(packageItems) || packageItems.length === 0) {
        return res.status(400).json({
          message: 'El campo "packageItems" debe contener al menos un producto'
        });
      }

      // Validar que todos los productos existen y no están eliminados
      for (const item of packageItems) {
        const productDoc = await db.collection('productosDeVenta').doc(item.productId).get();
        if (!productDoc.exists) {
          return res.status(400).json({
            message: `Producto ${item.productId} no encontrado`
          });
        }
        const productData = productDoc.data();
        if (productData.deletedAt !== null) {
          return res.status(400).json({
            message: `Producto ${item.name} está eliminado y no puede usarse en paquetes`
          });
        }
      }
    }

    // Validaciones específicas de promociones
    if (type === 'promotion') {
      if (!promoType || !['percentage', 'fixed_amount'].includes(promoType)) {
        return res.status(400).json({
          message: 'El campo "promoType" debe ser "percentage" o "fixed_amount"'
        });
      }

      if (promoType === 'percentage') {
        if (promoValue < 0 || promoValue > 100) {
          return res.status(400).json({
            message: 'El descuento porcentual debe estar entre 0 y 100'
          });
        }
      }

      if (promoType === 'fixed_amount') {
        if (promoValue < 0) {
          return res.status(400).json({
            message: 'El descuento fijo no puede ser negativo'
          });
        }
      }

      if (!appliesTo || !['product', 'category', 'total_order'].includes(appliesTo)) {
        return res.status(400).json({
          message: 'El campo "appliesTo" debe ser "product", "category" o "total_order"'
        });
      }

      // Validar targetIds para promociones específicas
      if (appliesTo !== 'total_order') {
        if (!targetIds || targetIds.length === 0) {
          return res.status(400).json({
            message: 'El campo "targetIds" es requerido cuando appliesTo es "product" o "category"'
          });
        }

        // Validar que las categorías existan
        if (appliesTo === 'category') {
          for (const catId of targetIds) {
            const catDoc = await db.collection('categoriasDeVenta').doc(catId).get();
            if (!catDoc.exists || catDoc.data().deletedAt !== null) {
              return res.status(400).json({
                message: `Categoría ${catId} no existe o está eliminada`
              });
            }
          }
        }

        // Validar que los productos existan
        if (appliesTo === 'product') {
          for (const prodId of targetIds) {
            const prodDoc = await db.collection('productosDeVenta').doc(prodId).get();
            if (!prodDoc.exists || prodDoc.data().deletedAt !== null) {
              return res.status(400).json({
                message: `Producto ${prodId} no existe o está eliminado`
              });
            }
          }
        }
      }
    }

    // Crear el documento
    const newPromotion = {
      name,
      description: description || '',
      type,
      isActive: isActive !== undefined ? isActive : true,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    // Obtener o crear la categoría automáticamente
    const categoryId = await getOrCreatePromotionCategory(type);
    if (categoryId) {
      newPromotion.categoryId = categoryId;
    }

    // Agregar campos específicos según el tipo
    if (type === 'package') {
      newPromotion.packagePrice = packagePrice;
      newPromotion.packageItems = packageItems;
      if (imagePath) {
        newPromotion.imagePath = imagePath;
      }
      if (imageUrl) {
        newPromotion.imageUrl = imageUrl;
      }
    } else if (type === 'promotion') {
      newPromotion.promoType = promoType;
      newPromotion.promoValue = promoValue;
      newPromotion.appliesTo = appliesTo;
      newPromotion.targetIds = targetIds || [];
    }

    const docRef = await db.collection('promotions').add(newPromotion);

    res.status(201).json({ id: docRef.id, ...newPromotion });
  } catch (error) {
    console.error('[POST /api/control/promotions] ERROR:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

/**
 * @swagger
 * /api/control/promotions/{id}:
 *   get:
 *     summary: Obtiene una promoción específica por ID (admin)
 *     tags: [Promociones]
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
 *         description: Promoción encontrada
 *       '404':
 *         description: Promoción no encontrada
 *       '403':
 *         description: No autorizado
 */
app.get('/api/control/promotions/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const docRef = db.collection('promotions').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }

    const data = docSnap.data();

    // Verificar que no esté eliminada
    if (data.deletedAt !== null) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }

    const promotion = {
      id: docSnap.id,
      name: data.name,
      description: data.description,
      type: data.type,
      isActive: data.isActive,
      categoryId: data.categoryId,
      startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : null,
      endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : null,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      packagePrice: data.packagePrice,
      packageItems: data.packageItems,
      imagePath: data.imagePath,
      imageUrl: data.imageUrl,
      promoType: data.promoType,
      promoValue: data.promoValue,
      appliesTo: data.appliesTo,
      targetIds: data.targetIds,
    };

    res.status(200).json(promotion);
  } catch (error) {
    console.error(`[GET /api/control/promotions/:id] ERROR:`, error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

/**
 * @swagger
 * /api/control/promotions/{id}:
 *   put:
 *     summary: Actualiza una promoción (admin)
 *     tags: [Promociones]
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
 *         description: Promoción actualizada
 *       '400':
 *         description: Datos inválidos
 *       '403':
 *         description: No autorizado
 *       '404':
 *         description: Promoción no encontrada
 */
app.put('/api/control/promotions/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      type,
      isActive,
      startDate,
      endDate,
      packagePrice,
      packageItems,
      imagePath,
      imageUrl,
      promoType,
      promoValue,
      appliesTo,
      targetIds
    } = req.body;

    // Verificar que el documento existe
    const docRef = db.collection('promotions').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }

    // Validaciones (mismas que en POST)
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El campo "name" es requerido' });
    }

    if (!type || !['package', 'promotion'].includes(type)) {
      return res.status(400).json({ message: 'El campo "type" debe ser "package" o "promotion"' });
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        return res.status(400).json({
          message: 'La fecha de fin debe ser posterior a la fecha de inicio'
        });
      }
    }

    if (type === 'package') {
      if (!packagePrice || packagePrice <= 0) {
        return res.status(400).json({
          message: 'El campo "packagePrice" debe ser mayor a 0 para paquetes'
        });
      }

      if (!packageItems || !Array.isArray(packageItems) || packageItems.length === 0) {
        return res.status(400).json({
          message: 'El campo "packageItems" debe contener al menos un producto'
        });
      }

      for (const item of packageItems) {
        const productDoc = await db.collection('productosDeVenta').doc(item.productId).get();
        if (!productDoc.exists) {
          return res.status(400).json({
            message: `Producto ${item.productId} no encontrado`
          });
        }
        const productData = productDoc.data();
        if (productData.deletedAt !== null) {
          return res.status(400).json({
            message: `Producto ${item.name} está eliminado y no puede usarse en paquetes`
          });
        }
      }
    }

    if (type === 'promotion') {
      if (!promoType || !['percentage', 'fixed_amount'].includes(promoType)) {
        return res.status(400).json({
          message: 'El campo "promoType" debe ser "percentage" o "fixed_amount"'
        });
      }

      if (promoType === 'percentage') {
        if (promoValue < 0 || promoValue > 100) {
          return res.status(400).json({
            message: 'El descuento porcentual debe estar entre 0 y 100'
          });
        }
      }

      if (promoType === 'fixed_amount') {
        if (promoValue < 0) {
          return res.status(400).json({
            message: 'El descuento fijo no puede ser negativo'
          });
        }
      }

      if (!appliesTo || !['product', 'category', 'total_order'].includes(appliesTo)) {
        return res.status(400).json({
          message: 'El campo "appliesTo" debe ser "product", "category" o "total_order"'
        });
      }

      if (appliesTo !== 'total_order') {
        if (!targetIds || targetIds.length === 0) {
          return res.status(400).json({
            message: 'El campo "targetIds" es requerido cuando appliesTo es "product" o "category"'
          });
        }

        if (appliesTo === 'category') {
          for (const catId of targetIds) {
            const catDoc = await db.collection('categoriasDeVenta').doc(catId).get();
            if (!catDoc.exists || catDoc.data().deletedAt !== null) {
              return res.status(400).json({
                message: `Categoría ${catId} no existe o está eliminada`
              });
            }
          }
        }

        if (appliesTo === 'product') {
          for (const prodId of targetIds) {
            const prodDoc = await db.collection('productosDeVenta').doc(prodId).get();
            if (!prodDoc.exists || prodDoc.data().deletedAt !== null) {
              return res.status(400).json({
                message: `Producto ${prodId} no existe o está eliminado`
              });
            }
          }
        }
      }
    }

    // Actualizar el documento
    const updatedPromotion = {
      name,
      description: description || '',
      type,
      isActive: isActive !== undefined ? isActive : true,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      updatedAt: new Date(),
    };

    if (type === 'package') {
      updatedPromotion.packagePrice = packagePrice;
      updatedPromotion.packageItems = packageItems;
      if (imagePath) {
        updatedPromotion.imagePath = imagePath;
      }
      if (imageUrl) {
        updatedPromotion.imageUrl = imageUrl;
      }
    } else if (type === 'promotion') {
      updatedPromotion.promoType = promoType;
      updatedPromotion.promoValue = promoValue;
      updatedPromotion.appliesTo = appliesTo;
      updatedPromotion.targetIds = targetIds || [];
    }

    await docRef.update(updatedPromotion);

    res.status(200).json({ id, ...updatedPromotion });
  } catch (error) {
    console.error('[PUT /api/control/promotions/:id] ERROR:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

/**
 * @swagger
 * /api/control/promotions/{id}:
 *   delete:
 *     summary: Elimina una promoción (soft delete)
 *     tags: [Promociones]
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
 *         description: Promoción eliminada
 *       '403':
 *         description: No autorizado
 *       '404':
 *         description: Promoción no encontrada
 */
app.delete('/api/control/promotions/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection('promotions').doc(id);

    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }

    // Soft delete: marcar como eliminado y desactivar
    await docRef.update({
      deletedAt: new Date(),
      isActive: false
    });

    res.status(200).json({ message: 'Promoción eliminada exitosamente' });
  } catch (error) {
    console.error('[DELETE /api/control/promotions/:id] ERROR:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Endpoint temporal de migración para asignar categoryId a paquetes existentes
app.post('/api/control/promotions/migrate-categories', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('promotions')
      .where('deletedAt', '==', null)
      .get();

    let updatedCount = 0;
    const batch = db.batch();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Si no tiene categoryId, asignarlo
      if (!data.categoryId) {
        const categoryId = await getOrCreatePromotionCategory(data.type);
        if (categoryId) {
          batch.update(doc.ref, { categoryId, updatedAt: new Date() });
          updatedCount++;
        }
      }
    }

    await batch.commit();

    res.status(200).json({
      message: 'Migración completada',
      updated: updatedCount
    });
  } catch (error) {
    console.error('[MIGRATION] ERROR:', error);
    res.status(500).json({ message: 'Error en migración', error: error.message });
  }
});

                    // --- User Profile and Addresses ---

app.get('/api/me/orders', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('pedidos')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/api/me/orders/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const docRef = db.collection('pedidos').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderData = docSnap.data();

    // Security check: ensure the user is requesting their own order
    if (orderData.userId !== userId) {
      return res.status(404).json({ message: 'Order not found' }); // Use 404 to avoid revealing existence
    }

    res.status(200).json({ id: docSnap.id, ...orderData });
  } catch (error) {
    console.error('Error fetching single order:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// --- User Profile Endpoints ---
app.get('/api/me/profile', authMiddleware, async (req, res) => {
  try {
    const user = await admin.auth().getUser(req.user.uid);
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    const profileData = {
      email: user.email,
      uid: user.uid,
      ...(userDoc.exists ? userDoc.data() : {})
    };

    res.status(200).json(profileData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Update user profile
app.put('/api/me/profile', authMiddleware, async (req, res) => {
  try {
    console.log('[PUT /api/me/profile] Request received');
    console.log('[PUT /api/me/profile] User UID:', req.user?.uid);
    console.log('[PUT /api/me/profile] Body:', req.body);

    const { firstName, lastName, phoneNumber } = req.body;
    const userRef = db.collection('users').doc(req.user.uid);

    const updateData = {
      firstName,
      lastName,
      phoneNumber,
      updatedAt: new Date().toISOString(),
    };

    console.log('[PUT /api/me/profile] Updating with data:', updateData);

    // Use set with merge to create document if it doesn't exist
    await userRef.set(updateData, { merge: true });

    console.log('[PUT /api/me/profile] Profile updated successfully');
    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('[PUT /api/me/profile] ERROR:', error);
    console.error('[PUT /api/me/profile] Error message:', error.message);
    console.error('[PUT /api/me/profile] Error stack:', error.stack);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// ===================================================================
// DEPRECATED: Saved Addresses System (Replaced by real-time geolocation)
// ===================================================================
// The following endpoints are commented out as we now use geolocation
// at checkout time instead of managing saved addresses.
// Keep this code for potential future reference or rollback.
// ===================================================================

/*
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
    const { streetAddress, city, state, zipCode, lat, lng, formattedAddress } = req.body;
    if (!streetAddress || !city || !state || !zipCode) {
      return res.status(400).json({ message: 'Missing required address fields' });
    }
    const addressesRef = db.collection('users').doc(req.user.uid).collection('delivery_addresses');
    const newAddress = {
      streetAddress,
      city,
      state,
      zipCode,
      lat: lat || null,
      lng: lng || null,
      formattedAddress: formattedAddress || null
    };
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
    const { streetAddress, city, state, zipCode, lat, lng, formattedAddress } = req.body;
    if (!streetAddress || !city || !state || !zipCode) {
      return res.status(400).json({ message: 'Missing required address fields' });
    }
    const addressRef = db.collection('users').doc(req.user.uid).collection('delivery_addresses').doc(id);
    await addressRef.update({
      streetAddress,
      city,
      state,
      zipCode,
      lat: lat || null,
      lng: lng || null,
      formattedAddress: formattedAddress || null
    });
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
*/

// --- Cart Verification ---
const cartRouter = require('./cart').router;
app.use('/api/cart', cartRouter);

const pedidosRouter = require('./pedidos');
app.use('/api/pedidos', pedidosRouter);

// --- Repartidores Module ---
const repartidoresRouter = require('./repartidores');
app.use('/api/repartidores', repartidoresRouter);
// Los endpoints de pedidos del repartidor también están en el módulo repartidores
// pero se montan en /api/pedidos para mantener consistencia
app.use('/api/pedidos', repartidoresRouter);

module.exports = app;

