import Cookies from 'js-cookie';

const FAILED_LOGIN_COOKIE_NAME = 'failedLoginAttempts';
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MINUTES = 15; // 15 minutes

interface FailedLoginData {
  attempts: number;
  blockedUntil: number | null; // Unix timestamp
}

export const getLoginAttempts = (): FailedLoginData => {
  const cookie = Cookies.get(FAILED_LOGIN_COOKIE_NAME);
  if (cookie) {
    try {
      const data: FailedLoginData = JSON.parse(cookie);
      // Ensure blockedUntil is a valid future timestamp
      if (data.blockedUntil && data.blockedUntil <= Date.now()) {
        return { attempts: 0, blockedUntil: null }; // Block expired
      }
      return data;
    } catch (e) {
      console.error('Error parsing failed login cookie:', e);
      return { attempts: 0, blockedUntil: null };
    }
  }
  return { attempts: 0, blockedUntil: null };
};

export const setLoginAttempt = (failed: boolean) => {
  const currentData = getLoginAttempts();
  let newData: FailedLoginData = { ...currentData };

  if (failed) {
    newData.attempts += 1;
    if (newData.attempts >= MAX_FAILED_ATTEMPTS) {
      newData.blockedUntil = Date.now() + BLOCK_DURATION_MINUTES * 60 * 1000;
      Cookies.set(FAILED_LOGIN_COOKIE_NAME, JSON.stringify(newData), {
        expires: new Date(newData.blockedUntil), // Cookie expires when block ends
        secure: process.env.NODE_ENV === 'production', // Use secure in production
        sameSite: 'Lax',
      });
    } else {
      Cookies.set(FAILED_LOGIN_COOKIE_NAME, JSON.stringify(newData), {
        expires: 1 / 24 / 4, // Expires in 15 minutes if not blocked, to clear attempts
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
      });
    }
  } else {
    // Successful login, clear attempts
    newData = { attempts: 0, blockedUntil: null };
    Cookies.remove(FAILED_LOGIN_COOKIE_NAME);
  }
};

export const isBlocked = (): boolean => {
  const data = getLoginAttempts();
  return data.blockedUntil !== null && data.blockedUntil > Date.now();
};

export const getBlockedUntil = (): number | null => {
  const data = getLoginAttempts();
  return data.blockedUntil;
};

export const clearLoginAttempts = () => {
  Cookies.remove(FAILED_LOGIN_COOKIE_NAME);
};
