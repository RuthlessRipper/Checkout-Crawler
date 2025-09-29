const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
app.use(express.json());

const fastrDomain = "fastrr-boost-ui.pickrr.com";
const gokwikDomain = "pdp.gokwik.co";

// Function to check a single domain
async function checkDomain(domain) {
  const sanitizedDomain = domain.trim();
  const fullUrl = `https://${sanitizedDomain}`;

  try {
    const response = await axios.get(fullUrl, { timeout: 10000 });
    const $ = cheerio.load(response.data);

    // Case 1: Direct match to gokwik
    if (sanitizedDomain === gokwikDomain) {
      return "Client On Gokwik";
    }

    // Case 2: Look for gokwik references
    let hasGokwikLink = false;
    $("link, script").each((_, el) => {
      const href = $(el).attr("href") || $(el).attr("src") || "";
      if (href.includes("gokwik")) {
        hasGokwikLink = true;
        return false;
      }
    });
    if (hasGokwikLink) {
      return "Client On Gokwik";
    }

    // Case 3: Look for fastrr references
    let hasFastrrLink = false;
    $("link, script").each((_, el) => {
      const href = $(el).attr("href") || $(el).attr("src") || "";
      if (href.includes(fastrDomain)) {
        hasFastrrLink = true;
        return false;
      }
    });
    if (hasFastrrLink) {
      return "Fastrr Link Found";
    }

    return "Fastrr Not Found";
  } catch (err) {
    return "Domain Unreachable";
  }
}

// Home route
app.get("/", (req, res) => {
  res.send("✅ Crawler API is running. Use /crawl?domain=example.com");
});

// Single domain check
app.get("/crawl", async (req, res) => {
  const domain = req.query.domain;
  if (!domain) {
    return res
      .status(400)
      .json({ error: "Please provide a domain, e.g. /crawl?domain=example.com" });
  }

  const status = await checkDomain(domain);
  res.json({ domain, status });
});

// Multi-domain check (send JSON body with { "domains": ["a.com", "b.com"] })
app.post("/crawl-multi", async (req, res) => {
  const domains = req.body.domains;
  if (!domains || !Array.isArray(domains)) {
    return res.status(400).json({ error: "Please send { domains: [..] }" });
  }

  const results = [];
  for (const d of domains) {
    const status = await checkDomain(d);
    results.push({ domain: d, status });
  }
  res.json(results);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
