/* FlipClock Timer clone — flip animation + countdown + themes */
let timerDuration = 15 * 60;
let timerRemaining = timerDuration;
let timerInterval = null;
let timerRunning = false;
let muteFlipAudio = true;

const minuteCard = document.getElementById("data-minute-card");
const secondCard = document.getElementById("data-second-card");
const slider = document.getElementById("time-slider");
const sizeSlider = document.getElementById("size_range_slider");
const clockContainer = document.querySelector(".container");
const menuToggle = document.getElementById("menu_toggle");
const menuClose = document.getElementById("menu_close");
const controls = document.getElementById("controls");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const stopBtn = document.getElementById("stop-btn");
const volumeOn = document.getElementById("volume_on");
const volumeOff = document.getElementById("volume_off");
const stopAlarmBtn = document.getElementById("stop_alarm");

/* ---------- Sound: WebAudio synthesized flip tick + sonar alarm ---------- */
let audioCtx = null;
let alarmNodes = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}
function playTick() {
  if (muteFlipAudio) return;
  try {
    ensureAudio();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const variants = [1900, 2300, 2600, 3100, 1700];
    osc.frequency.value = variants[Math.floor(Math.random() * variants.length)];
    osc.type = "square";
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  } catch (e) { /* audio indisponível */ }
}
function startAlarm() {
  try {
    ensureAudio();
    stopAlarmSound();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 2;
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain).connect(osc.frequency);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(); lfo.start();
    alarmNodes = { osc, gain, lfo };
  } catch (e) { /* noop */ }
}
function stopAlarmSound() {
  if (!alarmNodes) return;
  try { alarmNodes.osc.stop(); alarmNodes.lfo.stop(); } catch (e) {}
  try { alarmNodes.gain.disconnect(); } catch (e) {}
  alarmNodes = null;
}

function syncVolumeIcon() {
  if (muteFlipAudio) {
    volumeOn.style.display = "none";
    volumeOff.style.display = "block";
  } else {
    volumeOn.style.display = "block";
    volumeOff.style.display = "none";
  }
}
volumeOn.onclick = () => { muteFlipAudio = true; syncVolumeIcon(); };
volumeOff.onclick = () => { ensureAudio(); muteFlipAudio = false; syncVolumeIcon(); };
syncVolumeIcon();

stopAlarmBtn.onclick = () => {
  stopAlarmSound();
  stopAlarmBtn.style.display = "none";
};

/* ---------- Flip rendering ---------- */
function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return [m, s < 10 ? "0" + s : s];
}
function flip(flipCard, newNumber) {
  const topHalf = flipCard.querySelector(".top");
  const startNumber = topHalf.textContent;
  if (newNumber === startNumber) return;
  const bottomHalf = flipCard.querySelector(".bottom");
  const topFlip = document.createElement("div");
  topFlip.classList.add("top-flip");
  const bottomFlip = document.createElement("div");
  bottomFlip.classList.add("bottom-flip");
  topHalf.textContent = startNumber;
  bottomHalf.textContent = startNumber;
  topFlip.textContent = startNumber;
  bottomFlip.textContent = newNumber;
  topFlip.addEventListener("animationstart", () => { topHalf.textContent = newNumber; });
  topFlip.addEventListener("animationend", () => { topFlip.remove(); });
  bottomFlip.addEventListener("animationend", () => {
    bottomHalf.textContent = newNumber;
    bottomFlip.remove();
  });
  flipCard.append(topFlip, bottomFlip);
}
function updateClockDisplay(min, sec) {
  const paddedMin = String(min).padStart(2, "0");
  const paddedSec = String(sec).padStart(2, "0");
  const beforeMin = minuteCard.querySelector(".top").textContent;
  const beforeSec = secondCard.querySelector(".top").textContent;
  flip(minuteCard, paddedMin);
  flip(secondCard, paddedSec);
  if (!muteFlipAudio && (beforeMin !== paddedMin || beforeSec !== paddedSec)) playTick();
  document.title = `${paddedMin}:${paddedSec} — FlipClock Timer`;
}

