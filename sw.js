const CACHE_NAME = 'prokaiwa-teacher-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  '/assets/images/favicon.ico',
      badge: '/assets/images/favicon.ico',
      data:  data.data || {},
      requireInteraction: true
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const url = e.notification.data?.url || '/teacher-portal.html';
      for (const client of list) {
        if (client.url.includes('teacher-portal') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
