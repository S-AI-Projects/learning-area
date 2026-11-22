const media = document.querySelector("video");
const controls = document.querySelector(".controls");

const play = document.querySelector(".play");
const stop = document.querySelector(".stop");
const rwd = document.querySelector(".rwd");
const fwd = document.querySelector(".fwd");

const timerWrapper = document.querySelector(".timer");
const timer = document.querySelector(".timer span");
const timerBar = document.querySelector(".timer div");
const errorMsg = document.querySelector(".media-error-msg");

let intervalFwd;
let intervalRwd;

const controlButtons = [play, stop, rwd, fwd].filter(Boolean);

if (media) {
  media.removeAttribute("controls");
}
if (controls) {
  controls.style.visibility = "visible";
}

function handleMediaError() {
  if (errorMsg) {
    errorMsg.style.display = "block";
  }
  controlButtons.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = "0.4";
    btn.style.cursor = "not-allowed";
  });
  if (intervalRwd) clearInterval(intervalRwd);
  if (intervalFwd) clearInterval(intervalFwd);
}

function handleMediaRecovery() {
  if (errorMsg) {
    errorMsg.style.display = "none";
  }
  controlButtons.forEach(btn => {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
  });
}

if (media) {
  const sourceElements = media.querySelectorAll("source");
  if (!media.getAttribute("src") && sourceElements.length === 0) {
    handleMediaError();
  }

  media.addEventListener("error", handleMediaError);

  let failedSources = 0;
  sourceElements.forEach(source => {
    source.addEventListener("error", () => {
      failedSources++;
      if (
        failedSources >= sourceElements.length ||
        media.networkState === HTMLMediaElement.NETWORK_NO_SOURCE ||
        media.error
      ) {
        handleMediaError();
      }
    });
  });

  media.addEventListener("canplay", handleMediaRecovery);
  media.addEventListener("loadeddata", handleMediaRecovery);
  media.addEventListener("loadedmetadata", handleMediaRecovery);

  if (play) play.addEventListener("click", playPauseMedia);
  if (stop) stop.addEventListener("click", stopMedia);
  media.addEventListener("ended", stopMedia);
  if (rwd) rwd.addEventListener("click", mediaBackward);
  if (fwd) fwd.addEventListener("click", mediaForward);
  media.addEventListener("timeupdate", setTime);
}

function playPauseMedia() {
  if (!play || play.disabled || !media) return;
  if (rwd) rwd.classList.remove("active");
  if (fwd) fwd.classList.remove("active");
  if (intervalRwd) clearInterval(intervalRwd);
  if (intervalFwd) clearInterval(intervalFwd);
  if (media.paused) {
    play.setAttribute("data-icon", "u");
    const playPromise = media.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        play.setAttribute("data-icon", "P");
        handleMediaError();
      });
    }
  } else {
    play.setAttribute("data-icon", "P");
    media.pause();
  }
}

function stopMedia() {
  if (!stop || stop.disabled || !media) return;
  if (rwd) rwd.classList.remove("active");
  if (fwd) fwd.classList.remove("active");
  media.pause();
  media.currentTime = 0;
  if (intervalRwd) clearInterval(intervalRwd);
  if (intervalFwd) clearInterval(intervalFwd);
  if (play) play.setAttribute("data-icon", "P");
}

function mediaBackward() {
  if (!rwd || rwd.disabled || !media) return;
  if (intervalFwd) clearInterval(intervalFwd);
  if (fwd) fwd.classList.remove("active");

  if (rwd.classList.contains("active")) {
    rwd.classList.remove("active");
    if (intervalRwd) clearInterval(intervalRwd);
    const p = media.play();
    if (p !== undefined) p.catch(() => handleMediaError());
  } else {
    rwd.classList.add("active");
    media.pause();
    intervalRwd = setInterval(windBackward, 200);
  }
}

function mediaForward() {
  if (!fwd || fwd.disabled || !media) return;
  if (intervalRwd) clearInterval(intervalRwd);
  if (rwd) rwd.classList.remove("active");

  if (fwd.classList.contains("active")) {
    fwd.classList.remove("active");
    if (intervalFwd) clearInterval(intervalFwd);
    const p = media.play();
    if (p !== undefined) p.catch(() => handleMediaError());
  } else {
    fwd.classList.add("active");
    media.pause();
    intervalFwd = setInterval(windForward, 200);
  }
}

function windBackward() {
  if (!media) return;
  if (media.currentTime <= 3) {
    if (rwd) rwd.classList.remove("active");
    if (intervalRwd) clearInterval(intervalRwd);
    stopMedia();
  } else {
    media.currentTime -= 3;
  }
}

function windForward() {
  if (!media) return;
  if (media.currentTime >= media.duration - 3) {
    if (fwd) fwd.classList.remove("active");
    if (intervalFwd) clearInterval(intervalFwd);
    stopMedia();
  } else {
    media.currentTime += 3;
  }
}

function setTime() {
  if (!media || !media.duration || isNaN(media.duration)) return;
  const minutes = Math.floor(media.currentTime / 60);
  const seconds = Math.floor(media.currentTime - minutes * 60);

  const minuteValue = minutes.toString().padStart(2, "0");
  const secondValue = seconds.toString().padStart(2, "0");

  const mediaTime = `${minuteValue}:${secondValue}`;
  if (timer) timer.textContent = mediaTime;

  if (timerWrapper && timerBar) {
    const barLength =
      timerWrapper.clientWidth * (media.currentTime / media.duration);
    timerBar.style.width = `${barLength}px`;
  }
}
