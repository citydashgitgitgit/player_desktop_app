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
    const playlist = await getPlaylist();
    let currentVideoIndex = 0;

    console.log("playlist", playlist);
    videoElement = el;
    el.src = playlist[currentVideoIndex];
    el.play();
    el.onended = () => {
        currentVideoIndex++;
        if (currentVideoIndex >= playlist.length) {
            currentVideoIndex = 0;
        }
        el.src = playlist[currentVideoIndex];
        el.play();
    }
});