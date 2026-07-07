import { query } from './db';
import { loadEnvironment } from './env';

loadEnvironment();

const main = async () => {
  const username = process.argv[2] ?? 'odaisayedissa';
  const email = process.argv[3] ?? 'odaisayedissa@gmail.com';

  const res = await query('SELECT id, username, email, password_hash FROM employees WHERE username = $1 OR email = $2 LIMIT 1', [username, email]);
  if (!res.rows[0]) {
    console.log('NOT_FOUND');
    return;
  }

  console.log(JSON.stringify(res.rows[0], null, 2));
};

main().catch((err) => {
  console.error(err?.message ?? String(err));
  process.exitCode = 1;
});