/* ---------- Countdown engine ---------- */
function tick() {
  if (timerRemaining <= 0) {
    stopAlarmBtn.style.display = "flex";
    startAlarm();
    clearInterval(timerInterval);
    timerRunning = false;
    startBtn.style.display = "flex";
    pauseBtn.style.display = "none";
    return;
  }
  timerRemaining--;
  const [m, s] = formatTime(timerRemaining);
  updateClockDisplay(m, s);
}
function startTimer() {
  ensureAudio();
  startBtn.style.display = "none";
  pauseBtn.style.display = "flex";
  if (timerRunning) return;
  // se chegou a zero antes, reinicia do duration
  if (timerRemaining <= 0) {
    timerRemaining = timerDuration;
    const [m, s] = formatTime(timerRemaining);
    updateClockDisplay(m, s);
  }
  timerRunning = true;
  timerInterval = setInterval(tick, 1000);
}
function pauseTimer() {
  startBtn.style.display = "flex";
  pauseBtn.style.display = "none";
  clearInterval(timerInterval);
  timerRunning = false;
}
function resetTimer() {
  pauseTimer();
  stopAlarmSound();
  stopAlarmBtn.style.display = "none";
  timerRemaining = timerDuration;
  const [m, s] = formatTime(timerRemaining);
  updateClockDisplay(m, s);
}
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
stopBtn.addEventListener("click", resetTimer);

/* ---------- Time slider (1–60 min) ---------- */
let debounceTimeout;
slider.addEventListener("input", (e) => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    const mins = parseInt(e.target.value, 10);
    pauseTimer();
    timerDuration = mins * 60;
    timerRemaining = timerDuration;
    const [m, s] = formatTime(timerRemaining);
    updateClockDisplay(m, s);
  }, 20);
});
const marks = document.querySelectorAll(".slider-marks span");
function updateActiveMark() {
  const v = parseInt(slider.value, 10);
  marks.forEach((mark) => {
    mark.classList.toggle("active", parseInt(mark.dataset.value, 10) === v);
  });
}
slider.addEventListener("input", updateActiveMark);
marks.forEach((mark) => {
  mark.addEventListener("click", () => {
    slider.value = mark.dataset.value;
    const mins = parseInt(mark.dataset.value, 10);
    pauseTimer();
    timerDuration = mins * 60;
    timerRemaining = timerDuration;
    const [m, s] = formatTime(timerRemaining);
    updateClockDisplay(m, s);
    updateActiveMark();
  });
});
updateActiveMark();

/* ---------- Size slider ---------- */
function clockSize() {
  clockContainer.style.transform = "scale(" + sizeSlider.value / 100 + ")";
  localStorage.setItem("clock_scale", sizeSlider.value);
}
sizeSlider.addEventListener("input", clockSize);
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("clock_scale");
  if (saved) {
    sizeSlider.value = saved;
    clockContainer.style.transform = "scale(" + saved / 100 + ")";
  }
});

/* ---------- Menu show/hide ---------- */
menuToggle.style.display = "none";
menuClose.style.display = "block";
controls.style.display = "flex";
menuToggle.onclick = () => {
  menuToggle.style.display = "none";
  menuClose.style.display = "block";
  controls.classList.remove("close");
  controls.style.display = "flex";
};
menuClose.onclick = () => {
  menuToggle.style.display = "block";
  menuClose.style.display = "none";
  controls.classList.add("close");
};

/* ---------- Light / dark ---------- */
const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
function applyStoredThemeMode() {
  const stored = localStorage.getItem("data-theme") || "dark";
  document.documentElement.setAttribute("data-theme", stored);
  toggleSwitch.checked = stored === "dark";
  applyCustomThemeColors();
}
function switchTheme(e) {
  const mode = e.target.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", mode);
  localStorage.setItem("data-theme", mode);
  applyCustomThemeColors();
}
toggleSwitch.addEventListener("change", switchTheme);

/* ---------- Custom color themes ---------- */
const THEMES = {
  theme1: { dark: ["#0F140F", "#1A1F1A", "#C4EBC1"], light: ["#E8FFE8", "#D6F5D6", "#546654"] },
  theme2: { dark: ["#131315", "#1B1C20", "#C5C8F8"], light: ["#EFF2FF", "#E4E7FE", "#222843"] },
  theme3: { dark: ["#1B1616", "#271E1E", "#EF6666"], light: ["#FFF4F4", "#FFEDED", "#FF8F8F"] },
  theme4: { dark: ["#16120B", "#221E17", "#FFAC45"], light: ["#FFF7EC", "#FFEED6", "#FDC97B"] },
  theme5: { dark: ["#131519", "#1A1E23", "#CCE1FF"], light: ["#F5F9FF", "#E4EFFF", "#2C3440"] },
  theme6: { dark: ["#0D0F11", "#14161A", "#FFD458"], light: ["#FFFDF4", "#FFF8E1", "#FFDB57"] },
  theme7: { dark: ["#1A171C", "#221D23", "#E3CEEC"], light: ["#FCF5FF", "#F8E8FF", "#574260"] },
  theme8: { dark: ["#181B19", "#1E2320", "#BEEBD2"], light: ["#F5FFFA", "#E6F8EE", "#5F8873"] },
};
function applyCustomThemeColors() {
  const current = localStorage.getItem("current_theme");
  const mode = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  if (!current || !THEMES[current]) return;
  const [bg, holder, text] = THEMES[current][mode];
  document.body.style.setProperty("--background", bg);
  document.body.style.setProperty("--holder", holder);
  document.body.style.setProperty("--text", text);
}
document.querySelector(".default_theme").addEventListener("click", () => {
  localStorage.removeItem("current_theme");
  document.body.style.removeProperty("--background");
  document.body.style.removeProperty("--holder");
  document.body.style.removeProperty("--text");
});
Object.keys(THEMES).forEach((key) => {
  const el = document.querySelector("." + key);
  if (!el) return;
  el.addEventListener("click", () => {
    localStorage.setItem("current_theme", key);
    applyCustomThemeColors();
  });
});

