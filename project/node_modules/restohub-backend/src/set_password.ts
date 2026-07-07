import bcrypt from 'bcrypt';
import { query } from './db';
import { loadEnvironment } from './env';

loadEnvironment();

const identifier = process.argv[2] ?? 'odaisayedissa';
const newPassword = process.argv[3] ?? 'oday2003@@';

const main = async () => {
  const hash = await bcrypt.hash(newPassword, 12);
  const res = await query('UPDATE employees SET password_hash = $1 WHERE username = $2 OR email = $2 RETURNING id, username, email', [hash, identifier]);
  if (!res.rows[0]) {
    console.error('No matching user found to update');
    process.exit(2);
  }
  console.log('Password updated for', res.rows[0]);
};

main().catch((err) => {
  console.error(err?.message ?? String(err));
  process.exitCode = 1;
});
