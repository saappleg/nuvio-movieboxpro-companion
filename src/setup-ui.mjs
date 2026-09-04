export function setupPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>MovieBoxPro Companion & Nuvio Hub</title>
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Nuvio MBP">
  <meta name="theme-color" content="#070b14">
  <link rel="manifest" href="/app.webmanifest">
  <link rel="icon" type="image/svg+xml" href="/icon.svg">
  <link rel="apple-touch-icon" href="/icon.svg">
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
      <div class="badge" id="introdbBadge"><span class="dot good"></span> IntroDB: Active</div>
    </div>
  </section>

  <!-- In-Dashboard Update Alert Banner -->
  <aside id="updateBanner" class="card wide" style="display:none;background:linear-gradient(135deg,rgba(56,189,248,0.18),rgba(168,85,247,0.18));border-color:var(--accent);margin-bottom:24px">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:24px">🚀</span>
        <div>
          <strong style="color:#fff;font-size:16px">New Update Available: <span id="updateVersionTag"></span></strong>
          <div style="color:var(--muted);font-size:13px" id="updateNotesPreview">A new release of Nuvio MovieBoxPro Companion is available.</div>
        </div>
      </div>
      <div class="row" style="gap:8px">
        <a id="updateReleaseLink" class="button" target="_blank" rel="noreferrer" style="padding:6px 14px;font-size:13px">View on GitHub</a>
        <button class="secondary" id="dismissUpdateBtn" style="padding:6px 12px;font-size:13px">Dismiss</button>
      </div>
    </div>
  </aside>

  <section class="grid">
    <article class="card wide" style="background:linear-gradient(160deg,#131d36,#0c1322);border-color:rgba(56,189,248,0.35)">
      <div class="card-header">
        <h2>👥 Profile & Multi-Device Manager</h2>
        <span class="badge" id="profileBadgeCount">1 Profile Active</span>
      </div>
      <p>Configure dedicated MovieBoxPro logins, separate recommendation seeds, and individual Nuvio plugin/catalog URLs per user or device (e.g. Living Room, Kids, Bedroom).</p>
      
      <div class="row" style="gap:12px;align-items:flex-end">
        <div style="flex:1;min-width:200px">
          <label for="profileSelect">Active Profile</label>
          <select id="profileSelect"></select>
        </div>
        <div>
          <button id="addProfileBtn" class="secondary">+ Add New Profile</button>
          <button id="deleteProfileBtn" class="secondary danger" style="display:none">Delete Profile</button>
        </div>
      </div>

      <div id="profileDetails" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--line)">
        <div class="row" style="gap:16px;justify-content:space-between">
          <div>
            <span class="status">Profile Name: <strong id="activeProfileNameDisplay">Default Profile</strong></span>
            <span class="status" style="margin-left:14px">Session: <strong id="activeProfileSessionDisplay">Checking…</strong></span>
          </div>
          <div class="row" style="gap:8px">
            <button class="secondary" id="profileLoginBtn">Log in to MovieBox for this Profile</button>
            <button class="secondary" id="profileStatusBtn">Check Session</button>
          </div>
        </div>
        <div class="message" id="profileActionMessage"></div>
      </div>
    </article>

    <!-- Stream Activity & Cache Analytics -->
    <article class="card wide" style="background:linear-gradient(160deg,#101a2f,#0a0f1d)">
      <div class="card-header">
        <h2>📊 Stream Activity & Cache Analytics</h2>
        <button class="secondary" id="refreshAnalyticsBtn" style="padding:4px 10px;font-size:12px">Refresh Stats</button>
      </div>
      <p>Real-time performance metrics, TMDb/IntroDB cache ratios, and live playback stream lookups.</p>
      
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:16px">
        <div style="background:var(--panel-sub);padding:14px;border-radius:12px;border:1px solid var(--line)">
          <div style="font-size:12px;color:var(--muted)">Avg Resolution Time</div>
          <div style="font-size:22px;font-weight:700;color:var(--accent);margin-top:4px" id="statAvgTime">0 ms</div>
        </div>
        <div style="background:var(--panel-sub);padding:14px;border-radius:12px;border:1px solid var(--line)">
          <div style="font-size:12px;color:var(--muted)">TMDb Cache Hit Ratio</div>
          <div style="font-size:22px;font-weight:700;color:var(--good);margin-top:4px" id="statCacheRatio">100%</div>
        </div>
        <div style="background:var(--panel-sub);padding:14px;border-radius:12px;border:1px solid var(--line)">
          <div style="font-size:12px;color:var(--muted)">Total Streams Resolved</div>
          <div style="font-size:22px;font-weight:700;color:#fff;margin-top:4px" id="statTotalStreams">0</div>
        </div>
        <div style="background:var(--panel-sub);padding:14px;border-radius:12px;border:1px solid var(--line)">
          <div style="font-size:12px;color:var(--muted)">In-Memory Cache Entries</div>
          <div style="font-size:22px;font-weight:700;color:var(--purple);margin-top:4px" id="statCacheEntries">0</div>
        </div>
      </div>

      <label>Recent Stream Lookups</label>
      <div id="activityList" style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;background:var(--panel-sub);padding:10px;border-radius:10px;border:1px solid var(--line)">
        <div style="color:var(--muted);font-size:13px;text-align:center;padding:12px">No stream requests recorded yet in this session.</div>
      </div>
    </article>

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

    <!-- 3. Timezone & Calendar Preferences -->
    <article class="card">
      <div class="card-header">
        <h2>3. Timezone & Calendar</h2>
        <div class="status"><span id="timezoneStatus">Auto-detected</span></div>
      </div>
      <p>Aligns "Airing Today" and episode premiere dates with your local calendar day.</p>
      <label for="userTimezone">Local Timezone (IANA)</label>
      <div class="row" style="gap:8px">
        <input id="userTimezone" style="flex:1" placeholder="e.g. America/New_York, Europe/London">
      </div>
      <div class="row" style="margin-top:14px">
        <button id="saveTimezone">Save Timezone</button>
        <button class="secondary" id="useDetectedTz">Use Device Timezone</button>
      </div>
      <div class="message" id="timezoneMessage"></div>
    </article>

    <!-- 4. MovieBoxPro Login -->
    <article class="card">
      <div class="card-header">
        <h2>4. MovieBoxPro Session</h2>
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

    <!-- 5. Nuvio Cloud Account Sync -->
    <article class="card">
      <div class="card-header">
        <h2>5. Nuvio Cloud Sync</h2>
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

    <!-- 6. MovieBox Stream Provider Plugin -->
    <article class="card">
      <div class="card-header">
        <h2>6. MovieBox Stream Provider</h2>
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

    <!-- 7. Calendar & Recommended Add-on -->
    <article class="card">
      <div class="card-header">
        <h2>7. Discovery & Calendar Add-on</h2>
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

    <!-- 8. Included Discovery Catalogs Overview & Customizer -->
    <article class="card wide">
      <div class="card-header">
        <h2>8. Active Discovery & Calendar Feeds</h2>
        <span class="badge">Drag & Drop / Re-order</span>
      </div>
      <p>Customize which feeds are published to Nuvio and their display order. Drag rows or use the arrow buttons to rearrange, then toggle feeds on or off:</p>
      
      <div id="feedList" class="feed-list">
        <!-- Dynamically rendered draggable list of feeds -->
      </div>

      <div class="row" style="margin-top:16px">
        <button id="saveFeeds">Save Feeds Layout</button>
        <button class="secondary" id="toggleCustomFeedForm">+ Create Custom Feed</button>
        <button class="secondary" id="resetFeeds">Reset to Default</button>
      </div>

      <!-- Custom Feed Builder Drawer / Form -->
      <div id="customFeedBuilder" style="display:none;margin-top:18px;padding:18px;background:var(--panel-sub);border-radius:12px;border:1px solid var(--line)">
        <h3 style="margin:0 0 12px;font-size:16px;color:var(--accent)">Create Bespoke Discovery Feed</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
          <div>
            <label for="customFeedTitle">Feed Title</label>
            <input id="customFeedTitle" placeholder="e.g. 90s Sci-Fi Thrillers, Studio Ghibli">
          </div>
          <div>
            <label for="customFeedType">Media Type</label>
            <select id="customFeedType">
              <option value="movie">Movies</option>
              <option value="series">TV Series</option>
            </select>
          </div>
          <div>
            <label for="customFeedGenre">Genre</label>
            <select id="customFeedGenre">
              <option value="">Any Genre</option>
              <option value="28">Action (Movie) / Action & Adventure (TV)</option>
              <option value="12">Adventure</option>
              <option value="16">Animation</option>
              <option value="35">Comedy</option>
              <option value="80">Crime</option>
              <option value="99">Documentary</option>
              <option value="18">Drama</option>
              <option value="14">Fantasy</option>
              <option value="27">Horror</option>
              <option value="9648">Mystery</option>
              <option value="10749">Romance</option>
              <option value="878">Sci-Fi (Movie) / Sci-Fi & Fantasy (TV)</option>
              <option value="53">Thriller</option>
              <option value="10752">War</option>
              <option value="37">Western</option>
            </select>
          </div>
          <div>
            <label for="customFeedLanguage">Original Language</label>
            <select id="customFeedLanguage">
              <option value="">Any Language</option>
              <option value="en">English (en)</option>
              <option value="ja">Japanese (ja)</option>
              <option value="ko">Korean (ko)</option>
              <option value="fr">French (fr)</option>
              <option value="es">Spanish (es)</option>
              <option value="de">German (de)</option>
              <option value="it">Italian (it)</option>
            </select>
          </div>
          <div>
            <label for="customFeedYear">Release Year / Decade</label>
            <input id="customFeedYear" placeholder="e.g. 1999 or leave blank">
          </div>
          <div>
            <label for="customFeedMinRating">Min IMDb/TMDb Rating (0-10)</label>
            <input id="customFeedMinRating" type="number" step="0.5" min="0" max="10" placeholder="e.g. 7.5">
          </div>
          <div>
            <label for="customFeedSort">Sort By</label>
            <select id="customFeedSort">
              <option value="popularity.desc">Most Popular</option>
              <option value="vote_average.desc">Highest Rated</option>
              <option value="primary_release_date.desc">Newest Releases</option>
              <option value="revenue.desc">Top Box Office (Movies)</option>
            </select>
          </div>
        </div>
        <div class="row" style="margin-top:14px">
          <button id="addCustomFeedBtn">Add to My Feeds</button>
          <button class="secondary" id="cancelCustomFeedBtn">Cancel</button>
        </div>
      </div>
      <div class="message" id="feedsMessage"></div>
    </article>

    <!-- 9. Manual Seeds (Optional Customization) -->
    <article class="card wide">
      <div class="card-header">
        <h2>9. Recommendation Seeds (Unlimited)</h2>
        <span class="badge" id="seedsSummaryBadge">0 items</span>
      </div>
      <p>Add unlimited TV shows and movies for personalized recommendations and library-based release tracking. Comma or newline-separated:</p>
      <div class="row">
        <div style="flex:1;min-width:280px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;margin-bottom:6px">
            <label for="seedShows" style="margin:0">Favorite TV Shows</label>
            <span class="badge" id="tvSeedsBadge" style="font-size:11px">0 shows</span>
          </div>
          <textarea id="seedShows" rows="4" placeholder="King of the Hill, Severance, The Bear, Succession..."></textarea>
          <div class="row" style="margin-top:10px">
            <button class="secondary" id="saveSeeds">Save TV Seeds</button>
            <button class="secondary" id="clearTvSeeds" style="opacity:0.7">Clear</button>
          </div>
        </div>
        <div style="flex:1;min-width:280px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;margin-bottom:6px">
            <label for="seedMovies" style="margin:0">Favorite Movies</label>
            <span class="badge" id="movieSeedsBadge" style="font-size:11px">0 movies</span>
          </div>
          <textarea id="seedMovies" rows="4" placeholder="Inception, Interstellar, The Dark Knight, Oppenheimer..."></textarea>
          <div class="row" style="margin-top:10px">
            <button class="secondary" id="saveMovieSeeds">Save Movie Seeds</button>
            <button class="secondary" id="clearMovieSeeds" style="opacity:0.7">Clear</button>
          </div>
        </div>
      </div>
      <div class="message" id="manualSeedsMessage"></div>
    </article>

    <!-- 10. Backup & System Restore -->
    <article class="card wide">
      <div class="card-header">
        <h2>10. Backup & System Restore</h2>
        <span class="badge">1-Click Migration</span>
      </div>
      <p>Export all your profiles, recommendation seeds, custom feeds, and companion preferences to a portable backup JSON file, or restore an existing backup.</p>
      <div class="row" style="margin-top:14px">
        <button id="downloadBackupBtn">Download Backup (.json)</button>
        <button class="secondary" id="triggerRestoreBtn">Restore from Backup File</button>
        <input type="file" id="restoreFileInput" accept=".json" style="display:none">
      </div>
      <div class="message" id="backupMessage"></div>
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
  let masterFeeds = [];
  let detectedTz = 'UTC';

  function renderFeeds() {
    const list = q('feedList');
    if (!list) return;
    list.innerHTML = '';
    feedsData.forEach((feed, idx) => {
      const item = document.createElement('div');
      item.className = 'feed-item' + (feed.enabled ? '' : ' disabled');
      item.draggable = true;
      item.dataset.index = idx;
      const isCustom = Boolean(feed.isCustom || String(feed.id).startsWith('custom-'));
      const master = masterFeeds.find(m => m.id === feed.id);
      const feedType = (feed.type || master?.type) === 'movie' ? 'MOV' : 'TV';
      const feedTitle = feed.name || master?.name || feed.id || 'Custom Feed';
      const feedDesc = feed.description || master?.description || '';
      item.innerHTML = \`
        <span class="feed-drag" title="Drag to reorder">⋮⋮</span>
        <span class="feed-badge">\${feedType}</span>
        <div class="feed-info">
          <div class="feed-title">\${feedTitle} \${isCustom ? '<span class="badge" style="font-size:10px;padding:2px 6px;margin-left:4px;color:var(--accent)">Custom</span>' : ''}</div>
          <div class="feed-desc">\${feedDesc}</div>
        </div>
        <div class="feed-actions">
          <button type="button" class="feed-btn up-btn" title="Move Up" \${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="feed-btn down-btn" title="Move Down" \${idx === feedsData.length - 1 ? 'disabled' : ''}>▼</button>
          \${isCustom ? '<button type="button" class="feed-btn del-btn" title="Delete custom feed" style="color:var(--bad)">✕</button>' : ''}
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

      // Custom Delete
      if (item.querySelector('.del-btn')) {
        item.querySelector('.del-btn').onclick = (e) => {
          e.stopPropagation();
          if (confirm('Delete custom feed "' + feed.name + '"?')) {
            feedsData.splice(idx, 1);
            renderFeeds();
          }
        };
      }

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

  function updateSeedBadges(tvSeeds = [], movieSeeds = []) {
    const tvCount = Array.isArray(tvSeeds) ? tvSeeds.length : 0;
    const movieCount = Array.isArray(movieSeeds) ? movieSeeds.length : 0;
    if (q('tvSeedsBadge')) q('tvSeedsBadge').textContent = tvCount + (tvCount === 1 ? ' show' : ' shows');
    if (q('movieSeedsBadge')) q('movieSeedsBadge').textContent = movieCount + (movieCount === 1 ? ' movie' : ' movies');
    if (q('seedsSummaryBadge')) q('seedsSummaryBadge').textContent = (tvCount + movieCount) + ' total seeds';
  }

  async function loadState() {
    try {
      const s = await api('/api/setup/state');
      q('publicUrl').value = s.publicUrl || '';
      dot('tmdbDot', s.tmdbConfigured);
      q('tmdbText').textContent = s.tmdbConfigured ? 'Key Saved' : 'Key Missing';
      
      const isConfigured = s.companionKeyConfigured && s.pluginKeyConfigured;
      const addrDisplay = s.publicUrl ? s.publicUrl.replace(/^https?:[/][/]/, '') : 'Ready';
      q('serviceBadge').innerHTML = '<span class="dot ' + (isConfigured ? 'good' : 'warn') + '"></span> ' + (isConfigured ? 'Online (' + addrDisplay + ')' : 'Setup Incomplete');
      q('serviceText').textContent = isConfigured ? 'Configured & Online' : 'Action Required';

      detectedTz = s.detectedTimezone || (Intl?.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC');
      q('userTimezone').value = s.userTimezone || detectedTz;
      q('timezoneStatus').textContent = s.userTimezone ? 'Saved: ' + s.userTimezone : 'Device: ' + detectedTz;

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
      updateSeedBadges(s.recommendationSeeds, s.movieRecommendationSeeds);

      // Feeds Customizer
      if (Array.isArray(s.catalogsConfig)) {
        masterFeeds = s.catalogsConfig;
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

  q('useDetectedTz').onclick = () => {
    const localTz = Intl?.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : detectedTz;
    q('userTimezone').value = localTz;
  };

  q('saveTimezone').onclick = async () => {
    try {
      q('saveTimezone').disabled = true;
      const res = await api('/api/setup/config', { method: 'POST', body: JSON.stringify({ userTimezone: q('userTimezone').value }) });
      q('timezoneStatus').textContent = res.userTimezone ? 'Saved: ' + res.userTimezone : 'Device: ' + detectedTz;
      msg('timezoneMessage', 'Timezone saved! Calendar and episode dates will format accordingly.', 'ok');
    } catch (e) {
      msg('timezoneMessage', e.message, 'error');
    } finally {
      q('saveTimezone').disabled = false;
    }
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
    } finally {
      q('checkLogin').disabled = false;
    }
  };

  q('loginCloud').onclick = async () => {
    try {
      q('loginCloud').disabled = true;
      msg('cloudMessage', 'Authenticating and syncing library with Nuvio Cloud…');
      const d = await api('/api/setup/nuvio-cloud/login', {
        method: 'POST',
        body: JSON.stringify({ email: q('cloudEmail').value, password: q('cloudPass').value, profileId: currentProfileId })
      });
      msg('cloudMessage', 'Connected! Synced ' + (d.syncSummary?.itemCount || 0) + ' items from Nuvio Cloud.', 'ok');
      await loadProfilesList();
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
      const d = await api('/api/setup/nuvio-cloud/sync', { method: 'POST', body: JSON.stringify({ profileId: currentProfileId }) });
      msg('cloudMessage', 'Sync complete! ' + (d.syncSummary?.itemCount || 0) + ' library items refreshed.', 'ok');
      await loadProfilesList();
    } catch (e) {
      msg('cloudMessage', e.message, 'error');
    } finally {
      q('syncCloud').disabled = false;
    }
  };

  q('disconnectCloud').onclick = async () => {
    try {
      await api('/api/setup/nuvio-cloud/disconnect', { method: 'POST', body: JSON.stringify({ profileId: currentProfileId }) });
      msg('cloudMessage', 'Disconnected from Nuvio Cloud.', 'ok');
      await loadProfilesList();
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
      const clean = feedsData.map(f => ({ id: f.id, enabled: Boolean(f.enabled), ...(f.isCustom ? { type: f.type, name: f.name, description: f.description, filters: f.filters, isCustom: true } : {}) }));
      const d = await api('/api/setup/catalogs-config', {
        method: 'POST',
        body: JSON.stringify({ catalogs: clean, profileId: currentProfileId })
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
        body: JSON.stringify({ catalogs: [], profileId: currentProfileId })
      });
      feedsData = d.catalogs || (masterFeeds.length ? JSON.parse(JSON.stringify(masterFeeds)) : []);
      renderFeeds();
      msg('feedsMessage', 'Reset to default order and active feeds.', 'ok');
    } catch (e) {
      msg('feedsMessage', e.message, 'error');
    } finally {
      q('resetFeeds').disabled = false;
    }
  };

  q('toggleCustomFeedForm').onclick = () => {
    const el = q('customFeedBuilder');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  q('cancelCustomFeedBtn').onclick = () => {
    q('customFeedBuilder').style.display = 'none';
  };

  q('addCustomFeedBtn').onclick = () => {
    const title = q('customFeedTitle').value.trim();
    if (!title) {
      alert('Please enter a title for your custom feed.');
      return;
    }
    const type = q('customFeedType').value;
    const genre = q('customFeedGenre').value;
    const lang = q('customFeedLanguage').value;
    const year = q('customFeedYear').value.trim();
    const minRating = q('customFeedMinRating').value.trim();
    const sort = q('customFeedSort').value;

    const slug = 'custom-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36).slice(-4);
    const filters = {};
    if (genre) filters.with_genres = genre;
    if (lang) filters.with_original_language = lang;
    if (year) {
      if (type === 'series') filters.first_air_date_year = year;
      else filters.primary_release_year = year;
    }
    if (minRating) {
      filters.vote_average_gte = minRating;
      filters.vote_count_gte = '10';
    }
    if (sort) filters.sort_by = sort;

    const newFeed = {
      type,
      id: slug,
      name: title,
      description: 'Custom ' + (type === 'movie' ? 'movie' : 'TV') + ' feed',
      filters,
      enabled: true,
      isCustom: true
    };

    feedsData.unshift(newFeed);
    renderFeeds();
    q('customFeedTitle').value = '';
    q('customFeedYear').value = '';
    q('customFeedMinRating').value = '';
    q('customFeedBuilder').style.display = 'none';
    msg('feedsMessage', 'Added "' + title + '" to feeds! Click "Save Feeds Layout" to publish.', 'ok');
  };

  q('downloadBackupBtn').onclick = async () => {
    try {
      q('downloadBackupBtn').disabled = true;
      msg('backupMessage', 'Generating backup payload…');
      const backupData = await api('/api/setup/backup');
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = 'nuvio-companion-backup-' + dateStr + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      msg('backupMessage', 'Backup downloaded successfully.', 'ok');
    } catch (e) {
      msg('backupMessage', e.message, 'error');
    } finally {
      q('downloadBackupBtn').disabled = false;
    }
  };

  q('triggerRestoreBtn').onclick = () => {
    q('restoreFileInput').click();
  };

  q('restoreFileInput').onchange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!confirm('Restore configuration from "' + file.name + '"? This will overwrite active profiles and settings.')) return;
        msg('backupMessage', 'Restoring system configuration…');
        const res = await api('/api/setup/restore', {
          method: 'POST',
          body: JSON.stringify(parsed)
        });
        msg('backupMessage', 'Restored ' + res.restoredProfilesCount + ' profiles successfully! Reloading…', 'ok');
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        msg('backupMessage', 'Restore failed: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  q('saveSeeds').onclick = async () => {
    try {
      q('saveSeeds').disabled = true;
      const d = await api('/api/setup/recommendations', { method: 'POST', body: JSON.stringify({ shows: q('seedShows').value, profileId: currentProfileId }) });
      q('seedShows').value = (d.seeds || []).map(x => x.name).join(', ');
      updateSeedBadges(d.seeds, null);
      msg('manualSeedsMessage', 'Saved ' + (d.seeds?.length || 0) + ' TV recommendation seeds.', 'ok');
      await loadProfilesList();
    } catch (e) { msg('manualSeedsMessage', e.message, 'error'); }
    finally { q('saveSeeds').disabled = false; }
  };

  q('clearTvSeeds').onclick = async () => {
    if (!confirm('Clear all saved TV seeds for this profile?')) return;
    try {
      q('seedShows').value = '';
      await api('/api/setup/recommendations', { method: 'POST', body: JSON.stringify({ shows: '', profileId: currentProfileId }) }).catch(() => {});
      updateSeedBadges([], null);
      msg('manualSeedsMessage', 'TV recommendation seeds cleared.', 'ok');
      await loadProfilesList();
    } catch (e) { msg('manualSeedsMessage', e.message, 'error'); }
  };

  q('saveMovieSeeds').onclick = async () => {
    try {
      q('saveMovieSeeds').disabled = true;
      const d = await api('/api/setup/recommendations/movies', { method: 'POST', body: JSON.stringify({ movies: q('seedMovies').value, profileId: currentProfileId }) });
      q('seedMovies').value = (d.seeds || []).map(x => x.name).join(', ');
      updateSeedBadges(null, d.seeds);
      msg('manualSeedsMessage', 'Saved ' + (d.seeds?.length || 0) + ' Movie recommendation seeds.', 'ok');
      await loadProfilesList();
    } catch (e) { msg('manualSeedsMessage', e.message, 'error'); }
    finally { q('saveMovieSeeds').disabled = false; }
  };

  q('clearMovieSeeds').onclick = async () => {
    if (!confirm('Clear all saved Movie seeds for this profile?')) return;
    try {
      q('seedMovies').value = '';
      await api('/api/setup/recommendations/movies', { method: 'POST', body: JSON.stringify({ movies: '', profileId: currentProfileId }) }).catch(() => {});
      updateSeedBadges(null, []);
      msg('manualSeedsMessage', 'Movie recommendation seeds cleared.', 'ok');
      await loadProfilesList();
    } catch (e) { msg('manualSeedsMessage', e.message, 'error'); }
  };

  let allProfiles = [];
  let currentProfileId = 'default';

  async function loadProfilesList() {
    try {
      const data = await api('/api/setup/profiles');
      allProfiles = Array.isArray(data.profiles) ? data.profiles : [];
      const select = q('profileSelect');
      select.innerHTML = '';
      allProfiles.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name + (p.id === 'default' ? ' (Default)' : '');
        select.appendChild(opt);
      });
      select.value = currentProfileId;
      q('profileBadgeCount').textContent = allProfiles.length + (allProfiles.length === 1 ? ' Profile Active' : ' Profiles Active');
      updateActiveProfileView();
    } catch {}
  }

  function updateActiveProfileView() {
    const p = allProfiles.find(x => x.id === currentProfileId) || allProfiles[0];
    if (!p) return;
    currentProfileId = p.id;
    q('activeProfileNameDisplay').textContent = p.name;
    q('deleteProfileBtn').style.display = p.id === 'default' ? 'none' : 'inline-flex';
    pluginValue = p.pluginUrl;
    catalogValue = p.catalogUrl;
    if (q('pluginUrl').style.display !== 'none') q('pluginUrl').value = p.pluginUrl;
    if (q('catalogUrl').style.display !== 'none') q('catalogUrl').value = p.catalogUrl;

    // Populate seeds for active profile
    const tvSeeds = Array.isArray(p.recommendationSeeds) ? p.recommendationSeeds : [];
    const movieSeeds = Array.isArray(p.movieRecommendationSeeds) ? p.movieRecommendationSeeds : [];
    q('seedShows').value = tvSeeds.map(x => x.name).join(', ');
    q('seedMovies').value = movieSeeds.map(x => x.name).join(', ');
    updateSeedBadges(tvSeeds, movieSeeds);

    // Populate feeds layout for active profile
    if (Array.isArray(p.catalogsConfig) && p.catalogsConfig.length) {
      feedsData = p.catalogsConfig.map(f => {
        const master = masterFeeds.find(m => m.id === f.id);
        return {
          ...(master || {}),
          ...f,
          name: f.name || master?.name || f.id,
          type: f.type || master?.type || 'series',
          description: f.description || master?.description || ''
        };
      });
      renderFeeds();
    } else if (masterFeeds.length) {
      feedsData = JSON.parse(JSON.stringify(masterFeeds));
      renderFeeds();
    }

    // Populate Nuvio Cloud state for active profile
    if (p.nuvioCloud?.connected) {
      q('cloudAuthForm').style.display = 'none';
      q('cloudConnectedView').style.display = 'block';
      q('cloudUserEmail').textContent = p.nuvioCloud.email;
      q('cloudProfileName').textContent = p.nuvioCloud.profileName || p.name;
      q('cloudLastSync').textContent = p.nuvioCloud.lastSync ? new Date(p.nuvioCloud.lastSync).toLocaleString() : 'Never';
      q('cloudStatusText').textContent = 'Connected';
      q('nuvioCloudBadge').innerHTML = '<span class="dot good"></span> Nuvio Cloud: Connected';
    } else {
      q('cloudAuthForm').style.display = 'block';
      q('cloudConnectedView').style.display = 'none';
      q('cloudStatusText').textContent = 'Not connected';
      q('nuvioCloudBadge').innerHTML = '<span class="dot bad"></span> Nuvio Cloud: Not Connected';
    }

    checkProfileStatus(p.id);
  }

  async function checkProfileStatus(id) {
    try {
      q('activeProfileSessionDisplay').textContent = 'Checking…';
      const s = await api('/api/setup/profiles/' + encodeURIComponent(id) + '/status');
      q('activeProfileSessionDisplay').innerHTML = s.authenticated
        ? '<span style="color:var(--good)">🟢 Authenticated</span>'
        : '<span style="color:var(--bad)">🔴 Login Required</span>';
    } catch {
      q('activeProfileSessionDisplay').textContent = 'Unknown';
    }
  }

  q('profileSelect').onchange = (e) => {
    currentProfileId = e.target.value;
    updateActiveProfileView();
  };

  q('addProfileBtn').onclick = async () => {
    const name = prompt('Enter a name for the new profile (e.g. Kids Room, Bedroom, Partner):');
    if (!name || !name.trim()) return;
    try {
      const res = await api('/api/setup/profiles', { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
      currentProfileId = res.profile.id;
      await loadProfilesList();
      msg('profileActionMessage', 'Created profile "' + res.profile.name + '" with dedicated keys and browser session!', 'ok');
    } catch (e) {
      msg('profileActionMessage', e.message, 'error');
    }
  };

  q('deleteProfileBtn').onclick = async () => {
    if (!confirm('Are you sure you want to delete profile "' + q('activeProfileNameDisplay').textContent + '"?')) return;
    try {
      await api('/api/setup/profiles/' + encodeURIComponent(currentProfileId), { method: 'DELETE' });
      currentProfileId = 'default';
      await loadProfilesList();
      msg('profileActionMessage', 'Profile deleted.', 'ok');
    } catch (e) {
      msg('profileActionMessage', e.message, 'error');
    }
  };

  q('profileLoginBtn').onclick = async () => {
    try {
      q('profileLoginBtn').disabled = true;
      await api('/api/setup/profiles/' + encodeURIComponent(currentProfileId) + '/login', { method: 'POST' });
      msg('profileActionMessage', 'Dedicated login window opened for profile. Complete login there, then check session.', 'ok');
    } catch (e) {
      msg('profileActionMessage', e.message, 'error');
    } finally {
      q('profileLoginBtn').disabled = false;
    }
  };

  q('profileStatusBtn').onclick = async () => {
    await checkProfileStatus(currentProfileId);
  };

  async function loadAnalytics() {
    try {
      const a = await api('/api/setup/analytics');
      q('statAvgTime').textContent = (a.avgDurationMs || 0) + ' ms';
      q('statCacheRatio').textContent = (a.cacheStats?.hitRatio ?? 100) + '%';
      q('statTotalStreams').textContent = String(a.totalStreamsResolved || 0);
      q('statCacheEntries').textContent = String(a.cacheStats?.entries || 0);
      
      const list = q('activityList');
      if (Array.isArray(a.recentActivity) && a.recentActivity.length) {
        list.innerHTML = '';
        a.recentActivity.forEach(act => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-radius:6px;background:rgba(255,255,255,0.03);font-size:12px;gap:8px';
          const time = new Date(act.timestamp).toLocaleTimeString();
          const label = (act.mediaType === 'tv' ? 'TV S' + String(act.season).padStart(2,'0') + 'E' + String(act.episode).padStart(2,'0') : 'Movie') + ' (' + (act.tmdbId || '') + ')';
          const badgeColor = act.success ? 'good' : 'bad';
          row.innerHTML = '<div><span class="dot ' + badgeColor + '" style="margin-right:6px"></span><strong>' + label + '</strong> <span style="color:var(--muted);margin-left:6px">[' + (act.profileName || 'Default') + ']</span></div><div style="color:var(--muted)">' + act.durationMs + 'ms • ' + time + '</div>';
          list.appendChild(row);
        });
      }
    } catch {}
  }

  q('refreshAnalyticsBtn').onclick = loadAnalytics;

  async function checkHealth() {
    try {
      const h = await api('/api/setup/health');
      if (h.moviebox) {
        const isAuth = Boolean(h.moviebox.authenticated);
        q('movieboxText').textContent = isAuth ? 'Authenticated' : 'Login Required';
        q('mbpBadge').innerHTML = '<span class="dot ' + (isAuth ? 'good' : 'bad') + '"></span> MovieBoxPro: ' + (isAuth ? 'Connected' : 'Login Required');
        if (!isAuth && h.moviebox.lastChecked) {
          msg('loginMessage', 'Session expired or not logged in. Complete login to restore playback.', 'error');
        }
      }
      await loadAnalytics();
    } catch {}
  }

  async function checkVersionUpdate() {
    try {
      const v = await api('/api/setup/version-check');
      if (v.hasUpdate) {
        q('updateVersionTag').textContent = 'v' + v.latestVersion;
        if (v.releaseNotes) q('updateNotesPreview').textContent = v.releaseNotes.slice(0, 120) + '…';
        if (v.releaseUrl) q('updateReleaseLink').href = v.releaseUrl;
        q('updateBanner').style.display = 'block';
      }
    } catch {}
  }

  q('dismissUpdateBtn').onclick = () => {
    q('updateBanner').style.display = 'none';
  };

  // Register PWA Service Worker if supported
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  loadState()
    .then(loadProfilesList)
    .then(checkHealth)
    .then(checkVersionUpdate);
  setInterval(checkHealth, 30000);
})();
</script>
</body>
</html>`;
}
