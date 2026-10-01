const crypto = require('crypto');

// Prefixed Short ID Generator (5 Characters: Upper Case & Numbers)
const generateId = (prefix) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomCode = '';
  const bytes = crypto.randomBytes(5);
  
  for (let i = 0; i < 5; i++) {
    randomCode += characters[bytes[i] % characters.length];
  }
  
  return `${prefix}-${randomCode}`;
};

module.exports = { generateId };