// seedAdmins.js
const bcrypt = require('bcrypt');
const pool = require('./db');

async function seedAdmins() {
  const admins = [
    { username: 'admin1', password: 'Gpadmin01' },
    { username: 'admin2', password: 'Gpadmin02' },
    { username: 'admin3', password: 'Gpadmin03' },
    { username: 'admin4', password: 'Another04' },
    { username: 'admin5', password: 'Another05' },
    { username: 'admin6', password: 'Another06' },
    { username: 'admin7', password: 'Another07' },
  ];

  for (const admin of admins) {
    const hash = await bcrypt.hash(admin.password, 10);
    await pool.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [admin.username, hash]);
  }
  console.log('Admins seed done');
}

seedAdmins().then(() => process.exit());
