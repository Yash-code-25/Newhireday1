/* Induction - Day 1: standalone interaction layer.
   Recreates the Wix behaviours (pop-ups, lightbox, slideshows, Pro Gallery
   item links, forms, video players, scroll-to-top) without Wix services. */
(function () {
  'use strict';
  var SITE = window.WIX_SITE || {}, POP = window.WIX_POPUPS || {}, X = SITE.extra || {};
  var PAGE = window.WIX_PAGE;
  var pages = SITE.pages || {};
  var currentPopup = null;

  function fileFor(pid) { return pages[pid] ? pages[pid].file : 'index.html'; }
  function mediaUrl(uri) {
    var name = uri.split('/').pop();
    return 'https://static.wixstatic.com/media/' + uri + '/v1/fit/w_1600,h_1200,q_90/' + name;
  }
  function uriFromSrc(src) { var m = (src || '').match(/static\.wixstatic\.com\/media\/([^/]+)/); return m ? m[1] : null; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------------- navigation targets ---------------- */
  function goTarget(t) {
    if (!t) return;
    if (t.popup) { openPopup(t.popup); return; }
    if (t.page) { location.href = fileFor(t.page); return; }
    if (t.url) { if (t.target === '_self') location.href = t.url; else window.open(t.url, '_blank', 'noopener'); }
  }

  /* ---------------- pop-ups (Wix lightboxes) ---------------- */
  function popupRoot() {
    var r = document.getElementById('POPUPS_ROOT');
    if (!r) {
      r = document.createElement('div');
      r.id = 'POPUPS_ROOT';
      r.className = 'theme-vars POPUPS_ROOT TpENBi';
      (document.getElementById('main_MF') || document.getElementById('SITE_CONTAINER') || document.body).appendChild(r);
    }
    return r;
  }
  // pushed = this pop-up added its own history entry (so closing it = going Back one step)
  var pushed = false;
  var basePath = function () { return location.pathname + location.search; };
  function openPopup(id, how) {
    var p = POP[id];
    if (!p) { console.warn('popup not found', id); return; }
    var wasOpen = !!currentPopup;
    closePopup(true);
    var root = popupRoot();
    root.innerHTML = p.html;
    currentPopup = id;
    document.documentElement.classList.add('wx-popup-open');
    initScope(root, id);
    var focus = $('[data-focus-on-popup-open] [role=button]', root) || $('[role=dialog]', root);
    if (focus && focus.focus) try { focus.focus({ preventScroll: true }); } catch (e) {}
    try {
      if (how === 'hash') { pushed = false; }
      else if (how === 'history') { pushed = true; }
      else if (wasOpen) { history.replaceState({ popup: id }, '', basePath() + '#popup-' + id); }
      else { history.pushState({ popup: id }, '', basePath() + '#popup-' + id); pushed = true; }
    } catch (e) {}
  }
  function closePopup(silent) {
    var root = document.getElementById('POPUPS_ROOT');
    if (!root || !currentPopup) return;
    $$('video', root).forEach(function (v) { try { v.pause(); } catch (e) {} });
    root.innerHTML = '';
    currentPopup = null;
    document.documentElement.classList.remove('wx-popup-open');
    if (!silent) {
      try {
        if (pushed) history.back();
        else if (/#popup-/.test(location.hash)) history.replaceState(null, '', basePath());
      } catch (e) {}
      pushed = false;
    }
  }
  window.addEventListener('popstate', function () {
    var id = (location.hash.match(/^#popup-([a-z0-9]+)/) || [])[1];
    if (id && POP[id]) { if (currentPopup !== id) openPopup(id, 'history'); }
    else if (currentPopup) { closePopup(true); pushed = false; }
  });

  /* ---------------- lightbox for gallery images ---------------- */
  var lb = null, lbItems = [], lbIdx = 0;
  function buildLightbox() {
    lb = document.createElement('div');
    lb.className = 'wx-lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.innerHTML =
      '<button class="wx-lb-close" aria-label="Close">&times;</button>' +
      '<button class="wx-lb-prev" aria-label="Previous">&#10094;</button>' +
      '<figure class="wx-lb-fig"><img alt=""><figcaption></figcaption></figure>' +
      '<button class="wx-lb-next" aria-label="Next">&#10095;</button>' +
      '<div class="wx-lb-count"></div>';
    document.body.appendChild(lb);
    lb.addEventListener('click', function (e) {
      if (e.target.closest('.wx-lb-close') || e.target === lb) closeLightbox();
      else if (e.target.closest('.wx-lb-prev')) showLb(lbIdx - 1);
      else if (e.target.closest('.wx-lb-next')) showLb(lbIdx + 1);
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 40) showLb(lbIdx + (dx < 0 ? 1 : -1));
    });
  }
  function openLightbox(items, idx) {
    if (!lb) buildLightbox();
    lbItems = items; lb.classList.add('open');
    document.documentElement.classList.add('wx-lb-open');
    showLb(idx);
  }
  function showLb(i) {
    if (!lbItems.length) return;
    lbIdx = (i + lbItems.length) % lbItems.length;
    var it = lbItems[lbIdx];
    var img = $('img', lb); img.style.visibility = ''; img.src = it.src; img.alt = it.title || '';
    $('figcaption', lb).textContent = it.title || '';
    $('.wx-lb-count', lb).textContent = (lbIdx + 1) + ' / ' + lbItems.length;
    var multi = lbItems.length > 1;
    $('.wx-lb-prev', lb).style.display = multi ? '' : 'none';
    $('.wx-lb-next', lb).style.display = multi ? '' : 'none';
  }
  function closeLightbox() { if (lb) lb.classList.remove('open'); document.documentElement.classList.remove('wx-lb-open'); }

  function imageInfo(el) {
    var w = el.querySelector('wow-image[data-image-info]');
    var title = el.getAttribute('aria-label') || '';
    if (w) {
      try { var info = JSON.parse(w.getAttribute('data-image-info')); return { src: mediaUrl(info.imageData.uri), title: title }; } catch (e) {}
    }
    var img = el.querySelector('img');
    var u = img && uriFromSrc(img.src);
    return { src: u ? mediaUrl(u) : (img ? img.src : ''), title: title };
  }

  /* ---------------- slideshows ---------------- */
  function initSlideshows(scope) {
    $$('.wixui-slideshow', scope).forEach(function (ss) {
      var slides = (X.slides || {})[ss.id];
      if (!slides || slides.length < 2 || ss._wx) return;
      ss._wx = { i: 0 };
      var wrap = $('[data-testid=slidesWrapper]', ss);
      var ids = slides.map(function (h) { return (h.match(/^<div id="([^"]+)"/) || [])[1]; });
      var cur = wrap.firstElementChild && wrap.firstElementChild.id;
      ss._wx.i = Math.max(0, ids.indexOf(cur));
      ss._wx.ids = ids;
      var dots = $$('nav ol > li > a', ss);
      var selA = dots.filter(function (a) { return a.parentElement.getAttribute('aria-current') === 'true'; })[0];
      var other = dots.filter(function (a) { return a !== selA; })[0];
      var selCls = selA && other ? Array.prototype.filter.call(selA.classList, function (c) { return !other.classList.contains(c); }) : [];
      var show = function (i) {
        ss._wx.i = (i + slides.length) % slides.length;
        dots.forEach(function (a) {
          var on = (a.getAttribute('href') || '').replace(/^.*#/, '') === ids[ss._wx.i];
          if (on) a.parentElement.setAttribute('aria-current', 'true'); else a.parentElement.removeAttribute('aria-current');
          selCls.forEach(function (c) { a.classList.toggle(c, on); });
        });
        wrap.innerHTML = slides[ss._wx.i];
        wrap.firstElementChild && wrap.firstElementChild.classList.add('wx-slide-in');
        initScope(wrap, currentPopup || PAGE, true);
      };
      var auto = (X.slideAuto || {})[ss.id];
      var restart = function () {
        if (!auto) return;
        clearInterval(ss._wx.timer);
        ss._wx.timer = setInterval(function () { if (!ss.matches(':hover')) show(ss._wx.i + 1); }, auto);
      };
      // a manual change (arrow, dot, swipe) restarts the autoplay timer, as on Wix
      ss._wx.show = function (i) { show(i); restart(); };
      restart();
      var sx = null;
      ss.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      ss.addEventListener('touchend', function (e) {
        if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
        if (Math.abs(dx) > 40) ss._wx.show(ss._wx.i + (dx < 0 ? 1 : -1));
      });
    });
  }

  /* ---------------- video players ---------------- */
  function playVideo(el, auto) {
    var host = el.closest('[id^="comp-"]');
    while (host && !(X.videos || {})[host.id]) host = host.parentElement && host.parentElement.closest('[id^="comp-"]');
    if (!host) return false;
    if ($('video.wx-video', host)) return true;
    var v = X.videos[host.id];
    var box = $('[data-testid=playable]', host) || el;
    var r = box.getBoundingClientRect();
    var video = document.createElement('video');
    video.src = v.src; video.controls = true; video.autoplay = true; video.playsInline = true;
    video.loop = !!v.loop; if (auto) video.muted = true;
    if (v.poster) video.poster = v.poster;
    video.className = 'wx-video';
    video.style.width = (r.width || host.offsetWidth) + 'px';
    video.style.height = (r.height || host.offsetHeight) + 'px';
    box.innerHTML = ''; box.appendChild(video);
    return true;
  }

  /* ---------------- forms ---------------- */
  function initForms(scope) {
    $$('form', scope).forEach(function (f) {
      if (f._wx) return; f._wx = true;
      if (f.closest('[data-hook^="MyAccount"]')) {
        f.addEventListener('submit', function (e) { e.preventDefault(); backendNotice('My Account'); });
        return;
      }
      f.setAttribute('novalidate', '');
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        handleSubmit(f);
      });
      $$('button', f).forEach(function (b) { if (!b.getAttribute('type')) b.setAttribute('type', 'submit'); });
    });
  }
  function handleSubmit(f) {
    var ok = true, data = {};
    $$('input, textarea, select', f).forEach(function (inp) {
      var wrap = inp.closest('[id^="comp-"]');
      var bad = false;
      if (inp.type === 'checkbox') {
        data[inp.name || (wrap && wrap.id) || 'checkbox'] = inp.checked;
        if (inp.required && !inp.checked) bad = true;
      } else if (inp.type === 'radio') {
        if (inp.checked) data[inp.name || 'radio'] = inp.value;
        var grp = inp.closest('[role=radiogroup]');
        if (inp.required && grp && !$('input:checked', grp)) bad = true;
      } else {
        data[inp.name || inp.getAttribute('aria-label') || (wrap && wrap.id) || 'field'] = inp.value;
        if (inp.required && !inp.value.trim()) bad = true;
        if (!bad && inp.type === 'email' && inp.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inp.value)) bad = true;
      }
      if (wrap) wrap.classList.toggle('wx-invalid', bad);
      if (bad) ok = false;
    });
    var msg = $('.wx-form-msg', f);
    if (!msg) { msg = document.createElement('div'); msg.className = 'wx-form-msg'; msg.setAttribute('role', 'status'); f.appendChild(msg); }
    if (!ok) { msg.textContent = 'Please fill in all required fields.'; msg.className = 'wx-form-msg err'; return; }
    try {
      var key = 'induction-day1-form-' + (f.closest('[id^="comp-"]') || {}).id;
      var all = JSON.parse(localStorage.getItem(key) || '[]'); all.push({ at: new Date().toISOString(), page: PAGE, data: data });
      localStorage.setItem(key, JSON.stringify(all));
    } catch (e) {}
    var cfg = (X.forms || {})[f.id] || null, host = f;
    while (host && !cfg) { host = host.parentElement && host.parentElement.closest('[id^="comp-"]'); if (host) cfg = (X.forms || {})[host.id]; }
    if (!cfg) cfg = (X.forms || {})[PAGE];
    if (cfg && (cfg.page || cfg.popup || cfg.url)) { goTarget(cfg); return; }
    msg.className = 'wx-form-msg ok';
    msg.textContent = (cfg && cfg.message) || 'Thanks for submitting! (Saved in this browser only - this offline copy has no Wix form inbox.)';
    f.reset && f.reset();
  }

  /* ---------------- members / Wix-backend features ---------------- */
  function backendNotice(what) {
    var n = document.createElement('div');
    n.className = 'wx-toast';
    n.textContent = what + ' needs Wix Members (a Wix server feature), which is not part of this standalone copy.';
    document.body.appendChild(n);
    setTimeout(function () { n.classList.add('show'); }, 10);
    setTimeout(function () { n.classList.remove('show'); setTimeout(function () { n.remove(); }, 400); }, 4200);
  }

  /* ---------------- scope init (page or popup) ---------------- */
  function initScope(scope) {
    initSlideshows(scope);
    initForms(scope);
    Object.keys(X.videos || {}).forEach(function (id) {
      var el = scope.querySelector ? scope.querySelector('[id="' + id + '"]') : null;
      if (el && X.videos[id].autoplay) setTimeout(function () { playVideo(el.querySelector('[data-testid=playable]') || el, true); }, 300);
    });
    $$('a[href=""], a:not([href])', scope).forEach(function (a) {
      if (!a.hasAttribute('data-popupid') && !a.closest('[data-hook=item-link-wrapper]')) a.setAttribute('role', a.getAttribute('role') || 'button');
    });
  }

  /* ---------------- one delegated click handler ---------------- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;

    // pop-up close button / overlay
    if (currentPopup && t.closest('#POPUPS_ROOT')) {
      if (t.closest('[data-testid=popupCloseIconButtonRoot]')) { e.preventDefault(); closePopup(); return; }
      if (!t.closest('.wixui-lightbox')) { closePopup(); return; }
    }

    // links that open a pop-up
    var pp = t.closest('[data-popupid]');
    if (pp) { e.preventDefault(); openPopup(pp.getAttribute('data-popupid')); return; }

    // gallery image zoom -> lightbox
    var z = t.closest('[data-testid=gallery-item-click-action-image-zoom]');
    if (z) {
      e.preventDefault();
      var cont = z.closest('[data-testid=paginated-grid-gallery-items-container]') || z.parentElement;
      var all = $$('[data-testid=gallery-item-click-action-image-zoom]', cont);
      openLightbox(all.map(imageInfo), all.indexOf(z));
      return;
    }

    // Pro Gallery items
    var pg = t.closest('[data-hook=item-container]');
    if (pg) {
      e.preventDefault();
      var owner = currentPopup && pg.closest('#POPUPS_ROOT') ? currentPopup : PAGE;
      var idx = +pg.getAttribute('data-idx');
      var list = (X.pg || {})[owner] || [];
      var act = list[idx];
      if (act && (act.page || act.popup || act.url)) { goTarget(act); return; }
      var gal = pg.closest('[data-hook=gallery-column], .pro-gallery, [data-hook=tpa-components-provider]') || document;
      var items = $$('[data-hook=item-container]', gal).map(function (c) {
        var im = $('img', c), u = im && uriFromSrc(im.src); return { src: u ? mediaUrl(u) : (im ? im.src : ''), title: ($('[data-hook=item-title]', c.parentElement) || {}).textContent || '' };
      });
      openLightbox(items, idx);
      return;
    }

    // slideshow dots
    var dot = t.closest('.wixui-slideshow nav a[href*="#comp-"]');
    if (dot) {
      e.preventDefault();
      var sd = dot.closest('.wixui-slideshow');
      if (sd && sd._wx) { var k = sd._wx.ids.indexOf(dot.getAttribute('href').replace(/^.*#/, '')); if (k >= 0) sd._wx.show(k); }
      return;
    }

    // slideshow arrows
    var nav = t.closest('[data-testid=prevButton], [data-testid=nextButton]');
    if (nav) {
      var ss = nav.closest('.wixui-slideshow');
      if (ss && ss._wx) { e.preventDefault(); ss._wx.show(ss._wx.i + (nav.getAttribute('data-testid') === 'nextButton' ? 1 : -1)); return; }
    }

    // video players
    var play = t.closest('[data-testid=playable], .wixui-video-player, [data-hook=play-button]');
    if (play && playVideo(play)) { e.preventDefault(); return; }

    // scroll to top
    if (t.closest('#SCROLL_TO_TOP')) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    // members-only features
    if (t.closest('.wixui-social-auth, [data-testid=googlenew-small], [data-testid=fbnew-small]')) { e.preventDefault(); backendNotice('Social sign-in'); return; }
    if (t.closest('[data-hook^="MyAccount"] button, [data-hook^="ProfileCard"] button, [data-hook^="MyAccount"] [role=button], [data-hook^="ProfileCard"] [role=button], [data-hook=accordion-item-header]')) { e.preventDefault(); backendNotice('My Account'); return; }

    // component-level links that have no anchor in the DOM
    var host = t.closest('[id^="comp-"]');
    while (host) {
      var L = (X.compLinks || {})[host.id];
      if (L) { e.preventDefault(); goTarget(L); return; }
      host = host.parentElement && host.parentElement.closest('[id^="comp-"]');
    }
  }, true);

  document.addEventListener('keydown', function (e) {
    if (lb && lb.classList.contains('open')) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') showLb(lbIdx - 1);
      else if (e.key === 'ArrowRight') showLb(lbIdx + 1);
      return;
    }
    if (e.key === 'Escape' && currentPopup) closePopup();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role=button]:not(button):not(a[href])')) { e.preventDefault(); e.target.click(); }
  });

  /* scroll-to-top button visibility, like Wix */
  var stt = document.getElementById('SCROLL_TO_TOP');
  function onScroll() { if (stt) stt.classList.toggle('wx-visible', window.scrollY > 300); }
  window.addEventListener('scroll', onScroll, { passive: true });

  // media deleted from the Wix library shows as nothing (not a broken-image icon)
  document.addEventListener('error', function (e) { if (e.target && e.target.tagName === 'IMG') e.target.style.visibility = 'hidden'; }, true);
  $$('img').forEach(function (i) { if (i.complete && i.naturalWidth === 0 && i.src) i.style.visibility = 'hidden'; });

  initScope(document);
  onScroll();
  if (PAGE === 'q21z7') setTimeout(function () { backendNotice('My Account'); }, 600);

  // open popup from URL hash (#popup-xxxx), or the page's auto-open popup
  var hp = (location.hash.match(/^#popup-([a-z0-9]+)/) || [])[1];
  if (hp && POP[hp]) openPopup(hp, 'hash');
  else if ((X.autoPopup || {})[PAGE]) setTimeout(function () { openPopup(X.autoPopup[PAGE]); }, (X.autoDelay || {})[PAGE] || 0);

  window.WIX_STANDALONE = { openPopup: openPopup, closePopup: closePopup, openLightbox: openLightbox };
})();
