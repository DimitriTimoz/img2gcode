/**
 * Service Worker for img2gcode Application
 * Provides offline functionality and caching for better performance
 */

const CACHE_NAME = 'img2gcode-v2.0.0';
const STATIC_CACHE_NAME = 'img2gcode-static-v2.0.0';
const DYNAMIC_CACHE_NAME = 'img2gcode-dynamic-v2.0.0';

// Static assets to cache
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/js/config.js',
    '/js/main.js',
    '/js/canvas.js',
    '/js/event-handlers.js',
    '/js/object-management.js',
    '/js/project-management.js',
    '/js/zoom-pan.js',
    '/js/export.js',
    '/js/font-management.js',
    '/js/image-processing.js',
    '/js/debug-utils.js',
    '/textEditor.js',
    // Add Fabric.js CDN
    'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js'
];

// Dynamic cache patterns
const CACHE_STRATEGIES = {
    // Cache first for static assets
    static: [
        /\.(css|js|html)$/,
        /\/js\//,
        /\/fonts\//,
        /\/images\//
    ],
    // Network first for API calls and dynamic content
    networkFirst: [
        /\/api\//,
        /\.json$/
    ],
    // Stale while revalidate for fonts and images
    staleWhileRevalidate: [
        /\.(woff|woff2|ttf|eot)$/,
        /\.(jpg|jpeg|png|gif|svg|webp)$/
    ]
};

/**
 * Install event - Cache static assets
 */
self.addEventListener('install', event => {
    console.log('ServiceWorker installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(STATIC_CACHE_NAME).then(cache => {
                console.log('Caching static assets...');
                return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http')));
            }),
            // Cache external resources
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                console.log('Caching external resources...');
                const externalAssets = STATIC_ASSETS.filter(url => url.startsWith('http'));
                return Promise.allSettled(
                    externalAssets.map(url => 
                        cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err))
                    )
                );
            })
        ]).then(() => {
            console.log('ServiceWorker installation completed');
            // Force activation of new service worker
            return self.skipWaiting();
        })
    );
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', event => {
    console.log('ServiceWorker activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Delete old versions of caches
                    if (cacheName !== STATIC_CACHE_NAME && 
                        cacheName !== DYNAMIC_CACHE_NAME &&
                        cacheName.startsWith('img2gcode-')) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('ServiceWorker activated');
            // Take control of all pages immediately
            return self.clients.claim();
        })
    );
});

/**
 * Fetch event - Handle network requests with caching strategies
 */
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http protocols
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Determine caching strategy based on URL pattern
    const strategy = getCachingStrategy(request.url);
    
    event.respondWith(
        handleRequest(request, strategy)
    );
});

/**
 * Determine caching strategy for a given URL
 */
function getCachingStrategy(url) {
    // Check static assets
    if (CACHE_STRATEGIES.static.some(pattern => pattern.test(url))) {
        return 'cacheFirst';
    }
    
    // Check network first patterns
    if (CACHE_STRATEGIES.networkFirst.some(pattern => pattern.test(url))) {
        return 'networkFirst';
    }
    
    // Check stale while revalidate patterns
    if (CACHE_STRATEGIES.staleWhileRevalidate.some(pattern => pattern.test(url))) {
        return 'staleWhileRevalidate';
    }
    
    // Default to network first
    return 'networkFirst';
}

/**
 * Handle request based on caching strategy
 */
async function handleRequest(request, strategy) {
    switch (strategy) {
        case 'cacheFirst':
            return cacheFirst(request);
        case 'networkFirst':
            return networkFirst(request);
        case 'staleWhileRevalidate':
            return staleWhileRevalidate(request);
        default:
            return fetch(request);
    }
}

/**
 * Cache first strategy - Check cache first, fallback to network
 */
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.warn('Cache first strategy failed:', error);
        // Return a fallback response if available
        return getFallbackResponse(request);
    }
}

/**
 * Network first strategy - Try network first, fallback to cache
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.warn('Network first strategy fallback to cache:', error);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return getFallbackResponse(request);
    }
}

/**
 * Stale while revalidate strategy - Return cache immediately, update in background
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await caches.match(request);
    
    // Update cache in background
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(error => {
        console.warn('Background fetch failed:', error);
    });
    
    // Return cached response immediately if available, otherwise wait for network
    return cachedResponse || fetchPromise;
}

/**
 * Get fallback response for failed requests
 */
function getFallbackResponse(request) {
    const url = new URL(request.url);
    
    // Fallback for HTML pages
    if (request.destination === 'document') {
        return caches.match('/index.html');
    }
    
    // Fallback for images
    if (request.destination === 'image') {
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">' +
            '<rect width="200" height="200" fill="#f0f0f0"/>' +
            '<text x="100" y="100" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#666">' +
            'Image not available' +
            '</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
        );
    }
    
    // Generic fallback
    return new Response('Content not available offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
    });
}

/**
 * Handle background sync for saving projects
 */
self.addEventListener('sync', event => {
    if (event.tag === 'save-project') {
        event.waitUntil(
            handleProjectSave()
        );
    }
});

/**
 * Handle project save in background
 */
async function handleProjectSave() {
    try {
        // Get pending saves from IndexedDB or local storage
        const pendingSaves = await getPendingProjectSaves();
        
        for (const save of pendingSaves) {
            try {
                // Attempt to save project
                await saveProjectToServer(save);
                // Remove from pending saves
                await removePendingProjectSave(save.id);
            } catch (error) {
                console.warn('Background project save failed:', error);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Placeholder functions for project save sync
async function getPendingProjectSaves() {
    // Implementation would depend on storage mechanism
    return [];
}

async function saveProjectToServer(saveData) {
    // Implementation for server save
    console.log('Saving project in background:', saveData);
}

async function removePendingProjectSave(saveId) {
    // Implementation to remove from pending saves
    console.log('Removing pending save:', saveId);
}

/**
 * Handle push notifications (if implemented)
 */
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            data: data.data
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});

console.log('ServiceWorker script loaded');
