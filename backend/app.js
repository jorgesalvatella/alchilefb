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

// --- Payment Methods Management ---

/**
 * @swagger
 * /api/control/metodos-pago:
 *   get:
 *     summary: Obtiene todos los métodos de pago
 *     tags: [Metodos de Pago]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de métodos de pago
 *       '403':
 *         description: No autorizado
 */
app.get('/api/control/metodos-pago', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const db = admin.firestore();
        const snapshot = await db.collection('paymentMethods')
            .where('deleted', '==', false)
            .orderBy('name', 'asc')
            .get();

        const paymentMethods = [];
        snapshot.forEach(doc => {
            paymentMethods.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(paymentMethods);
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/metodos-pago:
 *   post:
 *     summary: Crea un nuevo método de pago
 *     tags: [Metodos de Pago]
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
 *               active:
 *                 type: boolean
 *     responses:
 *       '201':
 *         description: Método de pago creado
 *       '400':
 *         description: Datos inválidos
 *       '403':
 *         description: No autorizado
 */
app.post('/api/control/metodos-pago', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { name, description, active } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Missing required field: name' });
        }

        const db = admin.firestore();
        const newPaymentMethod = {
            name,
            description: description || '',
            active: active !== undefined ? active : true,
            deleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const docRef = await db.collection('paymentMethods').add(newPaymentMethod);
        res.status(201).json({ id: docRef.id, ...newPaymentMethod });
    } catch (error) {
        console.error('Error creating payment method:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/metodos-pago/{metodoPagoId}:
 *   put:
 *     summary: Actualiza un método de pago
 *     tags: [Metodos de Pago]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: metodoPagoId
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
 *               active:
 *                 type: boolean
 *     responses:
 *       '200':
 *         description: Método de pago actualizado
 *       '403':
 *         description: No autorizado
 */
app.put('/api/control/metodos-pago/:metodoPagoId', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { metodoPagoId } = req.params;
        const { name, description, active } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Missing required field: name' });
        }

        const db = admin.firestore();
        const paymentMethodRef = db.collection('paymentMethods').doc(metodoPagoId);
        const updatedData = {
            name,
            description: description || '',
            active: active !== undefined ? active : true,
            updatedAt: new Date().toISOString(),
        };

        await paymentMethodRef.update(updatedData);
        res.status(200).json({ id: metodoPagoId, ...updatedData });
    } catch (error) {
        console.error('Error updating payment method:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/metodos-pago/{metodoPagoId}:
 *   delete:
 *     summary: Elimina un método de pago (soft delete)
 *     tags: [Metodos de Pago]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: metodoPagoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Método de pago eliminado
 *       '403':
 *         description: No autorizado
 */
app.delete('/api/control/metodos-pago/:metodoPagoId', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }
        const { metodoPagoId } = req.params;
        const db = admin.firestore();
        const paymentMethodRef = db.collection('paymentMethods').doc(metodoPagoId);

        await paymentMethodRef.update({
            deleted: true,
            deletedAt: new Date().toISOString(),
        });

        res.status(200).json({ message: 'Payment method deleted successfully' });
    } catch (error) {
        console.error('Error deleting payment method:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// --- Expenses Management ---

/**
 * Helper function: Generate incremental expense ID
 * Format: YYYYMM-NNN (e.g., 202501-001, 202501-002, 202502-001)
 */
async function generateExpenseId(db) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}${month}`;

    // Get all expenses for this month
    const snapshot = await db.collection('expenses')
        .where('expenseId', '>=', `${prefix}-000`)
        .where('expenseId', '<=', `${prefix}-999`)
        .orderBy('expenseId', 'desc')
        .limit(1)
        .get();

    let nextNumber = 1;
    if (!snapshot.empty) {
        const lastExpenseId = snapshot.docs[0].data().expenseId;
        const lastNumber = parseInt(lastExpenseId.split('-')[1]);
        nextNumber = lastNumber + 1;
    }

    const numberStr = String(nextNumber).padStart(3, '0');
    return `${prefix}-${numberStr}`;
}

/**
 * @swagger
 * /api/control/gastos/upload-receipt:
 *   post:
 *     summary: Sube una imagen de comprobante para un gasto
 *     tags: [Gastos]
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
 *       '400':
 *         description: No se proporcionó archivo
 *       '401':
 *         description: No autorizado
 *       '500':
 *         description: Error del servidor
 */
app.post('/api/control/gastos/upload-receipt', authMiddleware, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded.' });
  }

  try {
    const bucket = getStorage().bucket();
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const storagePath = `gastos/comprobantes/${fileName}`;
    const fileRef = bucket.file(storagePath);

    // Upload file
    await fileRef.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Generate download token
    const crypto = require('crypto');
    const token = crypto.randomUUID();
    await fileRef.setMetadata({
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    });

    // Create public URL with token
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;

    res.status(200).send({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading receipt image:', error);
    res.status(500).send({ message: 'Internal Server Error', error: error.message });
  }
});

/**
 * @swagger
 * /api/control/gastos:
 *   get:
 *     summary: Obtiene todos los gastos con filtros opcionales
 *     tags: [Gastos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending, approved, rejected]
 *       - in: query
 *         name: businessUnitId
 *         schema:
 *           type: string
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Lista de gastos
 *       '403':
 *         description: No autorizado
 */
app.get('/api/control/gastos', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }

        const { status, businessUnitId, departmentId, supplierId } = req.query;
        const db = admin.firestore();
        let query = db.collection('expenses').where('deleted', '==', false);

        // Apply filters
        if (status) query = query.where('status', '==', status);
        if (businessUnitId) query = query.where('businessUnitId', '==', businessUnitId);
        if (departmentId) query = query.where('departmentId', '==', departmentId);
        if (supplierId) query = query.where('supplierId', '==', supplierId);

        query = query.orderBy('expenseDate', 'desc');

        const snapshot = await query.get();
        const expenses = [];
        snapshot.forEach(doc => {
            expenses.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/gastos:
 *   post:
 *     summary: Crea un nuevo gasto
 *     tags: [Gastos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - businessUnitId
 *               - departmentId
 *               - groupId
 *               - conceptId
 *               - supplierId
 *               - paymentMethodId
 *               - amount
 *               - currency
 *               - expenseDate
 *     responses:
 *       '201':
 *         description: Gasto creado
 *       '400':
 *         description: Datos inválidos
 *       '403':
 *         description: No autorizado
 */
app.post('/api/control/gastos', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }

        const {
            businessUnitId, departmentId, groupId, conceptId, supplierId,
            paymentMethodId, amount, currency, expenseDate, invoiceNumber,
            dueDate, description, authorizedBy, receiptImageUrl
        } = req.body;

        // Validate required fields
        if (!businessUnitId || !departmentId || !groupId || !conceptId || !supplierId || !paymentMethodId || !amount || !currency || !expenseDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const db = admin.firestore();

        // Validate supplier is associated with concept
        const conceptDoc = await db.collection('conceptos').doc(conceptId).get();
        if (!conceptDoc.exists) {
            return res.status(400).json({ message: 'Concept not found' });
        }
        const conceptData = conceptDoc.data();
        if (!conceptData.proveedoresIds || !conceptData.proveedoresIds.includes(supplierId)) {
            return res.status(400).json({ message: 'Supplier is not associated with this concept' });
        }

        // Generate incremental expense ID
        const expenseId = await generateExpenseId(db);

        const newExpense = {
            expenseId,
            businessUnitId,
            departmentId,
            groupId,
            conceptId,
            supplierId,
            paymentMethodId,
            amount: parseFloat(amount),
            currency,
            expenseDate: new Date(expenseDate).toISOString(),
            invoiceNumber: invoiceNumber || '',
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            description: description || '',
            authorizedBy: authorizedBy || '',
            receiptImageUrl: receiptImageUrl || '',
            status: 'draft',
            createdBy: req.user.uid,
            createdAt: new Date().toISOString(),
            deleted: false,
        };

        const docRef = await db.collection('expenses').add(newExpense);
        res.status(201).json({ id: docRef.id, ...newExpense });
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/gastos/{expenseId}:
 *   put:
 *     summary: Actualiza un gasto (solo super_admin puede editar en cualquier estado)
 *     tags: [Gastos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Gasto actualizado
 *       '403':
 *         description: No autorizado
 */
app.put('/api/control/gastos/:expenseId', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }

        const { expenseId } = req.params;
        const db = admin.firestore();
        const expenseRef = db.collection('expenses').doc(expenseId);
        const expenseDoc = await expenseRef.get();

        if (!expenseDoc.exists) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        const currentExpense = expenseDoc.data();

        // Only super_admin can edit in any state, others only in 'draft' or 'rejected'
        if (!req.user.super_admin && !['draft', 'rejected'].includes(currentExpense.status)) {
            return res.status(403).json({ message: 'Only super_admin can edit expenses in this state' });
        }

        const {
            businessUnitId, departmentId, groupId, conceptId, supplierId,
            paymentMethodId, amount, currency, expenseDate, invoiceNumber,
            dueDate, description, authorizedBy, receiptImageUrl
        } = req.body;

        const updatedData = {
            ...(businessUnitId && { businessUnitId }),
            ...(departmentId && { departmentId }),
            ...(groupId && { groupId }),
            ...(conceptId && { conceptId }),
            ...(supplierId && { supplierId }),
            ...(paymentMethodId && { paymentMethodId }),
            ...(amount && { amount: parseFloat(amount) }),
            ...(currency && { currency }),
            ...(expenseDate && { expenseDate: new Date(expenseDate).toISOString() }),
            invoiceNumber: invoiceNumber || currentExpense.invoiceNumber,
            dueDate: dueDate ? new Date(dueDate).toISOString() : currentExpense.dueDate,
            description: description !== undefined ? description : currentExpense.description,
            authorizedBy: authorizedBy !== undefined ? authorizedBy : currentExpense.authorizedBy,
            receiptImageUrl: receiptImageUrl !== undefined ? receiptImageUrl : currentExpense.receiptImageUrl,
            updatedAt: new Date().toISOString(),
        };

        await expenseRef.update(updatedData);
        res.status(200).json({ id: expenseId, ...currentExpense, ...updatedData });
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/gastos/{expenseId}/submit:
 *   post:
 *     summary: Envía un gasto para aprobación (draft -> pending)
 *     tags: [Gastos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Gasto enviado para aprobación
 *       '400':
 *         description: Estado inválido
 *       '403':
 *         description: No autorizado
 */
app.post('/api/control/gastos/:expenseId/submit', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }

        const { expenseId } = req.params;
        const db = admin.firestore();
        const expenseRef = db.collection('expenses').doc(expenseId);
        const expenseDoc = await expenseRef.get();

        if (!expenseDoc.exists) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        const currentExpense = expenseDoc.data();

        if (!['draft', 'rejected'].includes(currentExpense.status)) {
            return res.status(400).json({ message: 'Expense must be in draft or rejected status to submit' });
        }

        if (!currentExpense.receiptImageUrl) {
            return res.status(400).json({ message: 'Receipt image is required before submitting' });
        }

        await expenseRef.update({
            status: 'pending',
            rejectionReason: null,
            updatedAt: new Date().toISOString(),
        });

        res.status(200).json({ message: 'Expense submitted for approval' });
    } catch (error) {
        console.error('Error submitting expense:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/gastos/{expenseId}/approve:
 *   post:
 *     summary: Aprueba un gasto (solo super_admin)
 *     tags: [Gastos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Gasto aprobado
 *       '400':
 *         description: Estado inválido
 *       '403':
 *         description: No autorizado (solo super_admin)
 */
app.post('/api/control/gastos/:expenseId/approve', authMiddleware, async (req, res) => {
    try {
        if (!req.user || !req.user.super_admin) {
            return res.status(403).json({ message: 'Forbidden: super_admin role required' });
        }

        const { expenseId } = req.params;
        const db = admin.firestore();
        const expenseRef = db.collection('expenses').doc(expenseId);
        const expenseDoc = await expenseRef.get();

        if (!expenseDoc.exists) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        const currentExpense = expenseDoc.data();

        if (currentExpense.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending expenses can be approved' });
        }

        await expenseRef.update({
            status: 'approved',
            approvedBy: req.user.uid,
            approvedAt: new Date().toISOString(),
            rejectionReason: null,
            updatedAt: new Date().toISOString(),
        });

        res.status(200).json({ message: 'Expense approved successfully' });
    } catch (error) {
        console.error('Error approving expense:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/gastos/{expenseId}/reject:
 *   post:
 *     summary: Rechaza un gasto (solo super_admin, vuelve a estado draft)
 *     tags: [Gastos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejectionReason
 *             properties:
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Gasto rechazado
 *       '400':
 *         description: Estado inválido o falta motivo
 *       '403':
 *         description: No autorizado (solo super_admin)
 */
app.post('/api/control/gastos/:expenseId/reject', authMiddleware, async (req, res) => {
    try {
        if (!req.user || !req.user.super_admin) {
            return res.status(403).json({ message: 'Forbidden: super_admin role required' });
        }

        const { expenseId } = req.params;
        const { rejectionReason } = req.body;

        if (!rejectionReason || !rejectionReason.trim()) {
            return res.status(400).json({ message: 'Rejection reason is required' });
        }

        const db = admin.firestore();
        const expenseRef = db.collection('expenses').doc(expenseId);
        const expenseDoc = await expenseRef.get();

        if (!expenseDoc.exists) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        const currentExpense = expenseDoc.data();

        if (currentExpense.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending expenses can be rejected' });
        }

        await expenseRef.update({
            status: 'draft', // Vuelve a draft para corrección
            rejectionReason,
            approvedBy: null,
            approvedAt: null,
            updatedAt: new Date().toISOString(),
        });

        res.status(200).json({ message: 'Expense rejected and returned to draft' });
    } catch (error) {
        console.error('Error rejecting expense:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/control/gastos/{expenseId}:
 *   delete:
 *     summary: Elimina un gasto (soft delete)
 *     tags: [Gastos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Gasto eliminado
 *       '403':
 *         description: No autorizado
 */
app.delete('/api/control/gastos/:expenseId', authMiddleware, async (req, res) => {
    try {
        if (!req.user || (!req.user.admin && !req.user.super_admin)) {
            return res.status(403).json({ message: 'Forbidden: admin or super_admin role required' });
        }

        const { expenseId } = req.params;
        const db = admin.firestore();
        const expenseRef = db.collection('expenses').doc(expenseId);
        const expenseDoc = await expenseRef.get();

        if (!expenseDoc.exists) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        await expenseRef.update({
            deleted: true,
            deletedAt: new Date().toISOString(),
        });

        res.status(200).json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// --- Driver Management ---

/**
 * @swagger
 * /api/control/unlinked-repartidor-users:
 *   get:
 *     summary: Obtiene usuarios de Firebase Auth con rol 'repartidor' que no tienen un perfil de repartidor en Firestore
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de usuarios repartidores sin perfil de repartidor
 *       '403':
 *         description: No autorizado
 *       '500':
 *         description: Error del servidor
 */
app.get('/api/control/unlinked-repartidor-users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    // 1. Obtener todos los usuarios de Firebase Auth
    let listUsersResult = await admin.auth().listUsers();
    let allAuthUsers = listUsersResult.users;

    // Continuar paginando si hay más usuarios
    while (listUsersResult.pageToken) {
      listUsersResult = await admin.auth().listUsers(1000, listUsersResult.pageToken);
      allAuthUsers = allAuthUsers.concat(listUsersResult.users);
    }

    // 2. Filtrar usuarios que tienen el custom claim 'repartidor'
    const repartidorAuthUsers = allAuthUsers.filter(userRecord =>
      userRecord.customClaims && userRecord.customClaims.repartidor === true
    );

    // 3. Obtener todos los userId de la colección 'repartidores' en Firestore
    const existingRepartidoresSnapshot = await db.collection('repartidores').select('userId').get();
    const existingRepartidorUserIds = new Set();
    existingRepartidoresSnapshot.forEach(doc => {
      const userId = doc.data().userId;
      if (userId) {
        existingRepartidorUserIds.add(userId);
      }
    });

    // 4. Filtrar los usuarios de Auth que tienen el claim 'repartidor' pero no tienen un perfil en Firestore
    const unlinkedRepartidorUsers = repartidorAuthUsers.filter(userRecord =>
      !existingRepartidorUserIds.has(userRecord.uid)
    ).map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || userRecord.email,
      phoneNumber: userRecord.phoneNumber || null,
    }));

    res.status(200).json(unlinkedRepartidorUsers);

  } catch (error) {
    console.error('Error fetching unlinked repartidor users:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

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
    let driversQuery = db.collection('repartidores');

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
    const { name, phone, vehicle, userId } = req.body;

    if (!name || !userId) {
      return res.status(400).json({ message: 'Los campos "name" y "userId" son requeridos.' });
    }

    // Verificar que el userId corresponde a un usuario de Firebase Auth con claim repartidor
    const firebaseUser = await admin.auth().getUser(userId);
    if (!firebaseUser || !firebaseUser.customClaims || !firebaseUser.customClaims.repartidor) {
      return res.status(400).json({ message: 'El userId proporcionado no corresponde a un usuario repartidor válido.' });
    }

    // Verificar que el userId no esté ya asociado a un repartidor existente
    const existingDriverSnapshot = await db.collection('repartidores').where('userId', '==', userId).limit(1).get();
    if (!existingDriverSnapshot.empty) {
      return res.status(409).json({ message: 'Este usuario ya está asociado a un repartidor existente.' });
    }

    const newDriver = {
      userId,
      name,
      phone: phone || '',
      vehicle: vehicle || '',
      status: 'available', // Default status
      currentOrderId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      deleted: false,
    };

    const docRef = await db.collection('repartidores').add(newDriver);

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
    // Buscar productos marcados como destacados (isFeatured: true) y disponibles
    const snapshot = await db.collection('productosDeVenta')
      .where('deletedAt', '==', null)
      .where('isFeatured', '==', true)
      .where('isAvailable', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(4)
      .get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    // Mapear productos
    const products = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        price: data.price,
        imageUrl: data.imageUrl,
        description: data.description,
      };
    });

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
        price: data.packagePrice || 0,
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

/**
 * @swagger
 * /api/control/promotions/{id}/toggle-featured:
 *   put:
 *     summary: Toggle featured status for a promotion
 *     tags: [Control - Promociones]
 *     security:
 *       - BearerAuth: []
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
 *             required:
 *               - isFeatured
 *             properties:
 *               isFeatured:
 *                 type: boolean
 *     responses:
 *       '200':
 *         description: Featured status actualizado
 *       '400':
 *         description: Parámetro inválido
 *       '403':
 *         description: No autorizado
 *       '404':
 *         description: Promoción no encontrada
 */
app.put('/api/control/promotions/:id/toggle-featured', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured } = req.body;

    if (typeof isFeatured !== 'boolean') {
      return res.status(400).json({ message: 'Missing required field: isFeatured (must be a boolean)' });
    }

    const docRef = db.collection('promotions').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }

    await docRef.update({
      isFeatured: isFeatured,
      updatedAt: new Date(),
    });

    res.status(200).json({ id, message: `Promotion feature status set to ${isFeatured}` });
  } catch (error) {
    console.error('[PUT /api/control/promotions/:id/toggle-featured] ERROR:', error);
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

app.put('/api/me/addresses/set-default/:id', authMiddleware, async (req, res) => {
    const { uid } = req.user;
    const { id } = req.params;

    try {
        const userRef = db.collection('users').doc(uid);
        await userRef.update({ defaultAddressId: id });
        res.status(200).json({ message: 'Default address updated successfully' });
    } catch (error) {
        console.error('Error setting default address:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/api/me/password-changed', authMiddleware, async (req, res) => {
    const { uid } = req.user;

    try {
        const userDocRef = db.collection('users').doc(uid);
        const docSnap = await userDocRef.get();

        if (docSnap.exists()) {
            // If doc exists, just update the flag
            await userDocRef.update({
                forcePasswordChange: false,
            });
        } else {
            // If doc does not exist, create it to repair data inconsistency
            console.warn(`User document missing for UID: ${uid}. Creating it now.`);
            const userRecord = await admin.auth().getUser(uid);
            await userDocRef.set({
                email: userRecord.email,
                displayName: userRecord.displayName || 'Usuario',
                role: 'usuario', // Default role
                active: true,
                deleted: false,
                createdAt: new Date().toISOString(),
                forcePasswordChange: false, // Ensure flag is false on creation
            });
        }

        res.status(200).json({ message: 'Password change process completed successfully.' });
    } catch (error) {
        console.error(`[DEBUG] Error processing password change completion for user ${uid}:`, JSON.stringify(error, null, 2));
        res.status(500).json({ message: 'Internal Server Error while finalizing password change.' });
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

// --- Phone Verification Module ---
const verificationRouter = require('./verification/phone-verification-routes');
app.use('/api/verification', verificationRouter);

// --- FCM Push Notifications Module ---
const fcmRouter = require('./routes/fcm');
app.use('/api/fcm', fcmRouter);

// ==========================================
// MÓDULO DE GESTIÓN DE USUARIOS
// ==========================================

/**
 * @swagger
 * /api/control/usuarios:
 *   get:
 *     summary: Listar todos los usuarios del sistema
 *     tags: [Control - Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [usuario, repartidor, admin, super_admin]
 *         description: Filtrar por rol
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo/inactivo
 *       - in: query
 *         name: sucursalId
 *         schema:
 *           type: string
 *         description: Filtrar por sucursal
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *       403:
 *         description: No autorizado (requiere admin o super_admin)
 *       500:
 *         description: Error del servidor
 */
app.get('/api/control/usuarios', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { role, active, sucursalId } = req.query;

    // Obtener todos los usuarios de Firebase Auth
    let listUsersResult = await admin.auth().listUsers();
    let allUsers = listUsersResult.users;

    // Continuar paginando si hay más usuarios
    while (listUsersResult.pageToken) {
      listUsersResult = await admin.auth().listUsers(1000, listUsersResult.pageToken);
      allUsers = allUsers.concat(listUsersResult.users);
    }

    // Obtener información adicional de Firestore si existe
    const usersCollection = db.collection('users');
    const firestoreUsersSnapshot = await usersCollection.where('deleted', '==', false).get();
    const firestoreUsersMap = new Map();

    firestoreUsersSnapshot.forEach(doc => {
      firestoreUsersMap.set(doc.id, doc.data());
    });

    // Combinar información de Auth y Firestore
    let users = allUsers.map(userRecord => {
      const firestoreData = firestoreUsersMap.get(userRecord.uid) || {};
      const customClaims = userRecord.customClaims || {};

      // Determinar rol del usuario
      let userRole = 'usuario'; // Rol por defecto
      if (customClaims.super_admin) userRole = 'super_admin';
      else if (customClaims.admin) userRole = 'admin';
      else if (customClaims.repartidor) userRole = 'repartidor';

      return {
        id: userRecord.uid,
        email: userRecord.email || '',
        displayName: userRecord.displayName || firestoreData.displayName || '',
        phoneNumber: userRecord.phoneNumber || firestoreData.phoneNumber || '',
        photoURL: userRecord.photoURL || firestoreData.photoURL || '',
        role: userRole,
        active: !userRecord.disabled,
        sucursalIds: firestoreData.sucursalIds || [],
        departamento: firestoreData.area || '',
        createdAt: userRecord.metadata.creationTime,
        lastLogin: userRecord.metadata.lastSignInTime || null,
        deleted: false,
      };
    });

    // Aplicar filtros
    if (role) {
      users = users.filter(u => u.role === role);
    }
    if (active !== undefined) {
      const isActive = active === 'true' || active === true;
      users = users.filter(u => u.active === isActive);
    }
    if (sucursalId) {
      users = users.filter(u => u.sucursalIds && u.sucursalIds.includes(sucursalId));
    }

    // Ordenar por fecha de creación descendente
    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/control/usuarios/{userId}:
 *   patch:
 *     summary: Actualizar información de un usuario (rol, estado, etc.)
 *     tags: [Control - Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: UID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [usuario, repartidor, admin, super_admin]
 *               active:
 *                 type: boolean
 *               sucursalId:
 *                 type: string
 *               departamento:
 *                 type: string
 *               displayName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
app.patch('/api/control/usuarios/:userId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, active, sucursalIds, area, displayName, phoneNumber } = req.body;

    // Validación de phoneNumber si se proporciona
    if (phoneNumber !== undefined) {
      // Limpiar el teléfono de caracteres no numéricos
      const cleaned = phoneNumber.replace(/\D/g, '');

      // Validar formato: exactamente 10 dígitos
      if (cleaned.length !== 10) {
        return res.status(400).json({
          message: 'El teléfono debe tener exactamente 10 dígitos'
        });
      }

      // Validar unicidad: verificar que no exista otro usuario con este teléfono
      const formattedPhone = `+52${cleaned}`;

      // Buscar en Firebase Auth
      try {
        const existingUserByPhone = await admin.auth().getUserByPhoneNumber(formattedPhone);
        // Si encontramos un usuario y NO es el que estamos actualizando
        if (existingUserByPhone && existingUserByPhone.uid !== userId) {
          return res.status(400).json({
            message: 'Este número de teléfono ya está registrado por otro usuario'
          });
        }
      } catch (error) {
        // Si el error es "user not found", significa que el teléfono está disponible (OK)
        if (error.code !== 'auth/user-not-found') {
          // Si es otro tipo de error, lanzarlo
          throw error;
        }
      }
    }

    // Verificar que el usuario existe
    let targetUser;
    try {
      targetUser = await admin.auth().getUser(userId);
    } catch (error) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Obtener custom claims del usuario objetivo
    const targetClaims = targetUser.customClaims || {};
    const isTargetSuperAdmin = targetClaims.super_admin === true;

    // Verificar permisos según jerarquía
    const isSuperAdmin = req.user.super_admin === true;
    const isAdmin = req.user.admin === true;

    // Admin no puede modificar super_admins
    if (isAdmin && !isSuperAdmin && isTargetSuperAdmin) {
      return res.status(403).json({
        message: 'Forbidden: Admin cannot modify Super Admin users'
      });
    }

    // Admin no puede asignar rol de super_admin
    if (isAdmin && !isSuperAdmin && role === 'super_admin') {
      return res.status(403).json({
        message: 'Forbidden: Admin cannot assign Super Admin role'
      });
    }

    // Actualizar custom claims si se cambió el rol
    if (role) {
      const newClaims = {};

      switch (role) {
        case 'super_admin':
          newClaims.super_admin = true;
          newClaims.admin = true; // Super admin también es admin
          newClaims.repartidor = false;
          break;
        case 'admin':
          newClaims.super_admin = false;
          newClaims.admin = true;
          newClaims.repartidor = false;
          break;
        case 'repartidor':
          newClaims.super_admin = false;
          newClaims.admin = false;
          newClaims.repartidor = true;
          break;
        case 'usuario':
        default:
          newClaims.super_admin = false;
          newClaims.admin = false;
          newClaims.repartidor = false;
          break;
      }

      await admin.auth().setCustomUserClaims(userId, newClaims);
    }

    // Actualizar Firebase Auth (phoneNumber y/o estado activo)
    const authUpdateData = {};
    if (active !== undefined) {
      authUpdateData.disabled = !active;
    }
    if (phoneNumber !== undefined) {
      const cleaned = phoneNumber.replace(/\D/g, '');
      authUpdateData.phoneNumber = `+52${cleaned}`;
    }
    if (Object.keys(authUpdateData).length > 0) {
      await admin.auth().updateUser(userId, authUpdateData);
    }

    // Actualizar información en Firestore
    const userRef = db.collection('users').doc(userId);
    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    if (role !== undefined) updateData.role = role;
    if (active !== undefined) updateData.active = active;
    if (sucursalIds !== undefined) updateData.sucursalIds = sucursalIds;
    if (area !== undefined) updateData.area = area;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (phoneNumber !== undefined) {
      const cleaned = phoneNumber.replace(/\D/g, '');
      updateData.phoneNumber = `+52${cleaned}`;
    }

    // Verificar si el documento existe, si no, crearlo
    const userDoc = await userRef.get();
    const previousRole = userDoc.exists ? userDoc.data().role : null;

    if (!userDoc.exists) {
      updateData.createdAt = new Date().toISOString();
      updateData.deleted = false;
      await userRef.set(updateData);
    } else {
      await userRef.update(updateData);
    }

    // --- AUTO-GESTIÓN DE DOCUMENTO EN COLECCIÓN 'repartidores' ---

    // Caso 1: Se asigna role 'repartidor' → Auto-crear documento si no existe
    if (role === 'repartidor' && previousRole !== 'repartidor') {
      console.log(`[PATCH /api/control/usuarios/${userId}] Asignando role 'repartidor', verificando documento en colección 'repartidores'...`);

      // Verificar si ya existe un documento de repartidor para este userId
      const existingDriverSnapshot = await db.collection('repartidores')
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (existingDriverSnapshot.empty) {
        // No existe → Crear nuevo documento
        const newDriverData = {
          userId: userId,
          name: displayName || targetUser.displayName || targetUser.email?.split('@')[0] || 'Repartidor',
          phone: phoneNumber || targetUser.phoneNumber || '',
          vehicle: '',
          status: 'offline',
          currentOrderId: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          deleted: false,
        };

        const newDriverRef = await db.collection('repartidores').add(newDriverData);
        console.log(`[PATCH /api/control/usuarios/${userId}] ✅ Documento de repartidor auto-creado con ID: ${newDriverRef.id}`);
      } else {
        // Ya existe → Verificar si está soft-deleted y reactivarlo
        const existingDriverDoc = existingDriverSnapshot.docs[0];
        const existingDriverData = existingDriverDoc.data();

        if (existingDriverData.deleted === true) {
          await existingDriverDoc.ref.update({
            deleted: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`[PATCH /api/control/usuarios/${userId}] ✅ Documento de repartidor reactivado (deleted: false)`);
        } else {
          console.log(`[PATCH /api/control/usuarios/${userId}] ℹ️ Documento de repartidor ya existe, no se realizan cambios.`);
        }
      }
    }

    // Caso 2: Se QUITA role 'repartidor' → Soft-delete del documento
    if (previousRole === 'repartidor' && role && role !== 'repartidor') {
      console.log(`[PATCH /api/control/usuarios/${userId}] Quitando role 'repartidor', soft-deleting documento en colección 'repartidores'...`);

      const driverDocsSnapshot = await db.collection('repartidores')
        .where('userId', '==', userId)
        .get();

      for (const driverDoc of driverDocsSnapshot.docs) {
        await driverDoc.ref.update({
          deleted: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[PATCH /api/control/usuarios/${userId}] ✅ Documento de repartidor ${driverDoc.id} marcado como deleted: true`);
      }
    }

    res.status(200).json({
      message: 'User updated successfully',
      userId,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/control/usuarios/{userId}:
 *   delete:
 *     summary: Eliminar (deshabilitar) un usuario del sistema
 *     tags: [Control - Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: UID del usuario
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
 *       403:
 *         description: No autorizado (solo super_admin)
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
app.delete('/api/control/usuarios/:userId', authMiddleware, async (req, res) => {
    // Solo super_admin puede eliminar
    if (!req.user.super_admin) {
        return res.status(403).json({ message: 'Forbidden: Solo los super administradores pueden eliminar usuarios.' });
    }

    const { userId } = req.params;

    try {
        // Eliminar de Firebase Authentication
        await admin.auth().deleteUser(userId);

        // Marcar como eliminado en Firestore
        const userDocRef = db.collection('users').doc(userId);
        await userDocRef.update({
            active: false,
            deleted: true,
deletedAt: new Date().toISOString(),
        });

        res.status(200).json({ message: 'Usuario eliminado exitosamente.' });
    } catch (error) {
        console.error(`Error al eliminar usuario ${userId}:`, error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar el usuario.', error: error.message });
    }
});

/**
 * @swagger
 * /api/control/usuarios/{uid}/generar-clave:
 *   post:
 *     summary: Genera una contraseña temporal para un usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: El UID del usuario para el cual generar una nueva contraseña.
 *     responses:
 *       '200':
 *         description: Contraseña temporal generada exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 temporaryPassword:
 *                   type: string
 *                   description: La nueva contraseña temporal para el usuario.
 *       '403':
 *         description: No autorizado. Se requiere rol de admin o super_admin.
 *       '404':
 *         description: Usuario no encontrado.
 *       '500':
 *         description: Error interno del servidor.
 */
app.post('/api/control/usuarios/:uid/generar-clave', authMiddleware, requireAdmin, async (req, res) => {
    const { uid } = req.params;

    // Helper function to generate a random password
    const generateSecurePassword = () => {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let retVal = "";
        for (let i = 0, n = charset.length; i < length; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * n));
        }
        return retVal;
    };

    try {
        const temporaryPassword = generateSecurePassword();

        // Update password in Firebase Auth
        await admin.auth().updateUser(uid, {
            password: temporaryPassword,
        });

        // Set flag in Firestore to force password change on next login
        const userDocRef = db.collection('users').doc(uid);
        await userDocRef.update({
            forcePasswordChange: true,
        });

        res.status(200).json({ temporaryPassword });

    } catch (error) {
        console.error(`Error al generar la contraseña para el usuario ${uid}:`, error);
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.status(500).json({ message: 'Error interno del servidor al generar la contraseña.', error: error.message });
    }
});

// === WhatsApp Verification Routes ===
// COMMENTED OUT: This was part of archived WhatsApp verification module
// const authRoutes = require('./routes/auth');
// app.use('/api/auth', authRoutes);

/**
 * @swagger
 * /api/config/init-logo:
 *   post:
 *     summary: Inicializar configuración del logo en Firestore
 *     description: Crea el documento de configuración inicial con el path del logo. Solo accesible por admin/super_admin.
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración inicializada correctamente
 *       403:
 *         description: Acceso denegado
 *       500:
 *         description: Error interno del servidor
 */
app.post('/api/config/init-logo', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const configRef = db.collection('config').doc('site');

    // Crear o actualizar la configuración del logo
    await configRef.set({
      logoPath: 'logos/header-logo.png',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid || 'system'
    }, { merge: true });

    res.status(200).json({
      message: 'Configuración del logo inicializada correctamente',
      logoPath: 'logos/header-logo.png'
    });
  } catch (error) {
    console.error('Error al inicializar configuración del logo:', error);
    res.status(500).json({
      message: 'Error al inicializar configuración',
      error: error.message
    });
  }
});

module.exports = app;

