const admin = require('firebase-admin');
const db = admin.firestore(); // Initialize Firestore
const securityLogger = require('./utils/securityLogger');

const FAILED_ATTEMPTS_COLLECTION = 'failedLoginAttempts';
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

const authMiddleware = async (req, res, next) => {
  const { authorization } = req.headers;
  // Robust IP address retrieval
  const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',').pop().trim() : req.ip;

  // Check for existing block
  const ipDocRef = db.collection(FAILED_ATTEMPTS_COLLECTION).doc(clientIp);
  const ipDoc = await ipDocRef.get();

  if (ipDoc.exists) {
    const data = ipDoc.data();
    if (data.blockedUntil && data.blockedUntil.toDate() > new Date()) {
      console.warn(`IP ${clientIp} is blocked until ${data.blockedUntil.toDate()}.`);
      await securityLogger('warn', 'IP_BLOCKED_ACCESS_ATTEMPT', req, {
        ipAddress: clientIp,
        blockedUntil: data.blockedUntil.toDate().toISOString(),
      });
      return res.status(429).send({ message: 'Too Many Requests: Your IP has been temporarily blocked due to too many failed authentication attempts.' });
    }
  }

  if (!authorization || !authorization.startsWith('Bearer ')) {
    // If no token, it's an unauthorized request, but not necessarily a failed login attempt
    // that we want to count towards brute force.
    return res.status(401).send({ message: 'Unauthorized: Missing or invalid token.' });
  }

  const idToken = authorization.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // If successful, reset failed attempts for this IP
    if (ipDoc.exists && ipDoc.data().attempts > 0) {
      await ipDocRef.update({ attempts: 0, blockedUntil: null });
    }
    await securityLogger('info', 'AUTH_SUCCESS', req, {
      ipAddress: clientIp,
      userId: decodedToken.uid,
    });

    req.user = decodedToken;
    next();
  } catch (error) {
    await securityLogger('error', 'AUTH_FAILED', req, {
      ipAddress: clientIp,
      error: error.code || error.message,
      details: error.message, // More detailed error message
    });
    console.error('Error verifying Firebase ID token:', error);

    // Increment failed attempts
    const currentAttempts = (ipDoc.exists ? ipDoc.data().attempts : 0) + 1;
    let updateData = { attempts: currentAttempts, lastAttempt: admin.firestore.FieldValue.serverTimestamp() };

    if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
      const blockedUntil = new Date(Date.now() + BLOCK_DURATION_MS);
      updateData.blockedUntil = blockedUntil;
      await ipDocRef.set(updateData, { merge: true }); // Use set with merge to create if not exists
      await securityLogger('warn', 'IP_BLOCKED', req, {
        ipAddress: clientIp,
        attempts: currentAttempts,
        blockedUntil: blockedUntil.toISOString(),
      });
      console.warn(`IP ${clientIp} blocked for 15 minutes due to ${currentAttempts} failed attempts.`);
      return res.status(429).send({ message: 'Too Many Requests: Your IP has been temporarily blocked due to too many failed authentication attempts.' });
    } else {
      await ipDocRef.set(updateData, { merge: true }); // Use set with merge to create if not exists
    }

    res.status(401).send({ message: 'Unauthorized: Invalid token.' });
  }
};

module.exports = authMiddleware;
