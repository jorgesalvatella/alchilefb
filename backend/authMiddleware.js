const admin = require('firebase-admin');

const authMiddleware = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Unauthorized: Missing or invalid token.' });
  }

  const idToken = authorization.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    // Adjuntamos el token decodificado al objeto de la petición
    // para que los endpoints puedan usar la info del usuario (uid, claims, etc.)
    req.user = decodedToken;
    next(); // El token es válido, la petición puede continuar.
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).send({ message: 'Unauthorized: Invalid token.' });
  }
};

module.exports = authMiddleware;
