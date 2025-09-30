// ==================== SINGLE DOMAIN CHECK =====================
document.getElementById("check-btn").addEventListener("click", () => {
  const domain = document.getElementById("domain-input").value.trim();
  if (!domain) {
    alert("⚠️ Please enter a domain first!");
    return;
  }

  const statusDiv = document.getElementById("status");
  statusDiv.innerHTML = `<div class="spinner"></div> Checking <b>${domain}</b>...`;
  const startTime = Date.now();

  fetch(`/check-single?domain=${encodeURIComponent(domain)}`)
    .then(res => res.json())
    .then(data => {
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      const row = document.createElement("tr");
      row.innerHTML = `<td>${domain}</td>
                       <td>${data.status} (Processed in ${duration}s)</td>`;

      document.querySelector("#results-table tbody").appendChild(row);
      document.getElementById("results-table").style.display = "table";
      statusDiv.innerHTML = `✅ Done! Processed in ${duration} seconds.`;
    })
    .catch(err => {
      statusDiv.innerHTML = `❌ Error: ${err.message}`;
    });
});

// ==================== CSV UPLOAD HANDLER =====================
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");

dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("hover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("hover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("hover");
  const file = e.dataTransfer.files[0];
  uploadFile(file);
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  uploadFile(file);
});

function uploadFile(file) {
  if (!file) return;
  const statusDiv = document.getElementById("status");
  statusDiv.innerHTML = `<div class="spinner"></div> Uploading ${file.name}...`;

  const formData = new FormData();
  formData.append("csvFile", file);

  const startTime = Date.now();

  fetch("/upload", { method: "POST", body: formData })
    .then(res => res.json())
    .then(data => {
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      const tbody = document.querySelector("#results-table tbody");
      tbody.innerHTML = "";

      data.results.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${row.domain}</td><td>${row.status}</td>`;
        tbody.appendChild(tr);
      });

      document.getElementById("results-table").style.display = "table";
      statusDiv.innerHTML = `✅ Done! Processed ${data.results.length} domains in ${duration} seconds.`;
    })
    .catch(err => {
      statusDiv.innerHTML = `❌ Error: ${err.message}`;
    });
}
