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
    
    .catalog-tag-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-top:12px}
    .catalog-tag{
      background:var(--panel-sub);
      border:1px solid var(--line);
      padding:10px 12px;
      border-radius:10px;
      display:flex;
      align-items:center;
      gap:10px;
    }
    .catalog-tag-icon{width:28px;height:28px;border-radius:6px;background:rgba(56,189,248,0.15);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px}
    .catalog-tag-title{font-weight:600;font-size:13px}
    .catalog-tag-sub{font-size:11px;color:var(--muted)}
    
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
      <p>Connect your Nuvio Cloud account to sync your library and generate smart recommendations.</p>
      <div id="cloudLoginForm">
        <div class="row">
          <div style="flex:1">
            <label for="cloudEmail">Nuvio Email</label>
            <input id="cloudEmail" type="email" placeholder="user@example.com" autocomplete="username">
          </div>
          <div style="flex:1">
            <label for="cloudPass">Nuvio Password</label>
            <input id="cloudPass" type="password" placeholder="••••••••" autocomplete="current-password">
          </div>
        </div>
        <div class="row" style="margin-top:14px">
          <button id="loginCloud">Connect Nuvio Cloud</button>
        </div>
      </div>
      <div id="cloudConnectedSection" style="display:none">
        <div style="background:var(--panel-sub);padding:12px;border-radius:10px;border:1px solid var(--line);margin-bottom:12px">
          <div style="font-size:13px;font-weight:600" id="cloudAccountUser">Connected User</div>
          <div style="font-size:12px;color:var(--muted)" id="cloudSyncStats">Last Synced: Never</div>
        </div>
        <div class="row">
          <button id="syncCloud">Sync Library Now</button>
          <button class="secondary danger" id="disconnectCloud">Disconnect</button>
        </div>
      </div>
      <div class="message" id="cloudMessage"></div>
    </article>

    <!-- 5. Stream Source in Nuvio -->
    <article class="card">
      <div class="card-header">
        <h2>5. Stream Source (MovieBoxPro)</h2>
      </div>
      <p>Add MovieBoxPro as a stream scraper in your Nuvio setup.</p>
      <div class="row">
        <button id="revealPlugin">Reveal Provider URL</button>
        <button class="secondary" id="copyPlugin" hidden>Copy URL</button>
      </div>
      <textarea id="pluginUrl" class="code" rows="2" readonly style="display:none;margin-top:12px" aria-label="Private Nuvio Provider URL"></textarea>
      <div class="message" id="pluginMessage"></div>
    </article>

    <!-- 6. Calendar & Discovery Add-on -->
    <article class="card">
      <div class="card-header">
        <h2>6. Discovery & Calendar Add-on</h2>
      </div>
      <p>Add Airing Today, This Week, New Releases, and Recommendations to Nuvio.</p>
      <div class="row">
        <button id="revealCatalog">Reveal Add-on URL</button>
        <button class="secondary" id="copyCatalog" hidden>Copy URL</button>
      </div>
      <textarea id="catalogUrl" class="code" rows="2" readonly style="display:none;margin-top:12px" aria-label="Private Nuvio Catalog URL"></textarea>
      <div class="message" id="catalogMessage"></div>
    </article>

    <!-- 7. Included Discovery Catalogs Overview -->
    <article class="card wide">
      <div class="card-header">
        <h2>Active Discovery & Calendar Feeds</h2>
      </div>
      <p>The companion dynamically serves these rows directly into Nuvio's home and catalog views:</p>
      <div class="catalog-tag-grid">
        <div class="catalog-tag">
          <div class="catalog-tag-icon">TV</div>
          <div>
            <div class="catalog-tag-title">Airing Today</div>
            <div class="catalog-tag-sub">Broadcast episodes today</div>
          </div>
        </div>
        <div class="catalog-tag">
          <div class="catalog-tag-icon">TV</div>
          <div>
            <div class="catalog-tag-title">This Week (TV)</div>
            <div class="catalog-tag-sub">Upcoming TV this week</div>
          </div>
        </div>
        <div class="catalog-tag">
          <div class="catalog-tag-icon">TV</div>
          <div>
            <div class="catalog-tag-title">New & Returning</div>
            <div class="catalog-tag-sub">Premieres & new seasons</div>
          </div>
        </div>
        <div class="catalog-tag">
          <div class="catalog-tag-icon">TV</div>
          <div>
            <div class="catalog-tag-title">New Series</div>
            <div class="catalog-tag-sub">Trending recent series</div>
          </div>
        </div>
        <div class="catalog-tag">
          <div class="catalog-tag-icon">TV</div>
          <div>
            <div class="catalog-tag-title">Recommended TV</div>
            <div class="catalog-tag-sub">Synced from Nuvio Library</div>
          </div>
        </div>
        <div class="catalog-tag">
          <div class="catalog-tag-icon">MOV</div>
          <div>
            <div class="catalog-tag-title">New Movies</div>
            <div class="catalog-tag-sub">Now playing & digital releases</div>
          </div>
        </div>
        <div class="catalog-tag">
          <div class="catalog-tag-icon">MOV</div>
          <div>
            <div class="catalog-tag-title">This Week (Movies)</div>
            <div class="catalog-tag-sub">Releases arriving this week</div>
          </div>
        </div>
        <div class="catalog-tag">
          <div class="catalog-tag-icon">MOV</div>
          <div>
            <div class="catalog-tag-title">Recommended Movies</div>
            <div class="catalog-tag-sub">Synced from Nuvio Library</div>
          </div>
        </div>
      </div>
    </article>

    <!-- 8. Manual Seeds (Optional Customization) -->
    <article class="card wide">
      <div class="card-header">
        <h2>Manual Recommendation Seeds (Optional)</h2>
      </div>
      <p>If you prefer manual recommendations instead of or in addition to Nuvio Cloud library sync:</p>
      <div class="row">
        <div style="flex:1;min-width:280px">
          <label for="seedShows">Favorite TV Shows (commas or newlines)</label>
          <textarea id="seedShows" rows="3" placeholder="King of the Hill, Severance, The Bear"></textarea>
          <div class="row" style="margin-top:10px">
            <button id="saveSeeds">Save TV Seeds</button>
          </div>
        </div>
        <div style="flex:1;min-width:280px">
          <label for="seedMovies">Favorite Movies (commas or newlines)</label>
          <textarea id="seedMovies" rows="3" placeholder="Dune, Inception, Interstellar"></textarea>
          <div class="row" style="margin-top:10px">
            <button id="saveMovieSeeds">Save Movie Seeds</button>
          </div>
        </div>
      </div>
      <div class="message" id="manualSeedsMessage"></div>
    </article>

    <!-- 9. Final Instructions -->
    <article class="card wide">
      <div class="card-header">
        <h2>Nuvio Device Setup Guide</h2>
      </div>
      <ol>
        <li>Open <strong>Nuvio Web Dashboard</strong> (or your Android TV app settings).</li>
        <li>Under <strong>Plugins / Providers</strong>: Add the <strong>Provider URL</strong> revealed above.</li>
        <li>Under <strong>Add-ons</strong>: Add the <strong>Discovery & Calendar Add-on URL</strong> revealed above.</li>
        <li>Refresh plugins and restart Nuvio on Android TV or mobile to populate the new catalogs and stream sources.</li>
      </ol>
      <div class="row" style="margin-top:16px">
        <button class="secondary" id="logout">Lock Dashboard Session</button>
      </div>
    </article>
  </section>

  <footer>
    MovieBoxPro Local Companion & Discovery Hub for Nuvio. Keep credentials private on your local server.
  </footer>
