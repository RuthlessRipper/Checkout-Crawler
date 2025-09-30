// ===== Single domain check =====
document.getElementById("check-btn").addEventListener("click", () => {
  const domain = document.getElementById("domain-input").value.trim();
  if (!domain) return alert("Enter a domain first!");

  const statusDiv = document.getElementById("status");
  statusDiv.textContent = `Checking ${domain}...`;

  fetch(`/check-single?domain=${encodeURIComponent(domain)}`)
    .then(res => res.json())
    .then(data => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${data.domain}</td><td>${data.status}</td>`;
      document.querySelector("#results-table tbody").appendChild(row);
      document.getElementById("results-table").style.display = "table";
      statusDiv.textContent = "Done ✅";
    })
    .catch(err => {
      statusDiv.textContent = `Error: ${err.message}`;
    });
});

// ===== CSV Upload =====
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("hover"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("hover"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("hover");
  uploadFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", e => uploadFile(e.target.files[0]));

function uploadFile(file) {
  if (!file) return;
  const statusDiv = document.getElementById("status");
  statusDiv.textContent = `Uploading ${file.name}...`;

  const formData = new FormData();
  formData.append("csvFile", file);

  fetch("/upload", { method: "POST", body: formData })
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#results-table tbody");
      tbody.innerHTML = "";
      data.results.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${row.domain}</td><td>${row.status}</td>`;
        tbody.appendChild(tr);
      });
      document.getElementById("results-table").style.display = "table";
      statusDiv.textContent = `✅ Processed ${data.results.length} domains`;
    })
    .catch(err => {
      statusDiv.textContent = `Error: ${err.message}`;
    });
}
