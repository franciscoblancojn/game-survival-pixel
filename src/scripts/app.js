import { SCREENS } from './constants.js';
import { loadData, saveData, resetData } from './storage.js';
import { getGreeting } from './helpers.js';
import { showToast } from './components/Toast.js';
import { showConfirm } from './components/ConfirmDialog.js';

let appData = loadData();
let currentScreen = 'home';
let isTransitioning = false;
let touchStartX = 0;

function init() {
  applyTheme(appData.settings.theme);
  renderHomeScreen();
  setupNavigation();
  setupSwipe();
  setupKeyboard();
  setupSettings();
  updateUsernameDisplay();
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  appData.settings.theme = theme;
  saveData(appData);
}

function switchScreen(screenName) {
  if (screenName === currentScreen || isTransitioning) return;
  const currentIndex = SCREENS.indexOf(currentScreen);
  const nextIndex = SCREENS.indexOf(screenName);
  const goingForward = nextIndex > currentIndex;

  isTransitioning = true;
  const oldEl = document.getElementById(`screen-${currentScreen}`);
  const newEl = document.getElementById(`screen-${screenName}`);

  if (oldEl) {
    oldEl.classList.add(goingForward ? 'slide-out-left' : 'slide-out-right');
  }

  setTimeout(() => {
    if (oldEl) {
      oldEl.classList.remove('active', 'slide-out-left', 'slide-out-right');
      oldEl.style.display = 'none';
    }
    if (newEl) {
      newEl.style.display = 'block';
      newEl.classList.add('active', goingForward ? 'slide-in-right' : 'slide-in-left');
      setTimeout(() => {
        newEl.classList.remove('slide-in-right', 'slide-in-left');
      }, 200);
    }
    currentScreen = screenName;
    updateNavActive(screenName);
    isTransitioning = false;
  }, 200);
}

function updateNavActive(screenName) {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.screen === screenName);
  });
}

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      switchScreen(item.dataset.screen);
    });
  });
}

function setupSwipe() {
  let startX = 0;
  let startY = 0;
  const threshold = 60;

  document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = startX - endX;
    const diffY = startY - endY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
      const currentIndex = SCREENS.indexOf(currentScreen);
      if (diffX > 0 && currentIndex < SCREENS.length - 1) {
        switchScreen(SCREENS[currentIndex + 1]);
      } else if (diffX < 0 && currentIndex > 0) {
        switchScreen(SCREENS[currentIndex - 1]);
      }
    }
  }, { passive: true });
}

function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.key === '1') switchScreen('home');
    else if (e.key === '2') switchScreen('about');
    else if (e.key === '3') switchScreen('settings');
  });
}

function setupSettings() {
  const themeToggle = document.getElementById('toggle-theme');
  const usernameInput = document.getElementById('input-username');
  const resetBtn = document.getElementById('btn-reset');

  if (themeToggle) {
    themeToggle.checked = appData.settings.theme === 'dark';
    themeToggle.addEventListener('change', () => {
      const newTheme = themeToggle.checked ? 'dark' : 'light';
      applyTheme(newTheme);
      showToast(`Tema ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado`, 'success');
    });
  }

  if (usernameInput) {
    usernameInput.value = appData.settings.username || '';
    usernameInput.addEventListener('input', () => {
      appData.settings.username = usernameInput.value;
      saveData(appData);
      updateUsernameDisplay();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm('¿Borrar todos los datos?');
      if (confirmed) {
        appData = resetData();
        applyTheme('light');
        renderHomeScreen();
        setupSettings();
        showToast('Datos reseteados', 'success');
      }
    });
  }
}

function updateUsernameDisplay() {
  const el = document.getElementById('home-username');
  if (el) {
    el.textContent = appData.settings.username
      ? `${getGreeting()}, ${appData.settings.username}`
      : getGreeting();
  }
}

function renderHomeScreen() {
  updateUsernameDisplay();
}

document.addEventListener('DOMContentLoaded', init);
