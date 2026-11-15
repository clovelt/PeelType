// Atmosphere panel orchestration.
// Evaluated inside the main.js scope (like editor.js), so it can reach
// scenePresets, state.loadScene, pieceConfig, showToast, parseBBCode, state.renderSceneThumbnail,
// and the bluesky/feed-generator bindings imported by main.js.

(function initAtmosphere() {
  const btn = document.getElementById('atmosphereBtn');
  const panel = document.getElementById('atmospherePanel');
  const closeBtn = document.getElementById('atmosphereClose');
  if (!btn || !panel || !closeBtn) return;

  const loginEl = document.getElementById('atmosphereLogin');
  const connectedEl = document.getElementById('atmosphereConnected');
  const handleInput = document.getElementById('atmosphereHandle');
  const passwordInput = document.getElementById('atmospherePassword');
  const loginBtn = document.getElementById('atmosphereLoginBtn');
  const statusEl = document.getElementById('atmosphereStatus');
  const limitInput = document.getElementById('atmosphereLimit');
  const loadBtn = document.getElementById('atmosphereLoadBtn');
  const publishBtn = document.getElementById('atmospherePublishBtn');
  const remoteToggleBtn = document.getElementById('atmosphereRemoteToggleBtn');
  const remoteForm = document.getElementById('atmosphereRemoteForm');
  const remoteInput = document.getElementById('atmosphereRemoteUri');
  const loadRemoteBtn = document.getElementById('atmosphereLoadRemoteBtn');
  const remoteCancelBtn = document.getElementById('atmosphereRemoteCancelBtn');
  const logoutBtn = document.getElementById('atmosphereLogoutBtn');

  const FEED_SCENE_KEY = 'bluesky-feed';
  const FEED_STORE_KEY = 'tirita.bskyFeed';

  function open() {
    refresh();
    panel.removeAttribute('hidden');
    positionPanel();
  }
  function close() {
    closeRemoteForm();
    panel.setAttribute('hidden', '');
  }
  state.openAtmosphere = open;
  state.closeAtmosphere = close;

  function positionPanel() {
    if (panel.hasAttribute('hidden')) return;
    const buttonRect = btn.getBoundingClientRect();
    const panelWidth = panel.offsetWidth;
    const viewportInset = 12;
    const idealLeft = buttonRect.left + (buttonRect.width - panelWidth) / 2;
    const maxLeft = Math.max(viewportInset, window.innerWidth - panelWidth - viewportInset);
    const left = Math.min(Math.max(viewportInset, idealLeft), maxLeft);
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(buttonRect.bottom + 8)}px`;
  }

  function refresh() {
    const session = loadSession();
    loginEl.hidden = Boolean(session);
    connectedEl.hidden = !session;
    btn.classList.toggle('connected', Boolean(session));
    if (session) statusEl.textContent = `Connected as @${session.handle}`;
    else closeRemoteForm();
  }

  function openRemoteForm() {
    remoteForm.removeAttribute('hidden');
    remoteToggleBtn.setAttribute('hidden', '');
    remoteToggleBtn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => remoteInput.focus());
  }

  function closeRemoteForm() {
    remoteForm.setAttribute('hidden', '');
    remoteToggleBtn.removeAttribute('hidden');
    remoteToggleBtn.setAttribute('aria-expanded', 'false');
  }

  function playUrlFor(atUri) {
    return `${location.origin}${location.pathname}?scene=${encodeURIComponent(atUri)}`;
  }

  function currentConfig() {
    if (typeof editorInitialized !== 'undefined' && editorInitialized && typeof buildConfigFromVisualControls === 'function') {
      try { return buildConfigFromVisualControls(); } catch {}
    }
    return pieceConfig;
  }

  function requireSession() {
    const session = loadSession();
    if (!session) { showToast('Connect your account first.'); refresh(); return null; }
    return session;
  }

  function plainText(bc) {
    try { return parseBBCode(String(bc || '')).plainText; } catch { return String(bc || ''); }
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  loginBtn.addEventListener('click', async () => {
    const handle = handleInput.value.trim();
    const password = passwordInput.value.trim();
    if (!handle || !password) { showToast('Enter a handle and app password.'); return; }
    loginBtn.disabled = true;
    loginBtn.textContent = 'Connecting…';
    try {
      const session = await createSession(handle, password);
      passwordInput.value = '';
      refresh();
      showToast(`Connected as @${session.handle}.`);
    } catch (e) {
      showToast(`Login failed: ${e.message}`);
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Connect account';
    }
  });

  // ── Load my posts → generate scene ─────────────────────────────────────────
  loadBtn.addEventListener('click', async () => {
    const session = requireSession();
    if (!session) return;
    const limit = Math.max(1, Math.min(100, Number(limitInput.value) || 20));
    loadBtn.disabled = true;
    loadBtn.textContent = 'Loading…';
    try {
      const res = await fetchAuthorFeed(session.did, session.accessJwt, { limit });
      const posts = (res?.feed || []).map(entry => {
        const record = entry?.post?.record || {};
        return {
          text: facetsToBbcode(record.text || '', record.facets),
          likes: Number(entry?.post?.likeCount || 0),
          reposts: Number(entry?.post?.repostCount || 0),
          createdAt: record.createdAt
        };
      }).filter(p => p.text && p.text.trim());
      if (!posts.length) { showToast('No posts with text.'); return; }

      const label = `@${session.handle} — feed`;
      const config = buildFeedScene(posts, { title: label });
      scenePresets[FEED_SCENE_KEY] = { label, config };
      localStorage.setItem(FEED_STORE_KEY, JSON.stringify({ label, config }));

      showToast(`Generated scene from ${posts.length} posts.`);
      close();
      state.loadScene(FEED_SCENE_KEY, { fresh: true });
    } catch (e) {
      showToast(`Couldn't load feed: ${e.message}`);
    } finally {
      loadBtn.disabled = false;
      loadBtn.textContent = 'Load my posts';
    }
  });

  // ── Publish current scene → record + post with card ────────────────────────
  publishBtn.addEventListener('click', async () => {
    const session = requireSession();
    if (!session) return;
    const config = currentConfig();
    if (!config) { showToast('No scene to publish.'); return; }

    publishBtn.disabled = true;
    publishBtn.textContent = 'Publishing…';
    try {
      const title = config.title || 'Untitled PeelType piece';
      const description = plainText(config.blocks?.[0]?.text || '').slice(0, 160);

      // Thumbnail for the card (canvas render of the scene).
      let thumb = null;
      try {
        if (typeof state.renderSceneThumbnail === 'function') {
          const canvas = state.renderSceneThumbnail(config, 640, 480);
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
          if (blob) thumb = (await uploadBlob(blob, 'image/jpeg', session.accessJwt)).blob;
        }
      } catch {}

      // 1) Store the scene as a com.peeltype.scene record.
      const published = await publishScene(session.accessJwt, {
        did: session.did,
        config,
        title,
        description
      });

      // 2) Post a teaser with an external-link card pointing at the playable URL.
      const url = playUrlFor(published.uri);
      const teaser = `${description}\n\n→ péllala aquí`;
      await createPost(session.accessJwt, {
        did: session.did,
        text: teaser,
        url,
        title,
        description,
        thumb
      });

      showToast(`Published: ${published.uri}`);
      remoteInput.value = published.uri;
    } catch (e) {
      showToast(`Publish failed: ${e.message}`);
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = 'Publish current scene';
    }
  });

  // ── Load a published scene from an at-uri ──────────────────────────────────
  async function loadRemoteScene(atUri) {
    const record = await getRecord(atUri);
    const config = record?.value?.config;
    if (!config || !Array.isArray(config.blocks)) throw new Error('The remote scene has no valid config.');
    const label = record.value.title || 'Published scene';
    scenePresets[FEED_SCENE_KEY] = { label, config };
    localStorage.setItem(FEED_STORE_KEY, JSON.stringify({ label, config }));
    close();
    showToast(`Loading "${label}"…`);
    state.loadScene(FEED_SCENE_KEY, { fresh: true });
  }

  loadRemoteBtn.addEventListener('click', async () => {
    const atUri = remoteInput.value.trim();
    if (!atUri.startsWith('at://')) { showToast('Paste a valid at:// URI.'); return; }
    loadRemoteBtn.disabled = true;
    loadRemoteBtn.textContent = 'Opening…';
    try {
      await loadRemoteScene(atUri);
    } catch (e) {
      showToast(`Couldn't load: ${e.message}`);
    } finally {
      loadRemoteBtn.disabled = false;
      loadRemoteBtn.textContent = 'Open scene';
    }
  });
  remoteToggleBtn.addEventListener('click', openRemoteForm);
  remoteCancelBtn.addEventListener('click', closeRemoteForm);
  remoteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadRemoteBtn.click();
    else if (e.key === 'Escape') {
      e.stopPropagation();
      closeRemoteForm();
      remoteToggleBtn.focus();
    }
  });

  // ── Logout ─────────────────────────────────────────────────────────────────
  logoutBtn.addEventListener('click', async () => {
    const session = loadSession();
    if (session?.refreshJwt) await deleteSession(session.refreshJwt).catch(() => {});
    else saveSession(null);
    refresh();
    showToast('Disconnected.');
  });

  // ── Open/close ─────────────────────────────────────────────────────────────
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panel.hasAttribute('hidden')) open(); else close();
  });
  closeBtn.addEventListener('click', close);
  window.addEventListener('resize', positionPanel);
  document.addEventListener('click', (e) => {
    if (!panel.hasAttribute('hidden') && !panel.contains(e.target) && e.target !== btn) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hasAttribute('hidden')) close();
  });

  // Keyboard: Enter in password field → login.
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });

  // Prefill handle from a stored session.
  const stored = loadSession();
  if (stored?.handle) handleInput.value = stored.handle;
})();
