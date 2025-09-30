const express = require("express");
const multer = require("multer");
const csvParser = require("csv-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));

// Dummy domain check logic (replace with your crawler later)
function checkDomain(domain) {
  return Math.random() > 0.3 ? "Active ✅" : "Not Reachable ❌";
}

// Single domain check (API)
app.get("/check-single", (req, res) => {
  const domain = req.query.domain;
  if (!domain) {
    return res.status(400).json({ error: "No domain provided" });
  }
  res.json({ domain, status: checkDomain(domain) });
});

// CSV upload (API)
app.post("/upload", upload.single("csvFile"), (req, res) => {
  const results = [];
  const filePath = req.file.path;

  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on("data", (row) => {
      if (row.Domain) {
        results.push({ domain: row.Domain, status: checkDomain(row.Domain) });
      }
    })
    .on("end", () => {
      fs.unlinkSync(filePath);
      if (results.length === 0) {
        return res.status(400).json({ error: "CSV must contain 'Domain' column" });
      }
      res.json({ results });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
