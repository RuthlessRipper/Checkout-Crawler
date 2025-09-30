const express = require("express");
const multer = require("multer");
const fs = require("fs");
const csv = require("csv-parser");
const { Parser } = require("json2csv");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

// Serve static frontend (public folder with index.html, app.js, style.css)
app.use(express.static(path.join(__dirname, "public")));

// --- Single Domain Check ---
app.get("/check-single", (req, res) => {
  const domain = req.query.domain;
  if (!domain) {
    return res.status(400).json({ error: "No domain provided" });
  }

  // Dummy logic (replace with your crawler logic)
  let status = "Fastrr Not Found";
  if (domain.includes("amazon")) status = "Client On Gokwik";
  else if (domain.includes("google")) status = "Domain Unreachable";
  else if (domain.includes("shiprocket")) status = "Fastrr Link Found";

  res.json({ domain, status });
});

// --- CSV Upload ---
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded");
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => {
      if (!row.Domain) return;
      const domain = row.Domain.trim();
      if (!domain) return;

      // Dummy logic (replace with your crawler logic)
      let status = "Fastrr Not Found";
      if (domain.includes("amazon")) status = "Client On Gokwik";
      else if (domain.includes("google")) status = "Domain Unreachable";
      else if (domain.includes("shiprocket")) status = "Fastrr Link Found";

      results.push({ domain, status });
    })
    .on("end", () => {
      fs.unlinkSync(req.file.path); // cleanup upload

      const fields = ["Domain", "Status"];
      const parser = new Parser({ fields });
      const csvOut = parser.parse(
        results.map((r) => ({ Domain: r.domain, Status: r.status }))
      );

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=output.csv");
      res.send(csvOut);
    });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
