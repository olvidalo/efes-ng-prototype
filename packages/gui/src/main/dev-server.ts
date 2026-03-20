import http from 'node:http'
import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'
import sirv from 'sirv'
import { WebSocketServer, WebSocket } from 'ws'

// language=CSS
const OVERLAY_CSS = `
  #__efes-overlay { z-index: 99999 }

  /* Banner overlays (building, stopped) */
  .efes-banner { position: fixed; top: 0; left: 0; right: 0 }
  .efes-bar { height: 12px }
  .efes-bar--blue {
    background: linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6);
    background-size: 200% 100%;
    animation: efes-slide 1.5s linear infinite;
  }
  .efes-bar--amber { background: #f59e0b }
  @keyframes efes-slide {
    0%   { background-position: 200% 0 }
    100% { background-position: -200% 0 }
  }
  .efes-label {
    display: inline-block; padding: 4px 12px; float: right; margin: 8px 12px;
    background: #1e1e1e; font: 600 13px/1 system-ui, sans-serif; border-radius: 4px;
  }
  .efes-label--blue  { color: #93c5fd; border: 1px solid #3b82f6 }
  .efes-label--amber { color: #fbbf24; border: 1px solid #f59e0b }

  /* Error toast */
  .efes-error {
    position: fixed; bottom: 16px; right: 16px; max-width: 480px;
    padding: 14px 18px; background: #1e1e1e; border: 1px solid #ef4444;
    border-radius: 8px; color: #fca5a5; font: 13px/1.5 system-ui, sans-serif;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  }
  .efes-error-title {
    font-weight: 600; color: #ef4444; margin-bottom: 6px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .efes-error-close {
    background: none; border: none; color: #ef4444;
    font-size: 18px; cursor: pointer; padding: 0 0 0 12px;
  }
  .efes-error-body {
    margin: 0; white-space: pre-wrap; word-break: break-word;
    max-height: 200px; overflow: auto; font-size: 12px;
  }

  /* Full-screen overlays (empty) */
  .efes-fullscreen {
    position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.85); color: #aaa; font: 16px/1.6 system-ui, sans-serif; text-align: center;
  }
  .efes-fullscreen-icon  { font-size: 48px; margin-bottom: 16px }
  .efes-fullscreen-title { font-size: 20px; color: #eee; margin-bottom: 8px }
`

// language=JS
const OVERLAY_SCRIPT = `(function() {
  var overlay = null;
  var port = location.port;
  var ws;
  var retryDelay = 500;

  // Inject styles once
  var s = document.createElement('style');
  s.textContent = ${JSON.stringify(OVERLAY_CSS)};
  document.head.appendChild(s);

  function connect() {
    ws = new WebSocket('ws://localhost:' + port + '/__ws');

    ws.onopen = function() {
      retryDelay = 500;
    };

    ws.onmessage = function(e) {
      var msg = JSON.parse(e.data);
      switch (msg.type) {
        case 'building':  showOverlay('building'); break;
        case 'stopped':   showOverlay('stopped'); break;
        case 'empty':     showOverlay('empty'); break;
        case 'error':     showOverlay('error', msg.error); break;
        case 'done':      removeOverlay(); location.reload(); break;
        case 'reload':    location.href = '/'; break;
      }
    };

    ws.onclose = function() {
      setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 1.5, 5000);
    };
  }

  function showOverlay(type, errorMsg) {
    removeOverlay();
    overlay = document.createElement('div');
    overlay.id = '__efes-overlay';

    if (type === 'building') {
      overlay.className = 'efes-banner';
      overlay.innerHTML =
        '<div class="efes-bar efes-bar--blue"></div>' +
        '<div class="efes-label efes-label--blue">Building\\u2026</div>';

    } else if (type === 'stopped') {
      overlay.className = 'efes-banner';
      overlay.innerHTML =
        '<div class="efes-bar efes-bar--amber"></div>' +
        '<div class="efes-label efes-label--amber">Pipeline stopped \\u2014 output may be stale</div>';

    } else if (type === 'error') {
      overlay.className = 'efes-error';
      overlay.innerHTML =
        '<div class="efes-error-title">Build Error<button class="efes-error-close">\\u00d7</button></div>' +
        '<pre class="efes-error-body"></pre>';
      overlay.querySelector('.efes-error-body').textContent = errorMsg || 'Unknown error';
      overlay.querySelector('.efes-error-close').onclick = removeOverlay;

    } else if (type === 'empty') {
      overlay.className = 'efes-fullscreen';
      overlay.innerHTML =
        '<div>' +
          '<div class="efes-fullscreen-icon">\\ud83d\\udee0</div>' +
          '<div class="efes-fullscreen-title">No build output yet</div>' +
          '<div>Click <strong>Start</strong> in EFES to get started</div>' +
        '</div>';
    }

    document.body.appendChild(overlay);
  }

  function removeOverlay() {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
      overlay = null;
    }
  }

  connect();
})();`

