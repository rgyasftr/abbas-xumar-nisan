// ── Google Apps Script URL (Öz Google Sheet skriptinizi bura yerləşdirə bilərsiniz) ──
const API = "";
const FLOWERS = ["🌸", "🌼", "🌹", "🌺", "💐", "✿"];
const LOCAL_STORAGE_KEY = "abbas_xumar_wishes_backup";

// Əvvəlki köhnə keşləri təmizləyirik
try {
  localStorage.removeItem("umud_laman_wishes_backup");
} catch (e) {}

// ── State flags ──
let going = false;
let unlocked = false;

// ── Audio Controller ──
const bgMusic = document.getElementById("bgMusic");
const musicToggle = document.getElementById("musicToggle");

if (musicToggle && bgMusic) {
  musicToggle.addEventListener("click", () => {
    if (bgMusic.paused) {
      bgMusic.play().then(() => {
        musicToggle.classList.remove("muted");
      }).catch(err => console.log("Audio play blocked", err));
    } else {
      bgMusic.pause();
      musicToggle.classList.add("muted");
    }
  });
}

// ── Scroll lock before envelope opened ──
document.documentElement.style.overflow = "hidden";
document.body.style.overflow = "hidden";

function handlePreventScroll(e) {
  if (!unlocked) {
    e.preventDefault();
  }
}

window.addEventListener("wheel", handlePreventScroll, { passive: false });
window.addEventListener("touchmove", handlePreventScroll, { passive: false });

// ── S1 Envelope → S2 Hero Transition ──
function startEnv() {
  if (going) return;
  going = true;

  // Background music initiation
  if (bgMusic) {
    bgMusic.volume = 0.35;
    bgMusic.play().then(() => {
      if (musicToggle) {
        musicToggle.classList.add("show");
        musicToggle.classList.remove("muted");
      }
    }).catch((e) => {
      console.log("Autoplay note:", e);
      if (musicToggle) musicToggle.classList.add("show");
    });
  }

  // Fade out poster and tap prompt
  const poster = document.getElementById("poster");
  const tap = document.getElementById("tap");
  if (poster) poster.classList.add("gone");
  if (tap) tap.classList.add("gone");

  // Play envelope video
  const ev = document.getElementById("envVid");
  if (ev) {
    ev.classList.add("show");
    const playPromise = ev.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          ev.addEventListener("ended", showHero, { once: true });
        })
        .catch(() => {
          // Fallback if video autoplay fails
          setTimeout(showHero, 1500);
        });
    } else {
      ev.addEventListener("ended", showHero, { once: true });
    }
  } else {
    showHero();
  }
}

function showHero() {
  const heroVid = document.getElementById("heroVid");
  if (heroVid) {
    heroVid.play().catch(e => console.log("Hero video autoplay:", e));
  }

  const s2 = document.getElementById("s2");
  if (s2) s2.classList.add("show");

  setTimeout(() => {
    const s1 = document.getElementById("s1");
    if (s1) s1.style.display = "none";
    
    // Unlock scrolling
    unlocked = true;
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    
    // Initialize reveal observer
    initReveal();
  }, 1400);
}

// ── Countdown Timer (Target: 2026-11-22 18:00:00 AZT) ──
function updateCD() {
  const targetDate = new Date("2026-11-22T18:00:00+04:00").getTime();
  const diff = targetDate - Date.now();

  if (diff <= 0) {
    ["cd-d", "cd-h", "cd-m", "cd-s"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "00";
    });
    return;
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const dEl = document.getElementById("cd-d");
  const hEl = document.getElementById("cd-h");
  const mEl = document.getElementById("cd-m");
  const sEl = document.getElementById("cd-s");

  if (dEl) dEl.textContent = String(days).padStart(2, "0");
  if (hEl) hEl.textContent = String(hours).padStart(2, "0");
  if (mEl) mEl.textContent = String(minutes).padStart(2, "0");
  if (sEl) sEl.textContent = String(seconds).padStart(2, "0");
}

