import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET.trim();
  console.log('JWT_SECRET used for token generation:', secret, 'Length:', secret.length);
  return jwt.sign({ id }, secret, {
    expiresIn: '30d',
  });
};

export default generateToken; 