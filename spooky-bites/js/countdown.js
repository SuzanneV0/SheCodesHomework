function getHalloweenDate() {
  const now = new Date();
  const year = now.getFullYear();
  let halloween = new Date(year, 9, 31); // October 31st

  if (now > halloween) {
    halloween = new Date(year + 1, 9, 31);
  }

  return halloween;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

let lastAnnouncedMinute = null;

function updateCountdown() {
  const target = getHalloweenDate();
  const now = new Date();
  const diffMs = target - now;

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const seconds = Math.floor((diffMs / 1000) % 60);

  const daysEl = document.getElementById("cd-days");
  const hoursEl = document.getElementById("cd-hours");
  const minutesEl = document.getElementById("cd-minutes");
  const secondsEl = document.getElementById("cd-seconds");

  if (daysEl) daysEl.textContent = pad(days);
  if (hoursEl) hoursEl.textContent = pad(hours);
  if (minutesEl) minutesEl.textContent = pad(minutes);
  if (secondsEl) secondsEl.textContent = pad(seconds);

  // Announce to screen readers at most once a minute, instead of every second.
  const srEl = document.getElementById("countdown-sr");
  if (srEl && minutes !== lastAnnouncedMinute) {
    lastAnnouncedMinute = minutes;
    srEl.textContent =
      days + " days, " + hours + " hours, " + minutes + " minutes until Halloween.";
  }
}

updateCountdown();
setInterval(updateCountdown, 1000);
