const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const statusDiv = document.getElementById('status');
const table = document.getElementById('results-table');
const tbody = table.querySelector('tbody');
const downloadBtn = document.getElementById('download-btn');
const chartContainer = document.getElementById('chart-container');
const chartCanvas = document.getElementById('summary-chart');

let currentChart = null; // Keep reference to destroy previous chart

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('hover'); });
dropZone.addEventListener('dragleave', e => { e.preventDefault(); dropZone.classList.remove('hover'); });
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('hover'); handleFile(e.dataTransfer.files[0]); });

function handleFile(file) {
  if (!file || file.type !== 'text/csv') {
    alert('Please upload a valid CSV file.');
    return;
  }

  // Reset UI completely
  statusDiv.textContent = '';
  table.style.display = 'none';
  tbody.innerHTML = '';
  downloadBtn.style.display = 'none';
  chartContainer.style.display = 'none';

  // Destroy previous chart if exists
  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }

  const formData = new FormData();
  formData.append('file', file);

  fetch('/upload', { method: 'POST', body: formData })
    .then(res => res.blob())
    .then(blob => {
      const reader = new FileReader();
      reader.onload = () => {
        // Normalize line endings and split
        const lines = reader.result.replace(/\r/g,'').split('\n').filter(l => l.trim());

        if (lines.length < 2) {
          statusDiv.textContent = 'Wrong data format: CSV must have "Domain" header and at least 1 domain.';
          return;
        }

        // Parse header
        const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim());
        const domainIndex = headers.findIndex(h => h.toLowerCase() === 'domain');

        if (domainIndex === -1) {
          statusDiv.textContent = 'Wrong data format: "Domain" header not found.';
          return;
        }

        const summary = { "Client On Gokwik":0, "Fastrr Link Found":0, "Fastrr Not Found":0, "Domain Unreachable":0 };
        let validDataExists = false;

        lines.slice(1).forEach(line => {
          const cols = line.split(',').map(c => c.replace(/"/g,'').trim());
          const domain = cols[domainIndex];
          const status = cols[1]?.trim(); // status column from server CSV

          if (!domain || !status) return;

          validDataExists = true;
          summary[status] = (summary[status]||0)+1;
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${domain}</td><td class="${status}">${status}</td>`;
          tbody.appendChild(tr);
        });

        if (!validDataExists) {
          statusDiv.textContent = 'Wrong data format: No valid domains found.';
          return;
        }

        // Show table and chart
        table.style.display = 'table';
        downloadBtn.style.display = 'inline-block';
        chartContainer.style.display = 'block';

        // Render pie chart
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

        // Download CSV button
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
      console.error(err); 
      statusDiv.textContent='Error processing file.';
    });
}
