// ===== Single domain check =====
document.getElementById("check-btn").addEventListener("click", () => {
  const domain = document.getElementById("domain-input").value.trim();
  const statusDiv = document.getElementById("status");

  if (!domain) {
    statusDiv.textContent = "⚠️ Enter a domain first!";
    return;
  }

  statusDiv.textContent = `Checking ${domain}...`;

  fetch(`/check-domain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        statusDiv.textContent = `Error: ${data.error}`;
        return;
      }

      // Clear old results
      const tbody = document.querySelector("#results-table tbody");
      tbody.innerHTML = "";

      const row = document.createElement("tr");
      row.innerHTML = `<td>${data.Domain}</td><td>${data.Status}</td>`;
      tbody.appendChild(row);

      document.getElementById("results-table").style.display = "table";
      statusDiv.textContent = "✅ Done";
    })
    .catch(err => {
      statusDiv.textContent = `Error: ${err.message}`;
    });
});

// ===== CSV Upload =====
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.classList.add("hover");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("hover"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("hover");
  uploadFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", e => uploadFile(e.target.files[0]));

function uploadFile(file) {
  const statusDiv = document.getElementById("status");
  if (!file) return;

  statusDiv.textContent = `Uploading ${file.name}...`;

  const formData = new FormData();
  formData.append("file", file); // backend expects "file", not "csvFile"

  fetch("/upload", { method: "POST", body: formData })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        statusDiv.textContent = `⚠️ ${data.error}`;
        return;
      }

      // Clear old results
      const tbody = document.querySelector("#results-table tbody");
      tbody.innerHTML = "";

      data.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${row.Domain}</td><td>${row.Status}</td>`;
        tbody.appendChild(tr);
      });

      document.getElementById("results-table").style.display = "table";
      statusDiv.textContent = `✅ Processed ${data.length} domains`;
    })
    .catch(err => {
      statusDiv.textContent = `Error: ${err.message}`;
    });
}
