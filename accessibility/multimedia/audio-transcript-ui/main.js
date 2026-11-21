// grab references to buttons and video

const playPauseBtn = document.querySelector('.playpause');
const stopBtn = document.querySelector('.stop');
const rwdBtn = document.querySelector('.rwd');
const fwdBtn = document.querySelector('.fwd');
const timeLabel = document.querySelector('.time');

const player = document.querySelector('audio');

// Remove the native controls from all players

player.removeAttribute('controls');

const audioFallback = document.querySelector('.audio-fallback');
const playerButtons = [playPauseBtn, stopBtn, rwdBtn, fwdBtn];

function handleAudioError() {
  if (audioFallback) {
    audioFallback.style.display = 'block';
  }
  playerButtons.forEach(btn => {
    if (btn) btn.disabled = true;
  });
}

function handleAudioSuccess() {
  if (audioFallback) {
    audioFallback.style.display = 'none';
  }
  playerButtons.forEach(btn => {
    if (btn) btn.disabled = false;
  });
}

player.addEventListener('error', handleAudioError);
const sources = player.querySelectorAll('source');
sources.forEach(source => {
  source.addEventListener('error', () => {
    if (player.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || player.error) {
      handleAudioError();
    }
  });
});

player.addEventListener('canplay', handleAudioSuccess);
player.addEventListener('loadeddata', handleAudioSuccess);

// Define constructor for player controls object

playPauseBtn.onclick = function() {
  if(player.paused) {
    const playPromise = player.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        playPauseBtn.textContent = 'Pause';
      }).catch(() => {
        handleAudioError();
        playPauseBtn.textContent = 'Play';
      });
    }
  } else {
    player.pause();
    playPauseBtn.textContent = 'Play';
  }
};

stopBtn.onclick = function() {
  player.pause();
  player.currentTime = 0;
  playPauseBtn.textContent = 'Play';
};

rwdBtn.onclick = function() {
  player.currentTime -= 3;
};

fwdBtn.onclick = function() {
  player.currentTime += 3;
  if(player.currentTime >= player.duration || player.paused) {
    player.pause();
    player.currentTime = 0;
    playPauseBtn.textContent = 'Play';
  }
};

player.ontimeupdate = function() {
  let minutes = Math.floor(player.currentTime / 60);
  let seconds = Math.floor(player.currentTime - minutes * 60);
  let minuteValue;
  let secondValue;

  if (minutes<10) {
    minuteValue = "0" + minutes;
  } else {
    minuteValue = minutes;
  }

  if (seconds<10) {
    secondValue = "0" + seconds;
  } else {
    secondValue = seconds;
  }

  let mediaTime = minuteValue + ":" + secondValue;
  timeLabel.textContent = mediaTime;
};

// Control transcript display

const transcript = document.querySelector('.transcript');
const transcriptBtn = document.querySelector('.transcript-container button');

transcriptBtn.onclick = function() {
  if(transcriptBtn.textContent === 'Show transcript') {
    transcript.style.height = '150px';
    transcriptBtn.textContent = 'Hide transcript';
    const transcriptParagraphs = transcript.querySelectorAll('p:not(.empty-transcript)');
    const emptyTranscript = transcript.querySelector('.empty-transcript');
    if (transcriptParagraphs.length === 0 && emptyTranscript) {
      emptyTranscript.style.display = 'block';
    }
  } else {
    transcript.style.height = '0';
    transcriptBtn.textContent = 'Show transcript';
  }
};
