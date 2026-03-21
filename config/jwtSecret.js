import config from '../config.js';

const getJwtSecret = () => {
  const secret = config.jwt.secret;

  if (!secret) {
    throw new Error('JWT secret missing. Set JWT_SECRET in environment variables.');
  }

  return secret;
};

export { getJwtSecret };
