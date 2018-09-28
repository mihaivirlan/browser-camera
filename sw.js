if ('serviceWorker' in navigator){
    navigator.serviceWorker
        .register('service-worker.js')
        .then(function (registration) {
            console.log("Service Worker Registered");
            return registration.sync.getTags();
        }).then(function(tags) {
        if (tags.includes('syncReview') || tags.includes('syncFav')) log("There's already a background sync pending");
    })
        .catch(function (err) {
            console.log("Service Worker Failed to Register", err)
        })
}