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

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Upload CSV
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const domains = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
          if (row.Domain && row.Domain.toString().trim()) {
            domains.push(row.Domain.toString().trim());
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (!domains.length) {
      return res.status(400).json({ error: "Wrong data format. CSV must have a 'Domain' header." });
    }

    const output = [];
    for (const domain of domains) {
      const status = await checkDomain(domain);
      output.push({ Domain: domain, Status: status });
    }

    res.json(output);
    fs.unlinkSync(req.file.path);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Single domain check
app.post("/check-domain", async (req, res) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: "Domain is required" });
  const status = await checkDomain(domain);
  res.json({ Domain: domain, Status: status });
});

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
  } catch {
    return "Domain Unreachable";
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
