import bcrypt from 'bcrypt';

const hash = process.argv[2];
const password = process.argv[3] ?? 'oday2003@@';

if (!hash) {
  console.error('Provide hash as first arg');
  process.exit(2);
}

(async () => {
  const ok = await bcrypt.compare(password, hash);
  console.log(ok ? 'MATCH' : 'NO_MATCH');
})();
