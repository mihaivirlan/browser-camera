var isRecording = false;

function getUserMedia(options, successCallback, failureCallback) {
    var api = navigator.getUserMedia || navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia || navigator.msGetUserMedia;
    if (api) {
        return api.bind(navigator)(options, successCallback, failureCallback);
    }
}

function getStream (type) {

    if(isRecording==false) {
        isRecording = !isRecording;
        let btn = document.querySelector('#act');
        btn.innerText = 'Take screenshot';

        let video = document.querySelector('video');
        video.style.display = 'block';

        let img = document.querySelector('#imageTag');
        img.style.display = 'none';

        if (!navigator.getUserMedia && !navigator.webkitGetUserMedia &&
            !navigator.mozGetUserMedia && !navigator.msGetUserMedia) {
            alert('User Media API not supported.');
            return;
        }

        var constraints = {};
        constraints[type] = true;
        getUserMedia(constraints, function (stream) {
            var mediaControl = document.querySelector(type);

            if ('srcObject' in mediaControl) {
                mediaControl.srcObject = stream;
                mediaControl.src = (window.URL || window.webkitURL).createObjectURL(stream);
            } else if (navigator.mozGetUserMedia) {
                mediaControl.mozSrcObject = stream;
            }
            theStream = stream;
        }, function (err) {
            alert('Error: ' + err);
        });

    } else {
        isRecording = !isRecording;
        let btn = document.querySelector('#act');
        btn.innerText = 'Start video';

        let img = document.querySelector('#imageTag');
        img.style.display = 'block';

        takePhoto();

        let video = document.querySelector('video');
        video.style.display = 'none';
    }
}

function takePhoto() {
    if (!('ImageCapture' in window)) {
        alert('ImageCapture is not available');
        return;
    }

    if (!theStream) {
        alert('Grab the video stream first!');
        return;
    }

    var theImageCapturer = new ImageCapture(theStream.getVideoTracks()[0]);

    theImageCapturer.takePhoto()
        .then(blob => {
            var theImageTag = document.getElementById("imageTag");
            theImageTag.src = URL.createObjectURL(blob);

            fetch("http://localhost:3000/data", {mode: 'no-cors', method: 'POST', body: blob}).then(res => {
                console.log(res);
            });
            console.log('Image URI: ', theImageTag.src);
        })
        .catch(err => alert('Error: ' + err));
}