/* ---------- Themes panel toggle ---------- */
const themesContainer = document.getElementsByClassName("themes_container")[0];
const themesToggle = document.getElementsByClassName("themes_toggle")[0];
const themesCloseToggle = document.getElementById("themes_close_toggle");
themesToggle.addEventListener("click", () => {
  themesContainer.classList.remove("close");
  themesContainer.style.display = "grid";
  themesToggle.style.display = "none";
  themesCloseToggle.style.display = "block";
});
themesCloseToggle.addEventListener("click", () => {
  themesContainer.classList.add("close");
  themesToggle.style.display = "block";
  themesCloseToggle.style.display = "none";
});

/* ---------- Fullscreen ---------- */
document.querySelector(".full").onclick = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else if (document.exitFullscreen) document.exitFullscreen();
};

/* ---------- Lo-Fi player ---------- */
const lofiButton = document.getElementById("lofi_button");
const lofiPlayer = document.getElementById("lofi_player");
const lofiContainer = document.getElementById("lofi_container");
const lofiCloseButton = document.getElementById("lofi_close_button");
document.getElementById("lofi_name").textContent = (typeof LOFI !== "undefined" && LOFI.name) || "";
lofiCloseButton.onclick = () => {
  lofiContainer.classList.add("hide");
  lofiPlayer.src = "";
};
lofiButton.onclick = () => {
  if (typeof LOFI !== "undefined" && LOFI.code) {
    lofiPlayer.src = "https://www.youtube.com/embed/" + LOFI.code + "?autoplay=1";
  }
  lofiContainer.classList.remove("hide");
};
let isDragging = false, currentX = 0, currentY = 0, initialX = 0, initialY = 0, offsetX = 0, offsetY = 0;
lofiContainer.addEventListener("mousedown", (e) => {
  isDragging = true;
  initialX = e.clientX; initialY = e.clientY;
  offsetX = currentX; offsetY = currentY;
});
document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  currentX = offsetX + (e.clientX - initialX);
  currentY = offsetY + (e.clientY - initialY);
  lofiContainer.style.transform = `translate(${currentX}px, ${currentY}px)`;
});
document.addEventListener("mouseup", () => { isDragging = false; });

/* ---------- URL params: ?t=MM:SS[&start] ---------- */
(function handleUrlParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("t")) return;
    const [mm, ss] = (params.get("t") || "15:00").split(":");
    const mins = parseInt(mm, 10) || 0;
    const secs = parseInt(ss, 10) || 0;
    timerDuration = mins * 60 + secs;
    if (timerDuration < 1) timerDuration = 60;
    if (timerDuration > 3600) timerDuration = 3600;
    timerRemaining = timerDuration;
    const sliderVal = Math.min(60, Math.max(1, Math.round(timerDuration / 60)));
    slider.value = sliderVal;
    updateActiveMark();
    updateClockDisplay(Math.floor(timerRemaining / 60), String(timerRemaining % 60).padStart(2, "0"));
    if (window.location.href.includes("start")) startTimer();
  } catch (e) { /* noop */ }
})();

/* ---------- Init ---------- */
applyStoredThemeMode();
(function init() {
  const [m, s] = formatTime(timerRemaining);
  // pinta direto sem animação no primeiro frame
  minuteCard.querySelector(".top").textContent = String(m).padStart(2, "0");
  minuteCard.querySelector(".bottom").textContent = String(m).padStart(2, "0");
  secondCard.querySelector(".top").textContent = s;
  secondCard.querySelector(".bottom").textContent = s;
  updateActiveMark();
})();
