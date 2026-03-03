import http from 'node:http'
import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'
import sirv from 'sirv'
import { WebSocketServer, WebSocket } from 'ws'

const OVERLAY_SCRIPT = `(function() {
  var overlay = null;
  var port = location.port;
  var ws;
  var retryDelay = 500;

  function connect() {
    ws = new WebSocket('ws://localhost:' + port + '/__ws');

    ws.onopen = function() {
      retryDelay = 500;
    };

    ws.onmessage = function(e) {
      var msg = JSON.parse(e.data);
      switch (msg.type) {
        case 'building':
          showOverlay('building');
          break;
        case 'done':
          removeOverlay();
          location.reload();
          break;
        case 'error':
          showOverlay('error', msg.error);
          break;
        case 'empty':
          showOverlay('empty');
          break;
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
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;';
      var bar = document.createElement('div');
      bar.style.cssText = 'height:3px;background:linear-gradient(90deg,#3b82f6,#8b5cf6,#3b82f6);background-size:200% 100%;animation:efes-slide 1.5s linear infinite;';
      var label = document.createElement('div');
      label.textContent = 'Building\u2026';
      label.style.cssText = 'display:inline-block;margin:8px 12px;padding:4px 12px;background:#1e1e1e;color:#93c5fd;font:600 13px/1 system-ui,sans-serif;border-radius:4px;border:1px solid #3b82f6;';
      var style = document.createElement('style');
      style.textContent = '@keyframes efes-slide{0%{background-position:200% 0}100%{background-position:-200% 0}}';
      overlay.appendChild(style);
      overlay.appendChild(bar);
      overlay.appendChild(label);
    } else if (type === 'error') {
      overlay.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:99999;max-width:480px;padding:14px 18px;background:#1e1e1e;border:1px solid #ef4444;border-radius:8px;color:#fca5a5;font:13px/1.5 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
      var title = document.createElement('div');
      title.style.cssText = 'font-weight:600;color:#ef4444;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;';
      title.textContent = 'Build Error';
      var close = document.createElement('button');
      close.textContent = '\\u00d7';
      close.style.cssText = 'background:none;border:none;color:#ef4444;font-size:18px;cursor:pointer;padding:0 0 0 12px;';
      close.onclick = removeOverlay;
      title.appendChild(close);
      overlay.appendChild(title);
      var body = document.createElement('pre');
      body.style.cssText = 'margin:0;white-space:pre-wrap;word-break:break-word;max-height:200px;overflow:auto;font-size:12px;';
      body.textContent = errorMsg || 'Unknown error';
      overlay.appendChild(body);
    } else if (type === 'empty') {
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);color:#aaa;font:16px/1.6 system-ui,sans-serif;text-align:center;';
      overlay.innerHTML = '<div><div style="font-size:48px;margin-bottom:16px;">\\ud83d\\udee0</div><div style="font-size:20px;color:#eee;margin-bottom:8px;">No build output yet</div><div>Click <strong>Build</strong> in EFES to get started</div></div>';
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

const FALLBACK_HTML =
  '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script src="/__overlay.js"></script></body></html>'

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
        // Fallback: serve minimal HTML with overlay script so WS status is visible
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(FALLBACK_HTML)
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
