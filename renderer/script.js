let videoElement;
let playlist;

const getPlaylist = async () => {
    const playlist = await electronAPI.getPlaylist();
    return playlist;
};

const getAdObject = async () => {
    const adObject = await electronAPI.getLocalAdObject();
    console.log("adObject", adObject);
    return adObject;
};

const initVideoElement = async () => {
    const adObject = await getAdObject();
    const videoElement = document.createElement("video");
    videoElement.style.width = adObject.specs.screen.width + "px";
    videoElement.style.height = adObject.specs.screen.height + "px";

    document.body.appendChild(videoElement);
    return videoElement;
};

initVideoElement().then(async el => {
    let playlist = await getPlaylist();
    let currentVideoIndex = 0;

    console.log("playlist", playlist);
    videoElement = el;

    const playVideo = async () => {
        if (!playlist || playlist.length === 0) {
            console.error("Empty playlist");
            playlist = await getPlaylist();
            currentVideoIndex = 0;
        }

        if (playlist[currentVideoIndex]) {
            el.src = playlist[currentVideoIndex];
            try {
                await el.play();
            } catch (error) {
                console.error("Error playing video:", error);
                currentVideoIndex++;
                if (currentVideoIndex >= playlist.length) {
                    currentVideoIndex = 0;
                    playlist = await getPlaylist();
                }
                playVideo();
            }
        }
    };

    playVideo();

    el.onended = async () => {
        currentVideoIndex++;
        if (currentVideoIndex >= playlist.length) {
            currentVideoIndex = 0;
            playlist = await getPlaylist();
        }
        playVideo();
    }
});