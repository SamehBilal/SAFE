/* Service worker: installs the site as an app and keeps it working offline.
   - App shell + encrypted content: precached, refreshed in the background.
   - content/m/*.bin (encrypted photos): cached forever once seen — names change when files do.
   - Google Fonts: cached once seen.
   VERSION is rewritten by tools/build.mjs on every build. */
'use strict';

var VERSION = 'us-df445f2a83';
var SHELL = [
	'./',
	'index.html',
	'manifest.webmanifest',
	'assets/css/app.css',
	'assets/js/app.js',
	'assets/js/core.js',
	'assets/icons/icon.svg',
	'assets/icons/icon-192.png',
	'assets/icons/icon-512.png',
	'assets/icons/apple-touch-icon.png',
	'content/gate.json',
	'content/vault.json'
];
var SHELL_CACHE = 'shell-' + VERSION;
var MEDIA_CACHE = 'media-v1';
var FONT_CACHE = 'fonts-v1';

self.addEventListener('install', function (e) {
	e.waitUntil(caches.open(SHELL_CACHE).then(function (c) {
		return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); }));
	}).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
	e.waitUntil(caches.keys().then(function (keys) {
		return Promise.all(keys.filter(function (k) {
			return k.indexOf('shell-') === 0 && k !== SHELL_CACHE;
		}).map(function (k) { return caches.delete(k); }));
	}).then(function () { return self.clients.claim(); }));
});

function cacheFirst(req, name) {
	return caches.open(name).then(function (c) {
		return c.match(req).then(function (hit) {
			return hit || fetch(req).then(function (res) {
				if (res.ok || res.type === 'opaque') c.put(req, res.clone());
				return res;
			});
		});
	});
}

// Network first (fresh content after a rebuild), cache when offline or slow.
function networkFirst(req, key) {
	return caches.open(SHELL_CACHE).then(function (c) {
		var net = fetch(req).then(function (res) {
			if (res.ok) c.put(key || req, res.clone());
			return res;
		});
		var timeout = new Promise(function (resolve) { setTimeout(resolve, 3500); });
		return Promise.race([net, timeout.then(function () { return c.match(key || req, { ignoreSearch: true }); })])
			.then(function (r) { return r || net; })
			.catch(function () { return c.match(key || req, { ignoreSearch: true }); })
			.then(function (r) { return r || c.match('index.html'); });
	});
}

self.addEventListener('fetch', function (e) {
	var req = e.request;
	if (req.method !== 'GET') return;
	var url = new URL(req.url);

	if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
		e.respondWith(cacheFirst(req, FONT_CACHE));
		return;
	}
	if (url.origin !== location.origin) return;

	if (url.pathname.indexOf('/content/m/') !== -1) {
		e.respondWith(cacheFirst(req, MEDIA_CACHE));
		return;
	}
	if (req.mode === 'navigate') {
		e.respondWith(networkFirst(req, 'index.html'));
		return;
	}
	e.respondWith(networkFirst(req));
});
