importScripts('idb.js');

var cacheName = 'v1';
var contentImgsCache = 'screenshots';

var cacheFiles = [
    'index.html',
    'styles.css',
    'app.js',
    'idb.js'
];

//Ran when SW is installed. Creates Cache
self.addEventListener('install', function (event) {
    console.log("[ServiceWorker] Installed");
    event.waitUntil(

        caches.open(cacheName).then(function (cache) {
            return cache.addAll(cacheFiles);
        }).then(
            caches.open(contentImgsCache).then(function (cache) {
                return cache.addAll(cacheImages);
            })
        )
    );
});

//Service Worker Activate
self.addEventListener('activate', function(event) {
    console.log("[ServiceWorker] Activating");
    createIndexedDB();
    fetchRestaurantsJSON();
    fetchReviewsJSON();
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(cacheValue) {
                    if(cacheValue !== cacheName && cacheValue !== contentImgsCache ) return true;
                }).map(function(cacheValue) {
                    return caches.delete(cacheValue);
                })
            );
        })
    );
});

self.addEventListener('sync', function(event) {
    if (event.tag == 'syncReview') {
        event.waitUntil(
            console.log(event)
        );
    } else if (event.tag == 'syncFav') {
        event.waitUntil(
            console.log(event)
        );
    }
});

//Fetch Events
self.addEventListener('fetch', function(event) {
    var requestUrl = new URL(event.request.url);
    var apiUrl = new URL(API_PATH);

    if (requestUrl.origin === location.origin || requestUrl.origin === apiUrl.origin ) {
        //HANDLING POST REQUESTS
        if(event.request.method === "POST" && requestUrl.pathname.includes('index.html')){
            console.log(requestUrl);
            var newReview = {};
            var sendReview = {};

            //finds post parameters
            event.request.formData().then(formData => {

                for(var pair of formData.entries()) {
                    var key = pair[0];
                    var value =  pair[1];
                    newReview[key] = value;
                }

            }).then(
                //adds object to idb
                idb.open('data', 1).then(db => {
                    var tx = db.transaction('screenshosts');
                    var store = tx.objectStore('screenshosts');
                    store.count().then(ct => { sendReview['id'] = parseInt(ct+1);
                        sendReview['restaurant_id'] = parseInt(newReview['restaurant_id']);
                        sendReview['name'] = newReview['name'];
                        sendReview['createdAt'] = new Date().getTime();
                        sendReview['updatedAt'] = new Date().getTime();
                        sendReview['rating'] = parseInt(newReview['rating']);
                        sendReview['comments'] = newReview['comments'];
                        console.log(sendReview);
                        store.add(sendReview);
                    });
                    return tx.complete;
                })
            ).then( () => {

                    fetch(API_PATH + '/reviews/', { method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(newReview)
                    })

                }
            );

            //reloads current page
            event.respondWith(

                caches.open(cacheName).then(function(cache) {
                    return cache.match(requestUrl.origin + 'index.html').then(function(response) {
                        var fetchPromise = fetch(event.request.url, {method:'GET'}).then(function(networkResponse) {
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        });
                        return response || fetchPromise;
                    })
                })

            )
        } else if(event.request.method === "PUT" && requestUrl.pathname.includes('index.html') && requestUrl.href.includes('is_favorite')  ) {
            var url_favorite = (requestUrl.searchParams.get('is_favorite')==='true')? 'true' : 'false';
            var url_id = parseInt(requestUrl.pathname.split("/")[2]);

            idb.open('data', 1).then( db => {

                var tx = db.transaction('screenshots');
                var store = tx.objectStore('screenshots');
                var newRestaurantData;
                store.get(url_id).then(val => {
                    newRestaurantData = val;
                    newRestaurantData['is_favorite'] = url_favorite;
                    store.put(newRestaurantData);
                });
                return tx.complete;
            });

            event.respondWith(

                //fetch(requestUrl, {method: 'PUT'});
                caches.open(cacheName).then(function(cache) {
                    return cache.match(requestUrl.origin + 'index.html').then(function(response) {
                        var fetchPromise = fetch(event.request).then(function(networkResponse) {
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        });
                        return response || fetchPromise;
                    })
                })
            )

        } else if(requestUrl.origin === apiUrl.origin  && requestUrl.pathname.includes('index.html') && requestUrl.searchParams.get("id")){
            var rid = parseInt(requestUrl.searchParams.get("id"));
            event.respondWith(
                idb.open('data', 1).then(function(db) {
                    var tx = db.transaction('screenshots');
                    var store = tx.objectStore('screenshots');
                    return store.get(rid);
                }).then(function(item) {
                    return new Response(JSON.stringify(item),  { "status" : 200 , "statusText" : "MyOwnResponseHaha!" })
                })
            )

        } else if(requestUrl.origin === apiUrl.origin  && event.request.url.endsWith('index.html')){
            event.respondWith(
                idb.open('data', 1).then(function(db) {
                    var tx = db.transaction('screenshots');
                    var store = tx.objectStore('screenshots');
                    return store.getAll();
                }).then(function(item) {
                    return new Response(JSON.stringify(item),  { "status" : 200 , "statusText" : "MyOwnResponseHaha!" })
                })
            )

        }  else if(requestUrl.pathname.includes('index.html') && requestUrl.searchParams.get("id") && event.request.method === "GET"){
            event.respondWith(
                caches.open(cacheName).then(function(cache) {
                    return cache.match(requestUrl.origin + 'index.html').then(function(response) {
                        var fetchPromise = fetch(event.request).then(function(networkResponse) {
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        });
                        return response || fetchPromise;
                    })
                })

            )

        } else {
            event.respondWith(

                caches.match(event.request).then(function(response) {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request);
                }).catch(function(error) {
                    console.log(error)
                })
            );
        }
    }
});

//IndexedDB
function createIndexedDB() {
    self.indexedDB = self.indexedDB || self.mozIndexedDB || self.webkitIndexedDB || self.msIndexedDB;

    if (!(self.indexedDB)) { console.console.log('IDB not supported'); return null;}

    return idb.open('data', 1, function(upgradeDb) {
        if (!upgradeDb.objectStoreNames.contains('screenshots')) {
            upgradeDb.createObjectStore('screenshots', {keyPath: 'id'});
        }
    });
}

function serveImg(request) {
    var storageUrl = request.url.replace(/-\dx\.webp$/, '');
    return caches.open(contentImgsCache).then(function(cache) {
        return cache.match(storageUrl).then(function(response) {
            var networkFetch = fetch(request).then(function(networkResponse) {
                cache.put(storageUrl, networkResponse.clone());
                return networkResponse;
            });
            return response || networkFetch;
        });
    });
}
