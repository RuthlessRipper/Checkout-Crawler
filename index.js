const express = require("express");
const multer = require("multer");
const fs = require("fs");
const csv = require("csv-parser");
const axios = require("axios");
const cheerio = require("cheerio");
const { Parser } = require("json2csv");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

const fastrDomain = "fastrr-boost-ui.pickrr.com";
const gokwikDomain = "pdp.gokwik.co";

// Serve static assets (CSS/JS)
app.use(express.static(path.join(__dirname, "public")));

// Serve the dashboard
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Handle CSV upload
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const domains = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
          // Accept header 'Domain' (case-sensitive). Trim and skip empty.
          if (row.Domain && row.Domain.toString().trim()) domains.push(row.Domain.toString().trim());
        })
        .on("end", resolve)
        .on("error", reject);
    });

    // Process domains sequentially (simple) - for many domains you may need batching
    const output = [];
    for (const domain of domains) {
      const status = await checkDomain(domain);
      output.push({ Domain: domain, Status: status });
    }

    // Convert to CSV and send as download
    const parser = new Parser({ fields: ["Domain", "Status"] });
    const csvData = parser.parse(output);

    // Cleanup uploaded file
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    res.header("Content-Type", "text/csv");
    res.attachment("output.csv");
    return res.send(csvData);
  } catch (err) {
    console.error("Upload processing error:", err);
    // Attempt to cleanup file if present
    try { if (req.file && req.file.path) fs.unlinkSync(req.file.path); } catch (e) {}
    return res.status(500).send("Server error processing file: " + err.message);
  }
});

// Domain checker
async function checkDomain(domain) {
  const fullUrl = `https://${domain}`;
  try {
    const response = await axios.get(fullUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);

    if (domain === gokwikDomain) return "Client On Gokwik";

    let hasGokwikLink = false;
    $("link, script").each((_, el) => {
      const href = $(el).attr("href") || $(el).attr("src") || "";
      if (href.includes("gokwik")) {
        hasGokwikLink = true;
        return false;
      }
    });
    if (hasGokwikLink) return "Client On Gokwik";

    let hasFastrrLink = false;
    $("link, script").each((_, el) => {
      const href = $(el).attr("href") || $(el).attr("src") || "";
      if (href.includes(fastrDomain)) {
        hasFastrrLink = true;
        return false;
      }
    });
    if (hasFastrrLink) return "Fastrr Link Found";

    return "Fastrr Not Found";
  } catch (e) {
    return "Domain Unreachable";
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
