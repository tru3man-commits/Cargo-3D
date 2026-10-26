const { app, BrowserWindow, session } = require('electron');
const { createReadStream, statSync } = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const staticRoot = path.join(__dirname, '..', 'dist');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
};
let localServer;

function startLocalServer() {
  return new Promise((resolve, reject) => {
    localServer = http.createServer((request, response) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405).end();
        return;
      }
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      } catch {
        response.writeHead(400).end();
        return;
      }
      const filePath = path.resolve(staticRoot, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (filePath !== staticRoot && !filePath.startsWith(staticRoot + path.sep)) {
        response.writeHead(403).end();
        return;
      }
      try {
        if (!statSync(filePath).isFile()) throw new Error('Not a file');
      } catch {
        response.writeHead(404).end('Not found');
        return;
      }
      response.writeHead(200, {
        'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      });
      if (request.method === 'HEAD') response.end();
      else createReadStream(filePath).pipe(response);
    });
    localServer.once('error', reject);
    localServer.listen(0, '127.0.0.1', () => resolve(localServer.address().port));
  });
}

async function createWindow(port) {
  const window = new BrowserWindow({
    width: 1500,
    height: 1000,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#f6f8f6',
    title: 'Raktér · 3D rakodástervező',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const appOrigin = `http://127.0.0.1:${port}`;
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(appOrigin)) event.preventDefault();
  });
  await window.loadURL(`${appOrigin}/`);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.setName('Raktér 3D');
  app.whenReady().then(async () => {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    const port = await startLocalServer();
    await createWindow(port);
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
    });
  }).catch(error => {
    console.error('A Raktér nem indítható el:', error);
    app.quit();
  });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => localServer?.close());
}
