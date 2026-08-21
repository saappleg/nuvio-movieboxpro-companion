export function setupPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>MovieBoxPro Companion & Nuvio Hub</title>
  <style>
    :root{
      color-scheme:dark;
      --bg:#070b14;
      --panel:#0f172a;
      --panel-hover:#141f38;
      --panel-sub:#0b1120;
      --line:#1e293b;
      --line-active:#38bdf8;
      --text:#f8fafc;
      --muted:#94a3b8;
      --accent:#38bdf8;
      --accent-glow:rgba(56,189,248,0.15);
      --purple:#a855f7;
      --good:#10b981;
      --bad:#ef4444;
      --warn:#f59e0b;
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      background:radial-gradient(ellipse 80% 50% at 50% -20%,rgba(56,189,248,0.15),transparent),radial-gradient(circle at 100% 100%,rgba(168,85,247,0.08),transparent),var(--bg);
      color:var(--text);
      font:15px/1.5 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
      min-height:100vh;
    }
    main{width:min(1080px,calc(100% - 32px));margin:auto;padding:48px 0 80px}
    
    .hero{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:32px}
    .eyebrow{display:inline-flex;align-items:center;gap:6px;color:var(--accent);font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px}
    .eyebrow::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}
    h1{font-size:clamp(28px,4.5vw,42px);line-height:1.1;margin:8px 0 10px;letter-spacing:-.035em;font-weight:800;background:linear-gradient(to right,#fff,#cbd5e1);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .lead{color:var(--muted);max-width:680px;margin:0;font-size:16px}
    .badge-bar{display:flex;gap:8px;flex-wrap:wrap}
    .badge{padding:6px 12px;border:1px solid var(--line);background:var(--panel-sub);border-radius:999px;color:var(--muted);font-size:12px;display:inline-flex;align-items:center;gap:6px}
    
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
    .card{
      background:linear-gradient(160deg,var(--panel),#0c1322);
      border:1px solid var(--line);
      border-radius:20px;
      padding:24px;
      box-shadow:0 20px 40px rgba(0,0,0,0.4);
      position:relative;
      overflow:hidden;
      transition:border-color .2s,box-shadow .2s;
    }
    .card:hover{border-color:rgba(56,189,248,0.3);box-shadow:0 24px 50px rgba(0,0,0,0.5)}
    .wide{grid-column:1/-1}
    
    .card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .card h2{font-size:18px;margin:0;font-weight:700;display:flex;align-items:center;gap:8px}
    .card p{color:var(--muted);margin:0 0 16px;font-size:14px}
    
    .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .status{display:inline-flex;gap:8px;align-items:center;color:var(--muted);font-size:13px}
    .dot{width:9px;height:9px;border-radius:50%;background:var(--warn);box-shadow:0 0 12px currentColor}
    .dot.good{background:var(--good)}
    .dot.bad{background:var(--bad)}
    
    button,a.button{
      appearance:none;
      border:1px solid rgba(56,189,248,0.4);
      background:linear-gradient(180deg,#0284c7,#0369a1);
      color:white;
      padding:10px 16px;
      border-radius:10px;
      font-weight:600;
      font-size:14px;
      text-decoration:none;
      cursor:pointer;
      display:inline-flex;
      align-items:center;
      gap:6px;
      transition:all .15s ease-in-out;
      box-shadow:0 2px 8px rgba(2,132,199,0.3);
    }
    button:hover,a.button:hover{filter:brightness(1.1);transform:translateY(-1px);box-shadow:0 4px 12px rgba(2,132,199,0.4)}
    button:active,a.button:active{transform:translateY(0)}
    button.secondary,a.secondary{
      background:var(--panel-sub);
      border-color:var(--line);
      color:var(--text);
      box-shadow:none;
    }
    button.secondary:hover,a.secondary:hover{border-color:var(--muted);background:var(--panel-hover)}
    button.danger{border-color:rgba(239,68,68,0.4);background:linear-gradient(180deg,#dc2626,#b91c1c)}
    button:disabled{opacity:.5;cursor:wait;transform:none}
    
    label{display:block;color:var(--muted);font-size:13px;font-weight:500;margin:12px 0 6px}
    input,textarea,select{
      width:100%;
      padding:11px 14px;
      border-radius:10px;
      border:1px solid var(--line);
      background:var(--panel-sub);
      color:var(--text);
      font:inherit;
      font-size:14px;
      transition:border-color .15s;
    }
    input:focus,textarea:focus,select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
    textarea{resize:vertical}
    
    code,.code{
      font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
      font-size:12px;
      overflow-wrap:anywhere;
      background:var(--panel-sub);
      border:1px solid var(--line);
      border-radius:10px;
      padding:12px;
      display:block;
      color:#93c5fd;
    }
    
    .message{min-height:20px;color:var(--muted);margin-top:10px;font-size:13px}
    .message.error{color:var(--bad)}
    .message.ok{color:var(--good)}
    
    /* Draggable Feed Items */
    .feed-list{display:flex;flex-direction:column;gap:8px;margin-top:14px}
    .feed-item{
      background:var(--panel-sub);
      border:1px solid var(--line);
      border-radius:12px;
      padding:10px 14px;
      display:flex;
      align-items:center;
      gap:12px;
      user-select:none;
      transition:border-color .15s,transform .15s,background-color .15s,opacity .15s;
    }
    .feed-item.dragging{opacity:.35;border-color:var(--accent);background:var(--panel-hover)}
    .feed-item.drag-over{border-color:var(--accent);transform:scale(1.01);box-shadow:0 0 10px var(--accent-glow)}
    .feed-item.disabled{opacity:.5;border-color:rgba(255,255,255,0.04)}
    .feed-drag{cursor:grab;color:var(--muted);display:flex;align-items:center;font-size:18px;padding:0 4px}
    .feed-drag:active{cursor:grabbing}
    .feed-badge{width:34px;height:24px;border-radius:6px;background:rgba(56,189,248,0.12);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0}
    .feed-info{flex:1;min-width:0}
    .feed-title{font-weight:600;font-size:14px;color:var(--text)}
    .feed-desc{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .feed-actions{display:flex;align-items:center;gap:8px}
    .feed-btn{padding:4px 8px;font-size:11px;background:var(--panel);border:1px solid var(--line);border-radius:6px;cursor:pointer;color:var(--muted)}
    .feed-btn:hover:not(:disabled){color:var(--text);border-color:var(--muted)}
    .feed-btn:disabled{opacity:.3;cursor:not-allowed}
    .feed-toggle{display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--muted);margin:0}
    .feed-toggle input{width:16px;height:16px;margin:0;cursor:pointer;accent-color:var(--accent)}
    
    ol{color:var(--muted);padding-left:20px;margin:10px 0}
    li{margin-bottom:8px}
    strong{color:var(--text)}
    
    footer{color:var(--muted);font-size:13px;margin-top:36px;text-align:center;padding-top:20px;border-top:1px solid var(--line)}
    @media(max-width:768px){
      main{padding-top:24px}
      .hero{flex-direction:column}
      .grid{grid-template-columns:1fr}
      .wide{grid-column:auto}
    }
  </style>
</head>
<body><main>
  <section class="hero">
    <div>
      <div class="eyebrow">Universal Streaming & Discovery Companion</div>
      <h1>MovieBoxPro & Nuvio Hub</h1>
      <p class="lead">Bridge MovieBoxPro playback into Nuvio, discover Calendar releases and new movies/series, and sync with Nuvio Cloud for smart library-driven recommendations.</p>
    </div>
    <div class="badge-bar">
      <div class="badge" id="serviceBadge"><span class="dot"></span> Service: Initializing…</div>
      <div class="badge" id="mbpBadge"><span class="dot"></span> MovieBoxPro: Checking…</div>
      <div class="badge" id="nuvioCloudBadge"><span class="dot"></span> Nuvio Cloud: Checking…</div>
    </div>
  </section>

  <section class="grid">
    <!-- 1. Companion Network Address -->
    <article class="card">
      <div class="card-header">
        <h2>1. Companion Address</h2>
        <div class="status"><span id="serviceText">Checking…</span></div>
      </div>
      <p>Confirm the private LAN / Tailscale address reachable by your Nuvio devices.</p>
      <label for="publicUrl">Nuvio-facing URL</label>
      <input id="publicUrl" autocomplete="off" placeholder="http://100.x.y.z:43110">
      <div class="row" style="margin-top:14px">
        <button id="saveUrl">Save Address</button>
      </div>
      <div class="message" id="configMessage"></div>
    </article>

    <!-- 2. TMDb Metadata -->
    <article class="card">
      <div class="card-header">
        <h2>2. TMDb Metadata</h2>
        <div class="status"><span class="dot" id="tmdbDot"></span><span id="tmdbText">Checking…</span></div>
      </div>
      <p>Powers metadata lookups, release calendars, and title matching.</p>
      <label for="tmdbKey">TMDb v3 API key</label>
      <input id="tmdbKey" type="password" autocomplete="new-password" placeholder="Leave blank to keep the saved key">
      <div class="row" style="margin-top:14px">
        <button id="saveTmdb">Save API Key</button>
      </div>
      <div class="message" id="tmdbMessage"></div>
    </article>

    <!-- 3. MovieBoxPro Login -->
    <article class="card">
      <div class="card-header">
        <h2>3. MovieBoxPro Session</h2>
        <div class="status"><span id="movieboxText">Not checked</span></div>
      </div>
      <p>Official persistent browser profile. Stream URLs are signed on-demand.</p>
      <div class="row" style="margin-top:14px">
        <button id="openLogin">Open Login Window</button>
        <button class="secondary" id="checkLogin">Check Status</button>
        <a class="button secondary" id="novnc" target="_blank" rel="noreferrer" hidden>Open Desktop (VNC)</a>
      </div>
      <div class="message" id="loginMessage"></div>
    </article>

    <!-- 4. Nuvio Cloud Account Sync -->
    <article class="card">
      <div class="card-header">
        <h2>4. Nuvio Cloud Sync</h2>
        <div class="status"><span id="cloudStatusText">Not connected</span></div>
      </div>
      <p>Connect your Nuvio Cloud account to automatically synchronize library series & movies for recommendations.</p>
      <div id="cloudAuthForm">
        <label for="cloudEmail">Nuvio Cloud Email</label>
        <input id="cloudEmail" type="email" placeholder="you@domain.com">
        <label for="cloudPass">Password</label>
        <input id="cloudPass" type="password" placeholder="••••••••">
        <div class="row" style="margin-top:14px">
          <button id="loginCloud">Connect & Sync</button>
        </div>
      </div>
      <div id="cloudConnectedView" style="display:none">
        <p><strong id="cloudUserEmail"></strong> (<span id="cloudProfileName">Default Profile</span>)</p>
        <p class="status">Last synced: <span id="cloudLastSync">Never</span></p>
        <div class="row" style="margin-top:14px">
          <button id="syncCloud">Sync Library Now</button>
          <button class="secondary danger" id="disconnectCloud">Disconnect</button>
        </div>
      </div>
      <div class="message" id="cloudMessage"></div>
    </article>

    <!-- 5. MovieBox Stream Provider Plugin -->
    <article class="card">
      <div class="card-header">
        <h2>5. MovieBox Stream Provider</h2>
        <span class="badge">Nuvio Scraper</span>
      </div>
      <p>Add MovieBoxPro as a stream source for movies & TV series inside Nuvio.</p>
      <div class="row">
        <button id="revealPlugin">Reveal Provider URL</button>
        <button class="secondary" id="copyPlugin" hidden>Copy URL</button>
      </div>
      <textarea id="pluginUrl" class="code" rows="2" readonly style="display:none;margin-top:12px" aria-label="Private Nuvio Provider URL"></textarea>
      <div class="message" id="pluginMessage"></div>
    </article>

    <!-- 6. Calendar & Recommended Add-on -->
    <article class="card">
      <div class="card-header">
        <h2>6. Discovery & Calendar Add-on</h2>
        <span class="badge">Stremio/Nuvio Catalog</span>
      </div>
      <p>Feeds Airing Today, This Week, New & Returning, and personalized recommendations.</p>
      <div class="row">
        <button id="revealCatalog">Reveal Add-on URL</button>
        <button class="secondary" id="copyCatalog" hidden>Copy URL</button>
      </div>
      <textarea id="catalogUrl" class="code" rows="2" readonly style="display:none;margin-top:12px" aria-label="Private Nuvio Catalog URL"></textarea>
      <div class="message" id="catalogMessage"></div>
    </article>

    <!-- 7. Included Discovery Catalogs Overview & Customizer -->
    <article class="card wide">
      <div class="card-header">
        <h2>7. Active Discovery & Calendar Feeds</h2>
        <span class="badge">Drag & Drop / Re-order</span>
      </div>
      <p>Customize which feeds are published to Nuvio and their display order. Drag rows or use the arrow buttons to rearrange, then toggle feeds on or off:</p>
      
      <div id="feedList" class="feed-list">
        <!-- Dynamically rendered draggable list of feeds -->
      </div>

      <div class="row" style="margin-top:16px">
        <button id="saveFeeds">Save Feeds Layout</button>
        <button class="secondary" id="resetFeeds">Reset to Default</button>
      </div>
      <div class="message" id="feedsMessage"></div>
    </article>

    <!-- 8. Manual Seeds (Optional Customization) -->
    <article class="card wide">
      <div class="card-header">
        <h2>8. Manual Recommendation Seeds (Optional)</h2>
      </div>
      <p>If you prefer manual recommendations instead of or in addition to Nuvio Cloud library sync:</p>
      <div class="row">
        <div style="flex:1;min-width:280px">
          <label for="seedShows">Favorite TV Shows (commas or newlines)</label>
          <textarea id="seedShows" rows="3" placeholder="King of the Hill, Severance, The Bear"></textarea>
          <div class="row" style="margin-top:10px">
            <button class="secondary" id="saveSeeds">Save TV Seeds</button>
          </div>
        </div>
        <div style="flex:1;min-width:280px">
          <label for="seedMovies">Favorite Movies (commas or newlines)</label>
          <textarea id="seedMovies" rows="3" placeholder="Inception, Interstellar, The Dark Knight"></textarea>
          <div class="row" style="margin-top:10px">
            <button class="secondary" id="saveMovieSeeds">Save Movie Seeds</button>
          </div>
        </div>
      </div>
      <div class="message" id="manualSeedsMessage"></div>
    </article>
  </section>

  <footer>
    <p>MovieBoxPro Companion &bull; Safe, private, self-hosted streaming hub for Nuvio.</p>
    <div style="margin-top:12px">
      <button class="secondary" id="logoutBtn" style="padding:6px 12px;font-size:12px">Lock Dashboard Session</button>
    </div>
  </footer>
</main>

<script>
(() => {
  const q = (id) => document.getElementById(id);
  const msg = (id, text, type = '') => {
    const el = q(id);
    if (!el) return;
    el.textContent = text || '';
    el.className = 'message ' + type;
  };
  const dot = (id, good) => {
    const el = q(id);
    if (el) el.className = 'dot ' + (good ? 'good' : 'bad');
  };

  q('logoutBtn').onclick = async () => {
    try {
      await api('/api/setup/logout', { method: 'POST' });
      window.location.reload();
    } catch {}
  };

  let pluginValue = '';
  let catalogValue = '';
  let feedsData = [];

  function renderFeeds() {
    const list = q('feedList');
    if (!list) return;
    list.innerHTML = '';
    feedsData.forEach((feed, idx) => {
      const item = document.createElement('div');
      item.className = 'feed-item' + (feed.enabled ? '' : ' disabled');
      item.draggable = true;
      item.dataset.index = idx;
      item.innerHTML = \`
        <span class="feed-drag" title="Drag to reorder">⋮⋮</span>
        <span class="feed-badge">\${feed.type === 'movie' ? 'MOV' : 'TV'}</span>
        <div class="feed-info">
          <div class="feed-title">\${feed.name}</div>
          <div class="feed-desc">\${feed.description || ''}</div>
        </div>
        <div class="feed-actions">
          <button type="button" class="feed-btn up-btn" title="Move Up" \${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="feed-btn down-btn" title="Move Down" \${idx === feedsData.length - 1 ? 'disabled' : ''}>▼</button>
          <label class="feed-toggle">
            <input type="checkbox" class="feed-check" \${feed.enabled ? 'checked' : ''}>
            <span>\${feed.enabled ? 'On' : 'Off'}</span>
          </label>
        </div>
      \`;

      // Up / Down
      item.querySelector('.up-btn').onclick = (e) => {
        e.stopPropagation();
        if (idx > 0) {
          const temp = feedsData[idx - 1];
          feedsData[idx - 1] = feedsData[idx];
          feedsData[idx] = temp;
          renderFeeds();
        }
      };
      item.querySelector('.down-btn').onclick = (e) => {
        e.stopPropagation();
        if (idx < feedsData.length - 1) {
          const temp = feedsData[idx + 1];
          feedsData[idx + 1] = feedsData[idx];
          feedsData[idx] = temp;
          renderFeeds();
        }
      };

      // Toggle
      const chk = item.querySelector('.feed-check');
      chk.onchange = () => {
        feed.enabled = chk.checked;
        renderFeeds();
      };

      // Drag & Drop
      item.ondragstart = (e) => {
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(idx));
      };
      item.ondragend = () => {
        item.classList.remove('dragging');
        list.querySelectorAll('.feed-item').forEach(el => el.classList.remove('drag-over'));
      };
      item.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      };
      item.ondragleave = () => {
        item.classList.remove('drag-over');
      };
      item.ondrop = (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const fromIdx = Number(e.dataTransfer.getData('text/plain'));
        const toIdx = idx;
        if (!isNaN(fromIdx) && fromIdx !== toIdx) {
          const moved = feedsData.splice(fromIdx, 1)[0];
          feedsData.splice(toIdx, 0, moved);
          renderFeeds();
        }
      };

      list.appendChild(item);
    });
  }

  async function copyText(text, fallbackId) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const input = q(fallbackId);
    if (!input) throw new Error('Clipboard access denied');
    input.focus();
    input.select();
    const ok = document.execCommand('copy');
    if (!ok) throw new Error('Copy failed');
  }

  async function api(path, opts = {}) {
    const res = await fetch(path, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed (' + res.status + ')' }));
      throw new Error(err.error || 'Server returned status ' + res.status);
    }
    return res.json().catch(() => ({}));
  }

  async function loadState() {
    try {
      const s = await api('/api/setup/state');
      q('publicUrl').value = s.publicUrl || '';
      dot('tmdbDot', s.tmdbConfigured);
      q('tmdbText').textContent = s.tmdbConfigured ? 'Key Saved' : 'Key Missing';
      
      const isConfigured = s.companionKeyConfigured && s.pluginKeyConfigured;
      const addrDisplay = s.publicUrl ? s.publicUrl.replace(/^https?:\\/\\//, '') : 'Ready';
      q('serviceBadge').innerHTML = '<span class="dot ' + (isConfigured ? 'good' : 'warn') + '"></span> ' + (isConfigured ? 'Online (' + addrDisplay + ')' : 'Setup Incomplete');
      q('serviceText').textContent = isConfigured ? 'Configured & Online' : 'Action Required';

      if (s.docker) {
        q('novnc').hidden = false;
        q('novnc').href = s.noVncUrl;
      }

      if (Array.isArray(s.recommendationSeeds)) {
        q('seedShows').value = s.recommendationSeeds.map(x => x.name).join(', ');
      }
      if (Array.isArray(s.movieRecommendationSeeds)) {
        q('seedMovies').value = s.movieRecommendationSeeds.map(x => x.name).join(', ');
      }

      // Feeds Customizer
      if (Array.isArray(s.catalogsConfig)) {
        feedsData = s.catalogsConfig;
        renderFeeds();
      }

      if (s.nuvioCloud?.connected) {
        q('cloudAuthForm').style.display = 'none';
        q('cloudConnectedView').style.display = 'block';
        q('cloudUserEmail').textContent = s.nuvioCloud.email;
        q('cloudProfileName').textContent = s.nuvioCloud.profileName || 'Default Profile';
        q('cloudLastSync').textContent = s.nuvioCloud.lastSync ? new Date(s.nuvioCloud.lastSync).toLocaleString() : 'Never';
        q('cloudStatusText').textContent = 'Connected';
        q('nuvioCloudBadge').innerHTML = '<span class="dot good"></span> Nuvio Cloud: Connected';
      } else {
        q('cloudAuthForm').style.display = 'block';
        q('cloudConnectedView').style.display = 'none';
        q('cloudStatusText').textContent = 'Not connected';
        q('nuvioCloudBadge').innerHTML = '<span class="dot bad"></span> Nuvio Cloud: Not Connected';
      }
    } catch (e) {
      msg('configMessage', 'Failed to load companion state: ' + e.message, 'error');
    }
  }

  q('saveUrl').onclick = async () => {
    try {
      await api('/api/setup/config', { method: 'POST', body: JSON.stringify({ publicUrl: q('publicUrl').value }) });
      msg('configMessage', 'Address saved successfully.', 'ok');
    } catch (e) { msg('configMessage', e.message, 'error'); }
  };

  q('saveTmdb').onclick = async () => {
    try {
      await api('/api/setup/config', { method: 'POST', body: JSON.stringify({ tmdbApiKey: q('tmdbKey').value }) });
      q('tmdbKey').value = '';
      dot('tmdbDot', true);
      q('tmdbText').textContent = 'Key Saved';
      msg('tmdbMessage', 'TMDb API key saved securely.', 'ok');
    } catch (e) { msg('tmdbMessage', e.message, 'error'); }
  };

  q('openLogin').onclick = async () => {
    try {
      q('openLogin').disabled = true;
      await api('/api/setup/login', { method: 'POST' });
      msg('loginMessage', 'Login window opened. Complete the code/QR login there, then check status.', 'ok');
    } catch (e) { msg('loginMessage', e.message, 'error'); }
    finally { q('openLogin').disabled = false; }
  };

  q('checkLogin').onclick = async () => {
    try {
      q('checkLogin').disabled = true;
      const s = await api('/api/setup/moviebox-status');
      q('movieboxText').textContent = s.authenticated ? 'Authenticated' : 'Login Required';
      q('mbpBadge').innerHTML = '<span class="dot ' + (s.authenticated ? 'good' : 'bad') + '"></span> MovieBoxPro: ' + (s.authenticated ? 'Connected' : 'Login Required');
      msg('loginMessage', s.authenticated ? 'MovieBoxPro session is active and ready.' : 'Session not detected. Complete login and check again.', s.authenticated ? 'ok' : 'error');
    } catch (e) {
      msg('loginMessage', e.message, 'error');
    } finally { q('checkLogin').disabled = false; }
  };

  q('loginCloud').onclick = async () => {
    try {
      q('loginCloud').disabled = true;
      msg('cloudMessage', 'Authenticating and syncing library with Nuvio Cloud…');
      const d = await api('/api/setup/nuvio-cloud/login', {
        method: 'POST',
        body: JSON.stringify({ email: q('cloudEmail').value, password: q('cloudPass').value })
      });
      msg('cloudMessage', 'Connected! Synced ' + (d.syncSummary?.itemCount || 0) + ' items from Nuvio Cloud.', 'ok');
      await loadState();
    } catch (e) {
      msg('cloudMessage', e.message, 'error');
    } finally {
      q('loginCloud').disabled = false;
    }
  };

  q('syncCloud').onclick = async () => {
    try {
      q('syncCloud').disabled = true;
      msg('cloudMessage', 'Syncing library with Nuvio Cloud…');
      const d = await api('/api/setup/nuvio-cloud/sync', { method: 'POST' });
      msg('cloudMessage', 'Sync complete! ' + (d.syncSummary?.itemCount || 0) + ' library items refreshed.', 'ok');
      await loadState();
    } catch (e) {
      msg('cloudMessage', e.message, 'error');
    } finally {
      q('syncCloud').disabled = false;
    }
  };

  q('disconnectCloud').onclick = async () => {
    try {
      await api('/api/setup/nuvio-cloud/disconnect', { method: 'POST' });
      msg('cloudMessage', 'Disconnected from Nuvio Cloud.', 'ok');
      await loadState();
    } catch (e) {
      msg('cloudMessage', e.message, 'error');
    }
  };

  q('revealPlugin').onclick = async () => {
    try {
      const d = await api('/api/setup/plugin-url');
      pluginValue = d.url;
      q('pluginUrl').value = d.url;
      q('pluginUrl').style.display = 'block';
      q('copyPlugin').hidden = false;
      msg('pluginMessage', 'Add this under Nuvio Web -> Plugins -> Add Plugin Repository URL.', 'ok');
    } catch (e) { msg('pluginMessage', e.message, 'error'); }
  };

  q('copyPlugin').onclick = async () => {
    try {
      await copyText(pluginValue, 'pluginUrl');
      msg('pluginMessage', 'Provider URL copied to clipboard!', 'ok');
    } catch {
      q('pluginUrl').focus();
      q('pluginUrl').select();
      msg('pluginMessage', 'URL selected; use Ctrl+C / Cmd+C to copy.', 'error');
    }
  };

  q('revealCatalog').onclick = async () => {
    try {
      const d = await api('/api/setup/catalog-url');
      catalogValue = d.url;
      q('catalogUrl').value = d.url;
      q('catalogUrl').style.display = 'block';
      q('copyCatalog').hidden = false;
      msg('catalogMessage', 'Add this under Nuvio Web -> Add-ons -> Add Community Add-on URL.', 'ok');
    } catch (e) { msg('catalogMessage', e.message, 'error'); }
  };

  q('copyCatalog').onclick = async () => {
    try {
      await copyText(catalogValue, 'catalogUrl');
      msg('catalogMessage', 'Add-on URL copied to clipboard!', 'ok');
    } catch {
      q('catalogUrl').focus();
      q('catalogUrl').select();
      msg('catalogMessage', 'URL selected; use Ctrl+C / Cmd+C to copy.', 'error');
    }
  };

  q('saveFeeds').onclick = async () => {
    try {
      q('saveFeeds').disabled = true;
      const clean = feedsData.map(f => ({ id: f.id, enabled: Boolean(f.enabled) }));
      const d = await api('/api/setup/catalogs-config', {
        method: 'POST',
        body: JSON.stringify({ catalogs: clean })
      });
      feedsData = d.catalogs || clean;
      renderFeeds();
      msg('feedsMessage', 'Feed order and active toggles saved! Refresh or re-add the add-on in Nuvio to apply.', 'ok');
    } catch (e) {
      msg('feedsMessage', e.message, 'error');
    } finally {
      q('saveFeeds').disabled = false;
    }
  };

  q('resetFeeds').onclick = async () => {
    try {
      q('resetFeeds').disabled = true;
      const d = await api('/api/setup/catalogs-config', {
        method: 'POST',
        body: JSON.stringify({ catalogs: [] })
      });
      feedsData = d.catalogs;
      renderFeeds();
      msg('feedsMessage', 'Reset to default order and active feeds.', 'ok');
    } catch (e) {
      msg('feedsMessage', e.message, 'error');
    } finally {
      q('resetFeeds').disabled = false;
    }
  };

  q('saveSeeds').onclick = async () => {
    try {
      q('saveSeeds').disabled = true;
      const d = await api('/api/setup/recommendations', { method: 'POST', body: JSON.stringify({ shows: q('seedShows').value }) });
      q('seedShows').value = d.seeds.map(x => x.name).join(', ');
      msg('manualSeedsMessage', 'Saved ' + d.seeds.length + ' TV recommendation seeds.', 'ok');
    } catch (e) { msg('manualSeedsMessage', e.message, 'error'); }
    finally { q('saveSeeds').disabled = false; }
  };

  q('saveMovieSeeds').onclick = async () => {
    try {
      q('saveMovieSeeds').disabled = true;
      const d = await api('/api/setup/recommendations/movies', { method: 'POST', body: JSON.stringify({ movies: q('seedMovies').value }) });
      q('seedMovies').value = d.seeds.map(x => x.name).join(', ');
      msg('manualSeedsMessage', 'Saved ' + d.seeds.length + ' Movie recommendation seeds.', 'ok');
    } catch (e) { msg('manualSeedsMessage', e.message, 'error'); }
    finally { q('saveMovieSeeds').disabled = false; }
  };

  loadState();
})();
</script>
</body>
</html>`;
}
