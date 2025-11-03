
const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Mock de firebase-admin
const mockUpdateUser = jest.fn();
const mockGetUser = jest.fn();
const mockSetCustomUserClaims = jest.fn();
const mockRevokeRefreshTokens = jest.fn();
const mockUserDocUpdate = jest.fn();
const mockUserDocGet = jest.fn();
const mockUserDocSet = jest.fn();
const mockRepartidoresAdd = jest.fn();
const mockRepartidoresWhere = jest.fn();
const mockRepartidoresLimit = jest.fn();
const mockRepartidoresGet = jest.fn();
const mockDocUpdate = jest.fn();

const mockGetUserByPhoneNumber = jest.fn();

jest.mock('firebase-admin', () => {
    const mockFieldValue = {
        serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
    };

    const mockFirestoreInstance = {
        collection: jest.fn((collectionName) => {
            if (collectionName === 'users') {
                return {
                    doc: jest.fn(() => ({
                        update: mockUserDocUpdate,
                        get: mockUserDocGet,
                        set: mockUserDocSet,
                    })),
                };
            }
            // Para 'repartidores'
            return {
                where: mockRepartidoresWhere,
                add: mockRepartidoresAdd,
            };
        }),
        FieldValue: mockFieldValue,
    };

    const mockFirestore = () => mockFirestoreInstance;
    mockFirestore.FieldValue = mockFieldValue;

    return {
        initializeApp: jest.fn(),
        auth: () => ({
            updateUser: mockUpdateUser,
            getUser: mockGetUser,
            setCustomUserClaims: mockSetCustomUserClaims,
            revokeRefreshTokens: mockRevokeRefreshTokens,
            getUserByPhoneNumber: mockGetUserByPhoneNumber,
        }),
        firestore: mockFirestore,
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
    beforeEach(() => {
        jest.clearAllMocks();

        // Configurar el chain de where().limit().get() Y where().get() para repartidores
        mockRepartidoresWhere.mockReturnValue({
            limit: mockRepartidoresLimit,
            get: mockRepartidoresGet, // También soportar where().get() directamente
        });
        mockRepartidoresLimit.mockReturnValue({
            get: mockRepartidoresGet,
        });

        // Por defecto, no existe documento de repartidor
        mockRepartidoresGet.mockResolvedValue({ empty: true, docs: [] });

        // Por defecto, documento de usuario existe con role 'usuario'
        mockUserDocGet.mockResolvedValue({
            exists: true,
            data: () => ({ role: 'usuario' })
        });
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
            mockRevokeRefreshTokens.mockResolvedValue({});
            mockUpdateUser.mockResolvedValue({});
            mockUserDocUpdate.mockResolvedValue({});

            const res = await request(app)
                .post(`/api/control/usuarios/${targetUserId}/generar-clave`)
                .set('Authorization', 'Bearer test-admin-token');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('temporaryPassword');
            expect(typeof res.body.temporaryPassword).toBe('string');
            expect(res.body.temporaryPassword.length).toBe(12);

            // Verify refresh tokens were revoked BEFORE password change
            expect(mockRevokeRefreshTokens).toHaveBeenCalledWith(targetUserId);

            // Verify Firebase Auth was called to update password
            expect(mockUpdateUser).toHaveBeenCalledWith(targetUserId, {
                password: expect.any(String),
            });

            // Verify Firestore was updated
            expect(mockUserDocUpdate).toHaveBeenCalledWith({
                forcePasswordChange: true,
            });
        });

        it('should successfully generate a password for a super_admin user', async () => {
            mockRevokeRefreshTokens.mockResolvedValue({});
            mockUpdateUser.mockResolvedValue({});
            mockUserDocUpdate.mockResolvedValue({});

            const res = await request(app)
                .post(`/api/control/usuarios/${targetUserId}/generar-clave`)
                .set('Authorization', 'Bearer test-super-admin-token');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('temporaryPassword');

            // Verify refresh tokens were revoked
            expect(mockRevokeRefreshTokens).toHaveBeenCalledWith(targetUserId);
        });

        it('should continue with password generation even if revokeRefreshTokens fails', async () => {
            // Mock revokeRefreshTokens to fail
            mockRevokeRefreshTokens.mockRejectedValue(new Error('Network error'));
            mockUpdateUser.mockResolvedValue({});
            mockUserDocUpdate.mockResolvedValue({});

            const res = await request(app)
                .post(`/api/control/usuarios/${targetUserId}/generar-clave`)
                .set('Authorization', 'Bearer test-admin-token');

            // Should still succeed (fallback behavior - updateUser will also revoke tokens)
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('temporaryPassword');

            // Verify revokeRefreshTokens was attempted
            expect(mockRevokeRefreshTokens).toHaveBeenCalledWith(targetUserId);

            // Verify password was still updated despite revoke failure
            expect(mockUpdateUser).toHaveBeenCalled();
            expect(mockUserDocUpdate).toHaveBeenCalled();
        });
    });

    describe('PATCH /api/control/usuarios/:userId - Auto-gestión de repartidores', () => {
        const targetUserId = 'test-user-123';

        beforeEach(() => {
            // Mock default para getUser
            mockGetUser.mockResolvedValue({
                uid: targetUserId,
                email: 'test@example.com',
                displayName: 'Test User',
                customClaims: {},
            });

            // Mock default para setCustomUserClaims
            mockSetCustomUserClaims.mockResolvedValue();

            // Mock default para updateUser
            mockUpdateUser.mockResolvedValue();

            // Mock default para user doc
            mockUserDocGet.mockResolvedValue({
                exists: true,
                data: () => ({ role: 'usuario' }),
            });
            mockUserDocUpdate.mockResolvedValue();
        });

        it('should auto-create repartidor document when assigning role "repartidor"', async () => {
            // Mock: No existe documento previo en 'repartidores'
            mockRepartidoresGet.mockResolvedValue({ empty: true, docs: [] });
            mockRepartidoresAdd.mockResolvedValue({ id: 'new-repartidor-id' });

            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({ role: 'repartidor' });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('User updated successfully');

            // Verificar que se llamó a setCustomUserClaims con los claims correctos
            expect(mockSetCustomUserClaims).toHaveBeenCalledWith(targetUserId, {
                super_admin: false,
                admin: false,
                repartidor: true,
            });

            // Verificar que se buscó en la colección 'repartidores'
            expect(mockRepartidoresWhere).toHaveBeenCalledWith('userId', '==', targetUserId);

            // Verificar que se creó el documento
            expect(mockRepartidoresAdd).toHaveBeenCalledWith({
                userId: targetUserId,
                name: 'Test User',
                phone: '',
                vehicle: '',
                status: 'offline',
                currentOrderId: null,
                createdAt: 'MOCK_TIMESTAMP',
                updatedAt: 'MOCK_TIMESTAMP',
                deleted: false,
            });
        });

        it('should NOT create duplicate if repartidor document already exists', async () => {
            // Mock: YA existe documento en 'repartidores'
            mockRepartidoresGet.mockResolvedValue({
                empty: false,
                docs: [{
                    id: 'existing-repartidor-id',
                    data: () => ({ userId: targetUserId, deleted: false }),
                    ref: { update: mockDocUpdate },
                }],
            });

            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({ role: 'repartidor' });

            expect(res.statusCode).toBe(200);

            // Verificar que NO se llamó a add (no crear duplicado)
            expect(mockRepartidoresAdd).not.toHaveBeenCalled();
        });

        it('should reactivate soft-deleted repartidor document', async () => {
            // Mock: Existe documento pero está soft-deleted
            mockRepartidoresGet.mockResolvedValue({
                empty: false,
                docs: [{
                    id: 'soft-deleted-repartidor-id',
                    data: () => ({ userId: targetUserId, deleted: true }),
                    ref: { update: mockDocUpdate },
                }],
            });

            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({ role: 'repartidor' });

            expect(res.statusCode).toBe(200);

            // Verificar que se reactivó el documento
            expect(mockDocUpdate).toHaveBeenCalledWith({
                deleted: false,
                updatedAt: 'MOCK_TIMESTAMP',
            });

            // No se creó uno nuevo
            expect(mockRepartidoresAdd).not.toHaveBeenCalled();
        });

        it('should soft-delete repartidor document when removing role "repartidor"', async () => {
            // Mock: Usuario previo tenía role 'repartidor'
            mockUserDocGet.mockResolvedValue({
                exists: true,
                data: () => ({ role: 'repartidor' }),
            });

            // Mock: Existe documento de repartidor
            mockRepartidoresGet.mockResolvedValue({
                empty: false,
                docs: [{
                    id: 'repartidor-to-delete-id',
                    data: () => ({ userId: targetUserId, deleted: false }),
                    ref: { update: mockDocUpdate },
                }],
            });

            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({ role: 'admin' }); // Cambiar a otro role

            expect(res.statusCode).toBe(200);

            // Verificar que se soft-deleted el documento
            expect(mockDocUpdate).toHaveBeenCalledWith({
                deleted: true,
                updatedAt: 'MOCK_TIMESTAMP',
            });
        });

        it('should use displayName from request body if provided', async () => {
            mockRepartidoresGet.mockResolvedValue({ empty: true, docs: [] });
            mockRepartidoresAdd.mockResolvedValue({ id: 'new-repartidor-id' });

            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({
                    role: 'repartidor',
                    displayName: 'Custom Display Name',
                });

            expect(res.statusCode).toBe(200);

            // Verificar que se usó el displayName del body
            expect(mockRepartidoresAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Custom Display Name',
                })
            );
        });

        it('should use phoneNumber from request body if provided', async () => {
            mockRepartidoresGet.mockResolvedValue({ empty: true, docs: [] });
            mockRepartidoresAdd.mockResolvedValue({ id: 'new-repartidor-id' });

            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({
                    role: 'repartidor',
                    phoneNumber: '+1234567890',
                });

            expect(res.statusCode).toBe(200);

            // Verificar que se usó el phoneNumber del body
            expect(mockRepartidoresAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    phone: '+1234567890',
                })
            );
        });

        it('should fall back to email if displayName is not available', async () => {
            // Mock getUser sin displayName
            mockGetUser.mockResolvedValue({
                uid: targetUserId,
                email: 'fallback@example.com',
                customClaims: {},
            });

            mockRepartidoresGet.mockResolvedValue({ empty: true, docs: [] });
            mockRepartidoresAdd.mockResolvedValue({ id: 'new-repartidor-id' });

            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({ role: 'repartidor' });

            expect(res.statusCode).toBe(200);

            // Verificar que se usó el email como fallback
            expect(mockRepartidoresAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'fallback',
                })
            );
        });

        it('should NOT auto-create if role was already "repartidor"', async () => {
            // Mock: Usuario ya tenía role 'repartidor'
            mockUserDocGet.mockResolvedValue({
                exists: true,
                data: () => ({ role: 'repartidor' }),
            });

            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({ active: true }); // Solo cambiar otro campo, no role

            expect(res.statusCode).toBe(200);

            // Verificar que NO se intentó crear documento
            expect(mockRepartidoresAdd).not.toHaveBeenCalled();
        });

        it('should return 403 if admin tries to modify super_admin', async () => {
            mockGetUser.mockResolvedValue({
                uid: targetUserId,
                email: 'superadmin@example.com',
                customClaims: { super_admin: true },
            });

            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({ role: 'repartidor' });

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toContain('Admin cannot modify Super Admin');
        });

        it('should return 404 if user does not exist', async () => {
            mockGetUser.mockRejectedValue(new Error('User not found'));

            const res = await request(app)
                .patch(`/api/control/usuarios/non-existent-user`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({ role: 'repartidor' });

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('User not found');
        });
    });

    describe('PATCH /api/control/usuarios/:userId - Phone Number Validation', () => {
        const targetUserId = 'test-user-phone';

        beforeEach(() => {
            // Mock default para getUser
            mockGetUser.mockResolvedValue({
                uid: targetUserId,
                email: 'test@example.com',
                displayName: 'Test User',
                customClaims: {},
            });

            // Mock defaults
            mockSetCustomUserClaims.mockResolvedValue();
            mockUpdateUser.mockResolvedValue();
            mockUserDocGet.mockResolvedValue({
                exists: true,
                data: () => ({ role: 'usuario' }),
            });
            mockUserDocUpdate.mockResolvedValue();
        });

        it('should reject phoneNumber with less than 10 digits', async () => {
            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({
                    phoneNumber: '123456789', // 9 dígitos
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('10 dígitos');
        });

        it('should reject phoneNumber with more than 10 digits', async () => {
            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({
                    phoneNumber: '12345678901', // 11 dígitos
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('10 dígitos');
        });

        it('should accept valid 10-digit phone number', async () => {
            // Mock: Teléfono no existe (disponible)
            mockGetUserByPhoneNumber.mockRejectedValue({ code: 'auth/user-not-found' });

            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({
                    phoneNumber: '9981234567',
                });

            expect(res.statusCode).toBe(200);
            expect(mockUpdateUser).toHaveBeenCalledWith(targetUserId, expect.objectContaining({
                phoneNumber: '+529981234567',
            }));
        });

        it('should format phone to E.164 format (+52XXXXXXXXXX)', async () => {
            mockGetUserByPhoneNumber.mockRejectedValue({ code: 'auth/user-not-found' });

            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({
                    phoneNumber: '9981234567',
                });

            expect(res.statusCode).toBe(200);

            // Verificar que Firebase Auth recibió formato E.164
            expect(mockUpdateUser).toHaveBeenCalledWith(targetUserId, expect.objectContaining({
                phoneNumber: '+529981234567',
            }));

            // Verificar que Firestore también recibió formato E.164
            expect(mockUserDocUpdate).toHaveBeenCalledWith(expect.objectContaining({
                phoneNumber: '+529981234567',
            }));
        });

        it('should reject duplicate phone number (different user)', async () => {
            // Mock: Teléfono ya existe para otro usuario
            mockGetUserByPhoneNumber.mockResolvedValue({
                uid: 'other-user-uid', // UID diferente
                phoneNumber: '+529981234567',
            });

            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({
                    phoneNumber: '9981234567',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('ya está registrado');
        });

        it('should allow updating to same phone number (same user)', async () => {
            // Mock: Teléfono existe pero es del MISMO usuario
            mockGetUserByPhoneNumber.mockResolvedValue({
                uid: targetUserId, // MISMO uid
                phoneNumber: '+529981234567',
            });

            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({
                    phoneNumber: '9981234567',
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('User updated successfully');
        });

        it('should clean non-numeric characters from phone', async () => {
            mockGetUserByPhoneNumber.mockRejectedValue({ code: 'auth/user-not-found' });

            const res = await request(app)
                .patch(`/api/control/usuarios/${targetUserId}`)
                .set('Authorization', 'Bearer test-admin-token')
                .send({
                    phoneNumber: '(998) 123-4567', // Con formato visual
                });

            expect(res.statusCode).toBe(200);

            // Verificar que se limpió y formateó correctamente
            expect(mockUpdateUser).toHaveBeenCalledWith(targetUserId, expect.objectContaining({
                phoneNumber: '+529981234567',
            }));
        });
    });
});
