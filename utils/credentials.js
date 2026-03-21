const generateTempPassword = (length = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%';
  let output = '';
  for (let i = 0; i < length; i += 1) {
    output += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return output;
};

const generateUsernameFromName = (name = 'user') => {
  const base = String(name).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'user';
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}${suffix}`;
};

export { generateTempPassword, generateUsernameFromName };
