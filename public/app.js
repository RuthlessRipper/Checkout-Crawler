const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const statusDiv = document.getElementById('status');
const table = document.getElementById('results-table');
const tbody = table.querySelector('tbody');
const downloadBtn = document.getElementById('download-btn');
const chartContainer = document.getElementById('chart-container');
const chartCanvas = document.getElementById('summary-chart');

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

  // Reset UI
  statusDiv.textContent = '';
  table.style.display = 'none';
  downloadBtn.style.display = 'none';
  chartContainer.style.display = 'none';
  tbody.innerHTML = '';

  const formData = new FormData();
  formData.append('file', file);

  fetch('/upload', { method: 'POST', body: formData })
    .then(res => res.blob())
    .then(blob => {
      statusDiv.textContent = 'Processing complete!';

      const reader = new FileReader();
      reader.onload = () => {
        const lines = reader.result.split('\n').filter(l => l.trim());
        const summary = { "Client On Gokwik":0, "Fastrr Link Found":0, "Fastrr Not Found":0, "Domain Unreachable":0 };

        lines.forEach((line,index) => {
          if (index === 0) return; // skip header
          const [domain, status] = line.split(',');
          if (!status) return;
          summary[status] = (summary[status]||0)+1;
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${domain}</td><td class="${status}">${status}</td>`;
          tbody.appendChild(tr);
        });

        table.style.display = 'table';
        downloadBtn.style.display = 'inline-block';

        chartContainer.style.display = 'block';
        new Chart(chartCanvas, {
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
      };
      reader.readAsText(blob);

      downloadBtn.onclick = () => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download='output.csv';
        document.body.appendChild(a);
        a.click(); a.remove(); URL.revokeObjectURL(url);
      };
    })
    .catch(err => {
      console.error(err); 
      statusDiv.textContent='Error processing file.';
    });
}
