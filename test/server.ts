import express from 'express';
import cookieParser from 'cookie-parser';

const app = express();
app.use(cookieParser());

const remainingTests = new Set([
  'without-redirect',
  'has-http-redirect',
  'has-meta-redirect',
  'has-js-redirect',
  'has-request-cookie',
  'has-request-header',
  'has-result-headers',
]);

function done() {
  if (remainingTests.size > 0) {
    console.error(
      'Some tests were not done: ' + Array.from(remainingTests).join(', '),
    );
    process.exit(1);
  }

  console.log('All tests are done');
  process.exit(0);
}
setTimeout(done, 30000);

app.get('/', (req, res) => {
  res.send(`
    <ul>
      <li><a href="/without-redirect">Page without redirect</a></li>
      <li><a href="/has-http-redirect">Page with http redirect</a></li>
      <li><a href="/has-meta-redirect">Page with meta redirect</a></li>
      <li><a href="/has-js-redirect">Page with js redirect</a></li>
    </ul>
    `);
});

app.get('/without-redirect', (req, res) => {
  res.send(`
    <h1>This page does not have a redirect</h1>
    <a href="/">Main page</a>
    `);
});
app.post('/without-redirect/success', (req, res) => {
  remainingTests.delete('without-redirect');
  console.log('Without redirect: PASS');
  res.send('TEST PASS');
});
app.post('/without-redirect/failure', (req, res) => {
  remainingTests.delete('without-redirect');
  console.log('Without redirect: FAIL');
  res.send('TEST FAIL');
});

app.get('/has-http-redirect', (req, res) => {
  res.redirect(302, '/');
});
app.post('/has-http-redirect/failure', (req, res) => {
  remainingTests.delete('has-http-redirect');
  console.log('With HTTP redirect: PASS');
  res.send('TEST PASS');
});
app.post('/has-http-redirect/success', (req, res) => {
  remainingTests.delete('has-http-redirect');
  console.log('With HTTP redirect: FAIL');
  res.send('TEST FAIL');
});

app.get('/has-meta-redirect', (req, res) => {
  res.send(`<h1>This page has a meta redirect after 1 second</h1>
  <meta http-equiv="refresh" content="1; url=/" />`);
});
app.post('/has-meta-redirect/failure', (req, res) => {
  remainingTests.delete('has-meta-redirect');
  console.log('With <meta> redirect: PASS');
  res.send('TEST PASS');
});
app.post('/has-meta-redirect/success', (req, res) => {
  remainingTests.delete('has-meta-redirect');
  console.log('With <meta> redirect: FAIL');
  res.send('TEST FAIL');
});

app.get('/has-js-redirect', (req, res) => {
  res.send(`<h1>This page has a js redirect after 1 second</h1>
  <script>setTimeout(() => window.location = "/", 1000);</script>`);
});
app.post('/has-js-redirect/failure', (req, res) => {
  remainingTests.delete('has-js-redirect');
  console.log('With JavaScript redirect: PASS');
  res.send('TEST PASS');
});
app.post('/has-js-redirect/success', (req, res) => {
  remainingTests.delete('has-js-redirect');
  console.log('With JavaScript redirect: FAIL');
  res.send('TEST FAIL');
});

app.get('/has-request-cookie', (req, res) => {
  if (req.cookies.cookie1 === 'value1' && req.cookies.cookie2 === 'value2') {
    return res.send('OK, cookies found');
  }
  res.redirect(302, '/');
});
app.post('/has-request-cookie/success', (req, res) => {
  remainingTests.delete('has-request-cookie');
  console.log('With request cookie: PASS');
  res.send('TEST PASS');
});
app.post('/has-request-cookie/failure', (req, res) => {
  remainingTests.delete('has-request-cookie');
  console.log('With request cookie: FAIL');
  res.send('TEST FAIL');
});

app.get('/has-request-header', (req, res) => {
  if (
    req.headers['x-test-header1'] === 'value1' &&
    req.headers['x-test-header2'] === 'value2'
  ) {
    return res.send('OK, header found');
  }
  res.redirect(302, '/');
});
app.post('/has-request-header/success', (req, res) => {
  remainingTests.delete('has-request-header');
  console.log('With request header: PASS');
  res.send('TEST PASS');
});
app.post('/has-request-header/failure', (req, res) => {
  remainingTests.delete('has-request-header');
  console.log('With request header: FAIL');
  res.send('TEST FAIL');
});

app.get('/has-result-headers', (req, res) => {
  res.send('OK');
});
app.post('/has-result-headers/success', (req, res) => {
  remainingTests.delete('has-result-headers');
  if (
    req.header('x-test-header1') === 'value1' &&
    req.header('x-test-header2') === 'value2'
  ) {
    console.log('With result header: PASS');
    res.send('TEST PASS');
  } else {
    console.log('With result header: FAIL');
    res.send('TEST FAIL');
  }
  done();
});
app.post('/has-result-headers/failure', (req, res) => {
  remainingTests.delete('has-result-headers');
  console.log('With result header: FAIL');
  res.send('TEST FAIL');
  done();
});

app.listen(3000);
console.log('Waiting monitor on port 3000');
