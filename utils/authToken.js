import jwt from 'jsonwebtoken';
import config from '../config.js';
import { getJwtSecret } from '../config/jwtSecret.js';

const TOKEN_TTL = config.jwt.expiresIn;

const createRoleToken = (payload) => {
  const tokenPayload = {
    ...payload,
    role: payload?.role
  };
  return jwt.sign(tokenPayload, getJwtSecret(), { expiresIn: TOKEN_TTL });
};

const createStudentToken = ({ studentId }) => {
  return jwt.sign({ role: 'student', studentId }, getJwtSecret(), { expiresIn: TOKEN_TTL });
};

const verifyAuthToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

export { createRoleToken, createStudentToken, verifyAuthToken };