updateCD();
setInterval(updateCD, 1000);

// ── Scroll Reveal Intersection Observer ──
function initReveal() {
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.12 }
  );

  document
    .querySelectorAll(".reveal, .reveal-left, .reveal-scale")
    .forEach((el) => obs.observe(el));
}

// ── Guestbook Messages (Ürək Sözləri) ──
function getSavedLocalMessages() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalMessages(msgs) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(msgs));
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

async function loadMessages() {
  // Əgər istifadəçi öz Google Apps Script API linkini qoyubsa oradan çəkir
  if (API && API.trim() !== "") {
    try {
      const res = await fetch(API + "?action=get", { method: "GET" });
      if (!res.ok) throw new Error("HTTP error " + res.status);
      const msgs = await res.json();
      if (Array.isArray(msgs)) {
        renderMessages(msgs);
        saveLocalMessages(msgs);
        return;
      }
    } catch (e) {
      console.log("Could not load from Google Sheets, using cached/local wishes:", e);
    }
  }

  // API yoxdursa və ya xəta baş veribsə, yerli yaddaşdan yüklə
  const cached = getSavedLocalMessages();
  renderMessages(cached);
}

async function submitMsg() {
  const nameEl = document.getElementById("msgName");
  const textEl = document.getElementById("msgText");
  const name = nameEl ? nameEl.value.trim() : "";
  const text = textEl ? textEl.value.trim() : "";

  if (!name || !text) return;

  const btn = document.getElementById("msgBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Göndərilir...";
  }

  // Optimistik yeniləmə: Mesajı dərhal siyahının başına əlavə et
  const list = document.getElementById("msgsList");
  if (list) {
    const existing = list.querySelectorAll(".msg-card");
    const card = makeCard({ name, text }, existing.length);
    if (
      list.querySelector(".no-msgs") ||
      list.querySelector(".msgs-loading")
    ) {
      list.innerHTML = "";
    }
    list.insertBefore(card, list.firstChild);
  }

  // Yerli yaddaşa saxla
  const localList = getSavedLocalMessages();
  localList.unshift({ name, text });
  saveLocalMessages(localList);

  // Formu sıfırla və uğur bildirişini göstər
  if (nameEl) nameEl.value = "";
  if (textEl) textEl.value = "";
  const succ = document.getElementById("msgSuccess");
  if (succ) {
    succ.classList.add("show");
    setTimeout(() => succ.classList.remove("show"), 3500);
  }

  // Əgər API təyin edilibsə Google Sheets-ə göndər
  if (API && API.trim() !== "") {
    try {
      await fetch(API, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, text }),
      });
      setTimeout(loadMessages, 2500);
    } catch (e) {
      console.log("Remote submit error, message stored locally:", e);
    }
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = "Göndər";
  }
}

function makeCard(m, i) {
  const card = document.createElement("div");
  card.className = "msg-card";
  card.style.animation = "fadeIn .5s ease";
  card.innerHTML =
    '<span class="msg-card-quote">\u201C</span>' +
    '<div class="msg-card-name">' +
    esc(m.name || "Qonaq") +
    "</div>" +
    '<div class="msg-card-text">' +
    esc(m.text || "") +
    "</div>" +
    '<div class="msg-card-flower">' +
    FLOWERS[Math.abs(i) % FLOWERS.length] +
    "</div>";
  return card;
}

function renderMessages(msgs) {
  const list = document.getElementById("msgsList");
  if (!list) return;

  list.innerHTML = "";
  if (!msgs || msgs.length === 0) {
    list.innerHTML =
      '<div class="no-msgs">Hələ təbrik mesajı yoxdur. İlk siz yazın! 🌸</div>';
    return;
  }
  msgs.forEach((m, i) => list.appendChild(makeCard(m, i)));
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Mesajları yüklə
loadMessages();
