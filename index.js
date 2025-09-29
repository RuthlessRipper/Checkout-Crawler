const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// List of domains to check (one per line in domains.txt)
const domains = fs.readFileSync('domains.txt', 'utf-8').split('\n').filter(Boolean);

// Target domains to check
const fastrDomain = 'fastrr-boost-ui.pickrr.com';
const gokwikDomain = 'pdp.gokwik.co';

// Prepare CSV output
let csvOutput = 'Domain, Status\n'; // CSV Header

// Function to check a single domain
async function checkDomain(domain) {
    // Remove whitespace and prepend protocol to the domain
    const sanitizedDomain = domain.trim();
    const fullUrl = `https://${sanitizedDomain}`;

    try {
        const response = await axios.get(fullUrl, { timeout: 10000 });
        const $ = cheerio.load(response.data);
        
        let status = '';
        
        // Check if the domain is the gokwik domain
        if (sanitizedDomain === gokwikDomain) {
            status = 'Client On Gokwik';
            console.log(`🔍 ${sanitizedDomain}: Client On Gokwik`);
        } else {
            // Check for gokwik links in entire document
            let hasGokwikLink = false;
            $('link, script').each((_, el) => {
                const href = $(el).attr('href') || $(el).attr('src') || '';
                if (href.includes('gokwik')) {
                    hasGokwikLink = true;
                    return false; // break the loop
                }
            });
            
            if (hasGokwikLink) {
                status = 'Client On Gokwik';
                console.log(`🔍 ${sanitizedDomain}: Client On Gokwik`);
            } else {
                // Check for fastrr domain in entire document
                let hasFastrrLink = false;
                $('link, script').each((_, el) => {
                    const href = $(el).attr('href') || $(el).attr('src') || '';
                    if (href.includes(fastrDomain)) {
                        hasFastrrLink = true;
                        return false; // break the loop
                    }
                });
                
                if (hasFastrrLink) {
                    status = 'Fastrr Link Found';
                    console.log(`✅ ${sanitizedDomain}: Fastrr Link Found`);
                } else {
                    status = 'Fastrr Not Found';
                    console.log(`❌ ${sanitizedDomain}: Fastrr Not Found`);
                }
            }
        }
        
        csvOutput += `${sanitizedDomain}, "${status}"\n`;

    } catch (error) {
        console.error(`⚠️ Error checking ${sanitizedDomain}: ${error.message}`);
        csvOutput += `${sanitizedDomain}, "Domain Unreachable"\n`;
    }
}

// Run checks for all domains
(async () => {
    for (const domain of domains) {
        await checkDomain(domain);
    }
    
    // Write CSV output to a file
    fs.writeFileSync('output.csv', csvOutput);
    console.log('Results written to output.csv');
})();