/** Resolve a URL path to an HTML file on disk, or null if not HTML */
function resolveHtmlFile(dir: string, urlPath: string): string | null {
  // /foo/bar.html → dir/foo/bar.html
  const direct = path.join(dir, urlPath)
  if (direct.endsWith('.html') && fs.existsSync(direct)) return direct

  // /foo/ or /foo → dir/foo/index.html
  const index = path.join(dir, urlPath, 'index.html')
  if (fs.existsSync(index)) return index

  return null
}

/** Find a free port starting from `start` by probing with a temporary server */
async function findFreePort(start: number): Promise<number> {
  for (let port = start; port < start + 100; port++) {
    const free = await new Promise<boolean>((resolve) => {
      const probe = net.createServer()
      probe.once('error', () => resolve(false))
      probe.listen(port, () => probe.close(() => resolve(true)))
    })
    if (free) return port
  }
  throw new Error(`No free port found in range ${start}-${start + 99}`)
}

const NOT_FOUND_HTML =
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>404 - Not Found</title></head><body>' +
  '<div class="efes-fullscreen">' +
  '<div><div class="efes-fullscreen-icon">404</div>' +
  '<div class="efes-fullscreen-title">Page not found</div>' +
  '<div><a href="/" style="color:#93c5fd;">Go to homepage</a></div></div></div>' +
  '<script src="/__overlay.js"></script></body></html>'

export class DevServer {
  private server: http.Server | null = null
  private wss: WebSocketServer | null = null
  private port = 0
  private lastState: { type: string; error?: string } | null = null

  async start(dir: string): Promise<number> {
    const serve = sirv(dir, { dev: true, etag: false })

    this.server = http.createServer((req, res) => {
      const urlPath = new URL(req.url || '/', 'http://localhost').pathname

      // Serve overlay client script
      if (urlPath === '/__overlay.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript' })
        res.end(OVERLAY_SCRIPT)
        return
      }

      // HTML files: read from disk, inject overlay script, serve directly
      const htmlFile = resolveHtmlFile(dir, urlPath)
      if (htmlFile) {
        let html = fs.readFileSync(htmlFile, 'utf-8')
        const scriptTag = '<script src="/__overlay.js"></script>'
        html = html.includes('</body>')
          ? html.replace('</body>', scriptTag + '</body>')
          : html + scriptTag
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(html)
        return
      }

      // Everything else (CSS, JS, images, etc.): let sirv handle it
      serve(req, res, () => {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(NOT_FOUND_HTML)
      })
    })

    this.wss = new WebSocketServer({ server: this.server, path: '/__ws' })
    this.wss.on('connection', (client) => {
      if (this.lastState) {
        client.send(JSON.stringify(this.lastState))
      }
    })

    const freePort = await findFreePort(8080)
    await new Promise<void>((resolve) => this.server!.listen(freePort, resolve))
    this.port = freePort
    return this.port
  }

  broadcast(message: { type: string; error?: string }): void {
    // Don't persist 'done' — it's a one-shot reload signal, not a state
    this.lastState = message.type === 'done' ? null : message
    if (!this.wss) return
    const data = JSON.stringify(message)
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    }
  }

  async stop(): Promise<void> {
    if (this.wss) {
      for (const client of this.wss.clients) {
        client.close()
      }
      this.wss.close()
      this.wss = null
    }
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve())
      })
      this.server = null
    }
    this.port = 0
  }

  getPort(): number {
    return this.port
  }

  isRunning(): boolean {
    return this.server !== null
  }
}
