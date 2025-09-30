const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const statusDiv = document.getElementById('status');
const timerDiv = document.getElementById('timer');
const table = document.getElementById('results-table');
const tbody = table.querySelector('tbody');
const downloadBtn = document.getElementById('download-btn');
const chartContainer = document.getElementById('chart-container');
const chartCanvas = document.getElementById('summary-chart');

let currentChart = null; // Keep reference to destroy previous chart
let timerInterval = null;
const PER_DOMAIN_MS = 1200; // Estimated ms per domain (tweak this)

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('hover'); });
dropZone.addEventListener('dragleave', e => { e.preventDefault(); dropZone.classList.remove('hover'); });
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('hover'); handleFile(e.dataTransfer.files[0]); });

function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function startTimer() {
  const start = Date.now();
  timerDiv.style.display = 'block';
  timerDiv.textContent = `Elapsed: 0s`;
  timerInterval = setInterval(() => {
    timerDiv.textContent = `Elapsed: ${formatMs(Date.now() - start)}`;
  }, 500);
  return () => {
    clearInterval(timerInterval);
    timerInterval = null;
    return Date.now() - start;
  };
}

function handleFile(file) {
  if (!file || file.type !== 'text/csv') {
    alert('Please upload a valid CSV file.');
    return;
  }

  // Reset UI completely
  statusDiv.textContent = '';
  timerDiv.style.display = 'none';
  timerDiv.textContent = '';
  table.style.display = 'none';
  tbody.innerHTML = '';
  downloadBtn.style.display = 'none';
  chartContainer.style.display = 'none';

  // Destroy previous chart if exists
  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }

  // Read file locally to count domains and validate header before upload
  const readerCount = new FileReader();
  readerCount.onload = () => {
    const text = readerCount.result.replace(/\r/g,'');
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      statusDiv.textContent = 'Wrong data format: CSV must have "Domain" header and at least 1 domain.';
      return;
    }

    const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim());
    const domainIndex = headers.findIndex(h => h.toLowerCase() === 'domain');
    if (domainIndex === -1) {
      statusDiv.textContent = 'Wrong data format: "Domain" header not found.';
      return;
    }

    // count non-empty domain rows
    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.replace(/"/g,'').trim());
      if (cols[domainIndex]) count++;
    }

    if (count === 0) {
      statusDiv.textContent = 'Wrong data format: No valid domains found.';
      return;
    }

    // Show estimate and start timer
    const estMs = Math.round(count * PER_DOMAIN_MS);
    statusDiv.innerHTML = `<div class="spinner"></div> Uploading and processing file...`;
    timerDiv.style.display = 'block';
    timerDiv.innerHTML = `Estimated: ${formatMs(estMs)} (based on ${count} domains at ${PER_DOMAIN_MS/1000}s/domain) • Elapsed: 0s`;

    // start elapsed timer and obtain stop function
    const stopTimer = startTimer();

    // Now perform the upload
    const formData = new FormData();
    formData.append('file', file);

    fetch('/upload', { method: 'POST', body: formData })
      .then(res => {
        if (!res.ok) throw new Error('Upload failed');
        return res.blob();
      })
      .then(blob => {
        // stop timer and show final time
        const totalMs = stopTimer();
        timerDiv.innerHTML = `Estimated: ${formatMs(estMs)} • Elapsed: ${formatMs(totalMs)} (completed)`;

        const reader = new FileReader();
        reader.onload = () => {
          // parse returned CSV (Domain,Status)
          const outLines = reader.result.replace(/\r/g,'').split('\n').filter(l => l.trim());
          if (outLines.length < 2) {
            statusDiv.textContent = 'Wrong data format: server returned invalid CSV.';
            return;
          }

          // parse header of returned CSV
          const outHeaders = outLines[0].split(',').map(h => h.replace(/"/g,'').trim());
          const domainIdxOut = outHeaders.findIndex(h => h.toLowerCase() === 'domain');
          const statusIdxOut = outHeaders.findIndex(h => h.toLowerCase() === 'status');
          if (domainIdxOut === -1 || statusIdxOut === -1) {
            statusDiv.textContent = 'Wrong data format: server CSV missing Domain/Status.';
            return;
          }

          const summary = { "Client On Gokwik":0, "Fastrr Link Found":0, "Fastrr Not Found":0, "Domain Unreachable":0 };
          let validDataExists = false;

          outLines.slice(1).forEach(line => {
            const cols = line.split(',').map(c => c.replace(/"/g,'').trim());
            const domain = cols[domainIdxOut];
            const status = cols[statusIdxOut];
            if (!domain || !status) return;
            validDataExists = true;
            summary[status] = (summary[status]||0)+1;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${domain}</td><td class="${status}">${status}</td>`;
            tbody.appendChild(tr);
          });

          if (!validDataExists) {
            statusDiv.textContent = 'Wrong data format: No valid domains found in server response.';
            return;
          }

          table.style.display = 'table';
          downloadBtn.style.display = 'inline-block';
          chartContainer.style.display = 'block';

          if (currentChart) currentChart.destroy();
          currentChart = new Chart(chartCanvas, {
            type: 'pie',
            data: {
              labels: Object.keys(summary),
              datasets: [{
                data: Object.values(summary),
                backgroundColor: ['#28a745','#ffc107','#f8d7da','#6c757d']
              }]
            },
            options: { responsive: true }
          });

          statusDiv.textContent = 'Processing complete!';

          downloadBtn.onclick = () => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download='output.csv';
            document.body.appendChild(a);
            a.click(); a.remove(); URL.revokeObjectURL(url);
          };
        };
        reader.readAsText(blob);
      })
      .catch(err => {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        console.error(err);
        statusDiv.textContent = 'Error processing file.';
        timerDiv.innerText = `Error after ${formatMs(0)}`;
      });
  };

  readerCount.onerror = () => {
    statusDiv.textContent = 'Unable to read file for estimate. Uploading without estimate...';
    // fallback: upload without estimate (start timer)
    const stopTimer = startTimer();
    statusDiv.innerHTML = `<div class="spinner"></div> Uploading and processing file...`;
    const formData = new FormData();
    formData.append('file', file);
    fetch('/upload', { method: 'POST', body: formData })
      .then(res => res.blob())
      .then(blob => {
        const totalMs = stopTimer();
        timerDiv.style.display = 'block';
        timerDiv.textContent = `Elapsed: ${formatMs(totalMs)}`;
        // (handle response as before if desired)
        statusDiv.textContent = 'Processing complete!';
      })
      .catch(e => {
        clearInterval(timerInterval);
        statusDiv.textContent = 'Error processing file.';
      });
  };

  readerCount.readAsText(file);
}
