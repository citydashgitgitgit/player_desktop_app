const statusElement = document.getElementById('status-message');

const showStatusMessage = (message) => {
    statusElement.textContent = message;
    statusElement.classList.add('visible');
};

const removeStatusMessage = () => {
    statusElement.classList.remove('visible');
};


const main = async () => {
    showStatusMessage("Loading ad object...");
    const adObject = await window.electron.getAdObject();

    const videoElement = initVideo(adObject?.adObject);
    showStatusMessage("Loading playlist...");
    let playlist = [];
    try {
        playlist = await window.electron.checkCurrentPlaylist(adObject);
        videoElement.src = playlist[0];
        removeStatusMessage();
    } catch (error) {
        return showStatusMessage("Error loading playlist");
    }

    const updatePlaylist = async () => {
        try {
            const newPlaylist = await window.electron.checkCurrentPlaylist(adObject);
            if (newPlaylist && newPlaylist.length > 0) {
                playlist = newPlaylist;
                if (currentVideoIndex >= playlist.length) {
                    currentVideoIndex = 0;
                }
            }
        } catch (error) {
            console.error("Error updating playlist:", error);
        }
    };


    setInterval(updatePlaylist, 5 * 60 * 1000);

    let currentVideoIndex = 0;
    let failedAttempts = 0;

    videoElement.src = playlist[currentVideoIndex];
    videoElement.play();
    videoElement.onplay = () => {
        removeStatusMessage();
        failedAttempts = 0;
    }
    videoElement.onended = () => {
        currentVideoIndex++;
        if (currentVideoIndex >= playlist.length) {
            currentVideoIndex = 0;
        }
        videoElement.src = playlist[currentVideoIndex];
        videoElement.play();
    }
    videoElement.onerror = () => {
        // failedAttempts++;
        // if (failedAttempts >= playlist.length) {
        //     showStatusMessage("Error: All videos failed to play");
        //     return;
        // }
        // currentVideoIndex++;
        // if (currentVideoIndex >= playlist.length) {
        //     currentVideoIndex = 0;
        // }
        // videoElement.src = playlist[currentVideoIndex];
        // videoElement.play();
    }
}

const initVideo = (adObject) => {
    const videoElement = document.createElement("video");
    videoElement.style.width = adObject ? `${adObject.specs.screen.width}px` : "100%";
    videoElement.style.height = adObject ? `${adObject.specs.screen.height}px` : "100%";
    videoElement.style.objectFit = "contain";
    videoElement.style.position = "fixed";
    videoElement.style.top = "0";
    videoElement.style.left = "0";
    videoElement.style.backgroundColor = "#000";

    document.body.appendChild(videoElement);
    return videoElement;
}

main();