// app.js - Firebase-enabled version
// IMPORTANT: Replace the firebaseConfig object below with your Firebase project's config.
// You can get this from Firebase Console -> Project Settings -> SDK setup and configuration.
/*
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};
*/

// --- Admin password (simple front-end protection) ---
const ADMIN_USER = "sharun";
const ADMIN_PASSWORD = "adminlgsharun123"; // change this if needed

// Initialize Firebase - will be done after user replaces config
function initFirebase(firebaseConfig) {
  if(!firebaseConfig) {
    console.warn("Firebase config not provided. Real-time syncing will not work until you add your config in app.js.");
    return null;
  }
  try {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    return db;
  } catch (err) {
    console.error("Firebase initialization error:", err);
    return null;
  }
}

// --- UI helpers ---
function $(id){ return document.getElementById(id); }

function showAdminPanel() {
  const admin = $("adminPanel");
  if(admin) admin.style.display = "block";
}

function hideAdminPanel() {
  const admin = $("adminPanel");
  if(admin) admin.style.display = "none";
}

// --- Rendering ---
// --- Backend integration (Render) ---
const BACKEND_BASE = window.BACKEND_BASE || ''; // set to your site root or full URL in production

async function fetchIdsFromBackend() {
  try {
    const res = await fetch(BACKEND_BASE + '/api/ids');
    if(!res.ok) throw new Error('Failed to fetch ids: ' + res.status);
    const data = await res.json();
    renderList(data);
  } catch (err) {
    console.error('Error fetching ids from backend', err);
  }
}

async function addInstagramIDToBackend(username) {
  try {
    // prompt admin credentials for Basic Auth only at the time of adding
    const user = window.ADMIN_USER || 'sharun';
    const pass = window.ADMIN_PASS || null;
    let authHeader = null;
    if(!pass) {
      // ask for password at runtime (but since our flow already validated admin, reuse that info)
      const p = prompt('Enter admin password to confirm add:');
      if(!p) return alert('Action cancelled');
      authHeader = 'Basic ' + btoa(user + ':' + p);
    } else {
      authHeader = 'Basic ' + btoa(user + ':' + pass);
    }
    const res = await fetch(BACKEND_BASE + '/api/ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({ username })
    });
    if(!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.error || ('Status ' + res.status));
    }
    const added = await res.json();
    // refresh list
    await fetchIdsFromBackend();
    return added;
  } catch (err) {
    console.error('Add to backend failed', err);
    alert('Add failed: ' + err.message);
  }
}


function renderList(docs) {
  const list = $("currentList");
  list.innerHTML = "";
  docs.forEach(doc => {
    const data = doc.data ? doc.data() : doc; // support array input
    const li = document.createElement("li");
    li.className = "flex items-center space-x-4 p-2 bg-white rounded shadow-sm";
    const username = data.username || data.id || data.name || "unknown";
    // find local image: images/{username}.svg, fallback to images/user1.svg
    const img = document.createElement("img");
    const possible = `images/${username}.svg`;
    // Only set src; browser will handle 404 if file missing
    img.src = possible;
    img.alt = username;
    img.width = 40;
    img.height = 40;
    img.className = "rounded-full";
    const span = document.createElement("span");
    span.textContent = username;
    li.appendChild(img);
    li.appendChild(span);
    list.appendChild(li);
  });
}

// --- Firestore integration ---
let db = null;
let unsubscribe = null;

function startListening() {
  if(!db) {
    console.warn("Firestore not initialized; cannot listen for updates.");
    return;
  }
  // Listen to collection 'ids' ordered by addedAt
  unsubscribe = db.collection("ids").orderBy("addedAt").onSnapshot(snapshot => {
    renderList(snapshot.docs);
  }, err => {
    console.error("Listen error:", err);
  });
}

function stopListening() {
  if(unsubscribe) unsubscribe();
}

// --- Admin actions ---
// Attempt to fetch Instagram profile picture unofficially (no token).
// This may be blocked by CORS in browsers. If blocked, the function returns null and the app falls back to local images.
async function fetchInstagramPic(username) {
  try {
    const url = `https://www.instagram.com/${encodeURIComponent(username)}/?__a=1&__d=dis`;
    const res = await fetch(url, {mode: 'cors'});
    if(!res.ok) throw new Error('Network response not ok: ' + res.status);
    const data = await res.json();
    // try common paths for profile pic
    const pic = data?.graphql?.user?.profile_pic_url_hd || data?.user?.profile_pic_url_hd || null;
    return pic;
  } catch (err) {
    console.warn('Could not fetch Instagram data for', username, err);
    // Try a fallback: fetch page HTML and attempt to extract from window._sharedData or JSON
    try {
      const htmlRes = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {mode:'cors'});
      const text = await htmlRes.text();
      // look for "profile_pic_url_hd":"..."
      const m = text.match(/profile_pic_url_hd\":"([^"]+)"/);
      if(m && m[1]) {
        // unescape
        return m[1].replace(/\\u0026/g, '&');
      }
    } catch (err2) {
      console.warn('HTML fallback failed', err2);
    }
    return null;
  }
}

function addInstagramID(username) {
  if(!db) {
    alert("Database not initialized. Please add your Firebase config into app.js.");
    return;
  }
  if(!username) return;
  (async () => {
    let pic = null;
    try {
      pic = await fetchInstagramPic(username.trim());
    } catch(e) {
      console.warn('fetchInstagramPic error', e);
    }
    const payload = {
      username: username.trim(),
      addedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if(pic) payload.profilePicUrl = pic;
    db.collection("ids").add(payload).then(() => {
      $("newId").value = "";
    }).catch(err => {
      console.error("Write error:", err);
      alert("Could not add ID. Check console for details.");
    });
  })();
}

// --- DOM wiring ---

document.addEventListener("DOMContentLoaded", () => {
  // wire Admin button with password prompt
  const openBtn = $("openAdmin");
  if(openBtn) {
    openBtn.addEventListener("click", () => {
  const user = prompt("Admin Username:");
  if(user !== ADMIN_USER) return alert("Access Denied");
  const p = prompt("Admin Password:");
  if(p !== ADMIN_PASSWORD) return alert("Access Denied");

      const p = prompt("Enter Admin Password");
      if(p !== ADMIN_PASSWORD) return alert("Access Denied");
      showAdminPanel();
    });
  }

  const adminForm = $("addForm");
  if(adminForm) {
    adminForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = $("newId").value;
      if(!username) return alert("Enter an Instagram ID.");
      addInstagramIDToBackend(username);
    });
  }

  // Attempt to initialize Firebase using a `firebaseConfig` object if provided in window scope.
  // This allows you to paste your firebaseConfig into this file (above) manually.
  try {
    // firebase removed
      db = initFirebase(window.firebaseConfig);
      fetchIdsFromBackend();
    } else {
      console.info("No firebaseConfig found on window. To enable syncing, set window.firebaseConfig or replace the placeholder in app.js.");
    }
  } catch (err) {
    console.error(err);
  }

  // fallback: if firebase not configured, show a message in the console and render local static list if present
  if(!db) {
    // Try to load any static HTML list items already present
    const staticItems = Array.from(document.querySelectorAll("#currentList li")).map(li => {
      const text = li.textContent.trim();
      return { username: text };
    });
    if(staticItems.length) renderList(staticItems);
  }
});
