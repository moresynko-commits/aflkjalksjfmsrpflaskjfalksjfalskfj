require('http').createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
}).listen(process.env.PORT || 3000);

require('./index.js');
