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
      row.innerHTML = `<td>${data.domain}</td><td class="${data.status}">${data.status}</td>`;
      document.querySelector("#results-table tbody").appendChild(row);
      document.getElementById("results-table").style.display = "table";
      statusDiv.textContent = "Done ✅";

      updateChart([{ domain: data.domain, status: data.status }]);
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
  formData.append("file", file);

  fetch("/upload", { method: "POST", body: formData })
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#results-table tbody");
      tbody.innerHTML = "";
      data.results.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${row.Domain}</td><td class="${row.Status}">${row.Status}</td>`;
        tbody.appendChild(tr);
      });
      document.getElementById("results-table").style.display = "table";
      statusDiv.textContent = `✅ Processed ${data.results.length} domains`;

      updateChart(data.results);
    })
    .catch(err => {
      statusDiv.textContent = `Error: ${err.message}`;
    });
}

// ===== Chart.js Summary =====
let chart;
function updateChart(results) {
  // initialize all possible statuses
  const counts = {
    "Client On Gokwik": 0,
    "Fastrr Link Found": 0,
    "Fastrr Not Found": 0,
    "Domain Unreachable": 0
  };

  results.forEach(row => {
    const status = row.Status || row.status;
    if (counts.hasOwnProperty(status)) counts[status]++;
  });

  const labels = Object.keys(counts);
  const values = Object.values(counts);

  const ctx = document.getElementById("summary-chart").getContext("2d");
  document.getElementById("chart-container").style.display = "block";

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{ 
        data: values, 
        backgroundColor: ["#28a745", "#ffc107", "#f8d7da", "#6c757d"] 
      }]
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });
}
