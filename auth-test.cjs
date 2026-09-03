const URL = process.env.URL;
const KEY = process.env.KEY;
async function tryLogin(email, password) {
  const res = await fetch(URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.text();
  let msg = 'n/a';
  try { const j=JSON.parse(body); msg = j.msg || j.error_description || j.error || j.error_code; } catch { msg = body.slice(0,120); }
  console.log(email, '-> HTTP', res.status, '|', msg);
}
(async () => {
  await tryLogin('admin@eventcenter.app', 'WrongPassWrongPass1');
})().catch((e) => console.log('THROWN', e.message));
