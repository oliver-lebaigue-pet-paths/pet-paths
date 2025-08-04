import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase, ref, push, onChildAdded, update, child, get, set
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

window.addEventListener('DOMContentLoaded', () => {
  // --- Firebase init ---
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCtpIJvKHY3x_8x7_m-0QtUMIQ0Gj2blRQ",
    authDomain: "dog-walk-reg.firebaseapp.com",
    databaseURL: "https://dog-walk-reg-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "dog-walk-reg",
    storageBucket: "dog-walk-reg.firebasestorage.app",
    messagingSenderId: "806193788108",
    appId: "1:806193788108:web:ac6df92dd5800bd74a3e69",
     measurementId: "G-9Y7PYSP8NP"
    };
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const statusRef = ref(db, 'narberthDogWalkStatuses');
  const accountsRef = ref(db, 'accounts');

  // --- Walk status submission ---
  const walkForm = document.getElementById('walkForm');
  const statusListEl = document.getElementById('statusList');
  const emptyStateEl = document.getElementById('emptyState');
  const loadingSpinner = document.getElementById('loadingSpinner');
  let currentFilter = 'all';

  walkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingSpinner.style.display = 'block';

    const data = {
      dogName: document.getElementById('dogName').value.trim(),
      dogBreed: document.getElementById('dogBreed').value.trim(),
      status: document.getElementById('walkingStatus').value,
      location: document.getElementById('location').value.trim(),
      time: document.getElementById('walkTime').value,
      dogStatus: document.getElementById('dogStatus').value,
      safety: document.getElementById('safetyOptions').value,
      notes: document.getElementById('otherNotes').value.trim(),
      thanks: 0,
      timestamp: Date.now()
    };

    try {
      await push(statusRef, data);
      walkForm.reset();
      showNotification("Status submitted successfully!");
    } catch (err) {
      console.error('Error submitting status:', err);
      showNotification("Error submitting status. Please try again.");
    } finally {
      loadingSpinner.style.display = 'none';
    }
  });

  // --- Create a status card ---
  function createStatusElement(key, data) {
    const el = document.createElement('div');
    el.className = 'status-entry';
    el.dataset.status = data.status.toLowerCase();
    el.dataset.dogStatus = data.dogStatus.toLowerCase();

    el.innerHTML = `
      <div>
        <h3>${data.dogName} <span class="badge">${data.dogBreed}</span></h3>
        <p><strong><i class="${getStatusIcon(data.status)}"></i> Status:</strong> ${data.status}</p>
        <p><strong><i class="fas fa-map-marker-alt"></i> Location:</strong> ${data.location}</p>
        <p><strong><i class="far fa-clock"></i> Time:</strong> ${data.time}</p>
        <p><strong><i class="fas fa-dog"></i> Dog:</strong> ${data.dogName} (${data.dogBreed}) – ${data.dogStatus}</p>
        <p><strong><i class="fas fa-shield-alt"></i> Safety:</strong> ${data.safety}</p>
        ${data.notes ? `<p><strong><i class="fas fa-sticky-note"></i> Notes:</strong> ${data.notes}</p>` : ''}
        <button class="thanks-btn" data-key="${key}">
          👍 <span class="thanks-count">${data.thanks}</span>
        </button>
      </div>
    `;
    return el;
  }

  function getStatusIcon(status) {
    switch (status.toLowerCase()) {
      case 'walking': return 'fas fa-walking';
      case 'not walking': return 'fas fa-home';
      case 'planning to walk': return 'fas fa-clock';
      default: return 'fas fa-paw';
    }
  }

  // --- Listen for new statuses ---
  onChildAdded(statusRef, snapshot => {
    const data = snapshot.val(), key = snapshot.key;
    const el = createStatusElement(key, data);
    statusListEl.prepend(el); // This adds new status at the top
    applyFilter();
  });

  // --- Thanks button handler ---
  statusListEl.addEventListener('click', e => {
    if (!e.target.closest('.thanks-btn')) return;
    const btn = e.target.closest('.thanks-btn');
    const key = btn.dataset.key;
    const span = btn.querySelector('.thanks-count');
    const newCount = parseInt(span.textContent) + 1;
    update(child(statusRef, key), { thanks: newCount });
  });

  // --- Filters ---
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter.toLowerCase();
      applyFilter();
    });
  });

  function applyFilter() {
    [...statusListEl.children].forEach(el => {
      const match = currentFilter === 'all'
        || el.dataset.status === currentFilter
        || el.dataset.dogStatus.includes(currentFilter);
      el.style.display = match ? 'block' : 'none';
    });
    emptyStateEl.classList.toggle('hidden',
      [...statusListEl.children].some(e => e.style.display !== 'none'));
  }

  // --- Notification helper ---
  function showNotification(msg) {
    const notif = document.getElementById('notification');
    document.getElementById('notifText').textContent = msg;
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 3000);
  }

  // --- Registration ---
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('regUsername').value.trim();
      const password = document.getElementById('regPassword').value;
      if (!username || !password) return showNotification("Username and password required.");

      // Check if username exists
      const snapshot = await get(child(accountsRef, username));
      if (snapshot.exists()) {
        showNotification("Username already taken.");
        return;
      }
      await set(child(accountsRef, username), { username, password });
      showNotification("Account created! You can now sign in.");
      registerForm.reset();
    });
  }

  // --- Login ---
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;
      if (!username || !password) return showNotification("Username and password required.");

      const snapshot = await get(child(accountsRef, username));
      if (!snapshot.exists() || snapshot.val().password !== password) {
        showNotification("Invalid username or password.");
        return;
      }
      showNotification(`Welcome, ${username}!`);
      // You can store username in localStorage/sessionStorage for session management
      localStorage.setItem('dogWalkUser', username);
      loginForm.reset();
    });
  }

  // --- Authentication Modal ---
  const authModal = document.getElementById('authModal');
  const openAuthModalBtn = document.getElementById('openAuthModal');
  const closeAuthModalBtn = document.getElementById('closeAuthModal');

  openAuthModalBtn.addEventListener('click', () => {
    authModal.classList.remove('hidden');
  });
  closeAuthModalBtn.addEventListener('click', () => {
    authModal.classList.add('hidden');
  });
  window.addEventListener('click', (e) => {
    if (e.target === authModal) authModal.classList.add('hidden');
  });
});