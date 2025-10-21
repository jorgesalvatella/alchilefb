
const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Mock de firebase-admin
const mockUpdateUser = jest.fn();
const mockUserDocUpdate = jest.fn();

jest.mock('firebase-admin', () => {
    const firestore = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn(() => ({
            update: mockUserDocUpdate,
        })),
    };

    return {
        initializeApp: jest.fn(),
        auth: () => ({
            updateUser: mockUpdateUser,
        }),
        firestore: () => firestore,
    };
});

// Mock del middleware de autenticación
jest.mock('./authMiddleware', () => jest.fn((req, res, next) => {
    if (req.headers.authorization) {
        const token = req.headers.authorization.split('Bearer ')[1];
        if (token === 'test-super-admin-token') {
            req.user = { uid: 'super-admin-uid', super_admin: true, admin: true };
        } else if (token === 'test-admin-token') {
            req.user = { uid: 'admin-uid', admin: true };
        } else {
            req.user = { uid: 'regular-user-uid' };
        }
    }
    next();
}));

describe('User Management API', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/control/usuarios/:uid/generar-clave', () => {
        const targetUserId = 'test-user-to-update';

        it('should return 403 for a non-admin user', async () => {
            const res = await request(app)
                .post(`/api/control/usuarios/${targetUserId}/generar-clave`)
                .set('Authorization', 'Bearer test-regular-user-token');

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toContain('admin or super_admin role required');
        });

        it('should return 404 if the user is not found', async () => {
            mockUpdateUser.mockRejectedValue({ code: 'auth/user-not-found' });

            const res = await request(app)
                .post(`/api/control/usuarios/non-existent-user/generar-clave`)
                .set('Authorization', 'Bearer test-admin-token');

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('Usuario no encontrado.');
        });

        it('should return 500 for other auth errors', async () => {
            mockUpdateUser.mockRejectedValue(new Error('Some other auth error'));

            const res = await request(app)
                .post(`/api/control/usuarios/${targetUserId}/generar-clave`)
                .set('Authorization', 'Bearer test-admin-token');

            expect(res.statusCode).toBe(500);
            expect(res.body.message).toContain('Error interno del servidor');
        });

        it('should successfully generate a password for an admin user', async () => {
            mockUpdateUser.mockResolvedValue({});
            mockUserDocUpdate.mockResolvedValue({});

            const res = await request(app)
                .post(`/api/control/usuarios/${targetUserId}/generar-clave`)
                .set('Authorization', 'Bearer test-admin-token');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('temporaryPassword');
            expect(typeof res.body.temporaryPassword).toBe('string');
            expect(res.body.temporaryPassword.length).toBe(12);

            // Verify Firebase Auth was called
            expect(mockUpdateUser).toHaveBeenCalledWith(targetUserId, {
                password: expect.any(String),
            });

            // Verify Firestore was updated
            expect(admin.firestore().collection).toHaveBeenCalledWith('users');
            expect(admin.firestore().collection('users').doc).toHaveBeenCalledWith(targetUserId);
            expect(mockUserDocUpdate).toHaveBeenCalledWith({
                forcePasswordChange: true,
            });
        });

        it('should successfully generate a password for a super_admin user', async () => {
            mockUpdateUser.mockResolvedValue({});
            mockUserDocUpdate.mockResolvedValue({});

            const res = await request(app)
                .post(`/api/control/usuarios/${targetUserId}/generar-clave`)
                .set('Authorization', 'Bearer test-super-admin-token');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('temporaryPassword');
        });
    });
});
