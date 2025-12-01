//----------------------------------------------//
// CONFIG (EDIT IF NEEDED)
//----------------------------------------------//
const BACKEND_BASE = "https://instagram-id-views.onrender.com"; // your backend URL
const ADMIN_USER = "sharun";
const ADMIN_PASSWORD = "adminlgsharun123";

//----------------------------------------------//
// SHORT SELECTOR
//----------------------------------------------//
const $ = (id) => document.getElementById(id);

//----------------------------------------------//
// LOAD INSTAGRAM IDS FROM BACKEND
//----------------------------------------------//
async function fetchIdsFromBackend() {
  const box = $("currentList");
  box.innerHTML = "<p style='color:gray;'>Loading...</p>";

  try {
    const req = await fetch(`${BACKEND_BASE}/api/ids`);
    const list = await req.json();

    if (!Array.isArray(list)) {
      box.innerHTML = "<p style='color:orange;'>No data returned.</p>";
      return;
    }

    box.innerHTML = ""; // clear

    list.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `
       <img src="${item.profilePicUrl || "default.png"}" height="50">
       <span>${item.username}</span>
      `;
      box.appendChild(li);
    });

  } catch (e) {
    box.innerHTML = "<p style='color:red;'>Backend Offline ❌</p>";
  }
}

//----------------------------------------------//
// ADD NEW ID (ADMIN ONLY)
//----------------------------------------------//
async function addInstagramIDToBackend(username) {
  const auth = btoa(`${ADMIN_USER}:${ADMIN_PASSWORD}`);

  let req = await fetch(`${BACKEND_BASE}/api/ids`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username })
  });

  let res = await req.json();

  if (res?.error) return alert("❌ " + res.error);

  alert("ID Added Successfully ✔");
