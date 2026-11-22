import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.SWITCHYARD_PORT || 5836);
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/game.mjs', ['game.mjs', 'text/javascript; charset=utf-8']],
  ['/grid.mjs', ['grid.mjs', 'text/javascript; charset=utf-8']],
  ['/relay.mjs', ['relay.mjs', 'text/javascript; charset=utf-8']],
]);

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }
  const pathname = request.url?.split('?')[0];
  const resource = files.get(pathname);
  if (!resource) {
    response.writeHead(404);
    response.end();
    return;
  }
  const [file, type] = resource;
  try {
    const body = await readFile(new URL(file, import.meta.url));
    response.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'Content-Length': body.length,
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    console.error(`Could not read ${file}: ${error.message}`);
    response.writeHead(500);
    response.end();
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Dawn Relay: Switchyard • http://127.0.0.1:${port}/`));
