const admin = require('firebase-admin');
const db = admin.firestore();

const SECURITY_LOGS_COLLECTION = 'securityLogs';

const securityLogger = async (level, event, req, details = {}) => {
  const logEntry = {
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    level: level,
    event: event,
    ipAddress: req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',').pop().trim() : req.ip,
    userAgent: req.headers['user-agent'],
    requestPath: req.originalUrl,
    ...details,
  };

  try {
    await db.collection(SECURITY_LOGS_COLLECTION).add(logEntry);
  } catch (error) {
    console.error('Failed to write security log to Firestore:', error);
  }
};

module.exports = securityLogger;