</main>

<script>
  const q = (id) => document.getElementById(id);
  let pluginValue = '', catalogValue = '';

  function msg(id, text, type = '') {
    q(id).textContent = text;
    q(id).className = 'message ' + type;
  }

  function dot(id, state) {
    const el = q(id);
    if (!el) return;
    el.className = 'dot ' + (state === true ? 'good' : state === false ? 'bad' : '');
  }

  async function copyText(value, fieldId = 'pluginUrl') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(value); return; } catch {}
    }
    const field = q(fieldId);
    field.focus();
    field.select();
    field.setSelectionRange(0, value.length);
    if (!document.execCommand || !document.execCommand('copy')) throw new Error('Copy unavailable');
  }

  async function api(path, options = {}) {
    const r = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const d = r.status === 204 ? {} : await r.json();
    if (!r.ok) throw new Error(d.error || ('Request failed: ' + r.status));
    return d;
  }

  async function loadState() {
    let s;
    try {
      s = await api('/api/setup/state');
    } catch (e) {
      q('serviceBadge').innerHTML = '<span class="dot bad"></span> Service Unavailable';
      return;
    }

    try {
      q('serviceBadge').innerHTML = '<span class="dot good"></span> Service: ' + (s.publicUrl || s.host + ':' + s.port);
      q('serviceText').textContent = s.host + ':' + s.port;
      if (s.publicUrl) q('publicUrl').value = s.publicUrl;

      dot('tmdbDot', Boolean(s.tmdbConfigured));
      q('tmdbText').textContent = s.tmdbConfigured ? 'Key Saved' : 'Key Required';

      q('seedShows').value = (s.recommendationSeeds || []).map(x => x.name).join(', ');
      q('seedMovies').value = (s.movieRecommendationSeeds || []).map(x => x.name).join(', ');

      if (s.docker) {
        q('novnc').hidden = false;
        q('novnc').href = s.noVncUrl;
      }

      // Nuvio Cloud State
      if (s.nuvioCloud && s.nuvioCloud.connected) {
        q('cloudStatusText').textContent = 'Connected';
        q('nuvioCloudBadge').innerHTML = '<span class="dot good"></span> Nuvio Cloud: Connected';
        q('cloudLoginForm').style.display = 'none';
        q('cloudConnectedSection').style.display = 'block';
        q('cloudAccountUser').textContent = 'User: ' + (s.nuvioCloud.email || 'Connected Account');
        const syncTime = s.nuvioCloud.lastSync ? new Date(s.nuvioCloud.lastSync).toLocaleString() : 'Never';
        q('cloudSyncStats').textContent = 'Profile: ' + (s.nuvioCloud.profileName || 'Main') + ' • Synced: ' + syncTime;
      } else {
        q('cloudStatusText').textContent = 'Disconnected';
        q('nuvioCloudBadge').innerHTML = '<span class="dot"></span> Nuvio Cloud: Disconnected';
        q('cloudLoginForm').style.display = 'block';
        q('cloudConnectedSection').style.display = 'none';
      }
    } catch (e) {
      console.error(e);
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

  q('logout').onclick = async () => {
    await api('/api/setup/logout', { method: 'POST' });
    location.reload();
  };

  loadState();
</script>
</body>
</html>`;
}
