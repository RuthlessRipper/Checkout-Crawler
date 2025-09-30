const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const statusDiv = document.getElementById("status");
const table = document.getElementById("results-table");
const tbody = table.querySelector("tbody");

// ===== Single Domain Check =====
document.getElementById("check-btn").addEventListener("click", () => {
  const domain = document.getElementById("domain-input").value.trim();
  if (!domain) return alert("Enter a domain first!");

  statusDiv.innerHTML = `<div class="spinner"></div> Checking ${domain}...`;

  fetch(`/check-single?domain=${encodeURIComponent(domain)}`)
    .then(res => res.json())
    .then(data => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${data.domain}</td><td>${data.status}</td>`;
      tbody.appendChild(row);
      table.style.display = "table";
      statusDiv.textContent = "Done ✅";
    })
    .catch(err => {
      statusDiv.textContent = `Error: ${err.message}`;
    });
});

// ===== CSV Upload =====
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
  statusDiv.innerHTML = `<div class="spinner"></div> Uploading ${file.name}...`;

  const formData = new FormData();
  formData.append("file", file);

  fetch("/upload", { method: "POST", body: formData })
    .then(res => res.blob())
    .then(blob => {
      statusDiv.textContent = "Processing complete!";

      tbody.innerHTML = "";
      table.style.display = "table";

      const reader = new FileReader();
      reader.onload = () => {
        const lines = reader.result.split("\n").filter(l => l.trim());
        lines.slice(1).forEach(line => {
          const [domain, status] = line.split(",");
          if (!domain || !status) return;
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${domain}</td><td>${status}</td>`;
          tbody.appendChild(tr);
        });
      };
      reader.readAsText(blob);

      // Enable download
      const downloadBtn = document.getElementById("download-btn");
      downloadBtn.style.display = "inline-block";
      downloadBtn.onclick = () => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "output.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      };
    })
    .catch(err => {
      statusDiv.textContent = `Error: ${err.message}`;
    });
}
