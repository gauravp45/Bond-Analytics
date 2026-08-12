#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  BondCalc — Unified Database Updater (Phase 2)
 *  Fetches from NSE, BSE, and parses NSDL Master CSV.
 *  Run: node update_bonds_v2.js
 * ═══════════════════════════════════════════════════════════════
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUTPUT_FILE = path.join(__dirname, 'bonds_database.js');
const LOG_PREFIX = '\x1b[36m[BondCalc]\x1b[0m';

function log(msg)  { console.log(`${LOG_PREFIX} ${msg}`); }
function warn(msg) { console.log(`${LOG_PREFIX} \x1b[33m⚠ ${msg}\x1b[0m`); }
function ok(msg)   { console.log(`${LOG_PREFIX} \x1b[32m✔ ${msg}\x1b[0m`); }
function fail(msg) { console.log(`${LOG_PREFIX} \x1b[31m✘ ${msg}\x1b[0m`); }

// ── Browser-like headers (required to bypass NSE Cloudflare) ────────
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
};

const API_HEADERS = {
  'User-Agent': BROWSER_HEADERS['User-Agent'],
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.nseindia.com/market-data/bonds-traded-in-capital-market',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'Connection': 'keep-alive',
};

// ── HTTP Request Helper ─────────────────────────────────────────────
function makeRequest(url, headers = {}, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Host': urlObj.hostname,
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let loc = res.headers.location;
        if (loc.startsWith('/')) loc = `https://${urlObj.hostname}${loc}`;
        res.resume();
        return resolve(makeRequest(loc, headers, timeout));
      }

      // Extract cookies
      const setCookies = (res.headers['set-cookie'] || [])
        .map(c => c.split(';')[0])
        .join('; ');

      // Handle compressed responses
      let stream = res;
      const enc = res.headers['content-encoding'];
      if (enc === 'gzip') stream = res.pipe(zlib.createGunzip());
      else if (enc === 'br') stream = res.pipe(zlib.createBrotliDecompress());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());

      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        resolve({ status: res.statusCode, headers: res.headers, cookies: setCookies, body });
      });
      stream.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(timeout, () => req.destroy(new Error('Request timed out')));
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── NSE Data Fetcher ────────────────────────────────────────────────
async function fetchNSESession() {
  log('Establishing session with NSE India...');
  const res = await makeRequest('https://www.nseindia.com', BROWSER_HEADERS);

  if (!res.cookies) throw new Error('No session cookies received');
  ok(`Session established (cookies: ${res.cookies.length > 0 ? 'yes' : 'no'})`);
  return res.cookies;
}

async function fetchNSEBonds(cookies) {
  const endpoints = [
    { name: 'Corporate Bonds', url: 'https://www.nseindia.com/api/liveBonds-traded-in-capital-market' },
    { name: 'Govt Securities', url: 'https://www.nseindia.com/api/liveEquity?index=SOVEREIGN%20GOLD%20BOND' },
  ];

  const allBonds = [];

  for (const ep of endpoints) {
    try {
      log(`Fetching ${ep.name}...`);
      await sleep(1500); // Rate limiting

      const headers = { ...API_HEADERS, 'Cookie': cookies };
      const res = await makeRequest(ep.url, headers);

      if (res.status !== 200) {
        warn(`${ep.name}: HTTP ${res.status}`);
        continue;
      }

      const data = JSON.parse(res.body);
      const items = data.data || data || [];
      ok(`${ep.name}: ${items.length} instruments found`);

      for (const item of items) {
        const bond = mapNSEBond(item, ep.name);
        if (bond && bond.isin) allBonds.push(bond);
      }
    } catch (e) {
      warn(`${ep.name} failed: ${e.message}`);
    }
  }

  return allBonds;
}

function mapNSEBond(item, source) {
  // NSE returns different formats for different endpoints
  const isin = item.meta?.isin || item.isin || item.isinCode || '';
  if (!isin || !isin.startsWith('IN')) return null;

  const name = item.meta?.companyName || item.symbol || item.meta?.symbol || '';
  const fv = parseFloat(item.meta?.faceValue || item.faceValue || 0);
  const coupon = parseFloat(item.meta?.couponRate || item.couponRate || 0);
  const maturity = item.meta?.maturityDate || item.maturityDate || '';
  const issue = item.meta?.issueDate || item.issueDate || '';
  const rating = item.meta?.creditRating || item.creditRating || '';
  const ltp = parseFloat(item.ltP || item.lastPrice || 0);
  const ytm = parseFloat(item.yld || item.ytm || 0);

  // Determine bond type from source/name
  let bondType = 'Corporate';
  const n = name.toUpperCase();
  if (n.includes('GOI') || n.includes('GOVERNMENT') || n.includes('GS ') || n.includes('G-SEC')) bondType = 'G-Sec';
  else if (n.includes('SDL') || n.includes('STATE DEV')) bondType = 'SDL';
  else if (n.includes('T-BILL') || n.includes('TBILL')) bondType = 'T-Bill';

  // Guess frequency from name or coupon structure
  let frequency = 'Semi-Annual'; // Default for most Indian bonds
  if (bondType === 'G-Sec' || bondType === 'SDL') frequency = 'Semi-Annual';
  if (n.includes('MONTHLY')) frequency = 'Monthly';
  if (n.includes('QUARTERLY') || n.includes('QTR')) frequency = 'Quarterly';
  if (n.includes('ANNUAL') && !n.includes('SEMI')) frequency = 'Annual';
  if (coupon === 0) frequency = 'Zero Coupon';

  return {
    isin,
    last4: isin.slice(-4),
    name,
    issuer: name.split(/\s+(?:SR|SERIES|NCD|BD|BOND)/i)[0]?.trim() || name,
    faceValue: fv || 1000,
    couponRate: coupon,
    maturityDate: maturity,
    issueDate: issue,
    frequency,
    rating,
    bondType,
    lastPrice: ltp || null,
    ytm: ytm || null,
  };
}

// ── Sample Bond Database (Fallback) ─────────────────────────────────
function getSampleBonds() {
  return [
    // ─── GOVERNMENT SECURITIES ───
    { isin:'INE002A08286', last4:'8286', name:'7.18% GS 2033', issuer:'GOI', faceValue:100, couponRate:7.18, maturityDate:'2033-08-14', issueDate:'2023-08-14', frequency:'Semi-Annual', rating:'SOV', bondType:'G-Sec', lastPrice:101.5, ytm:7.05 },
    { isin:'INE002A08294', last4:'8294', name:'7.26% GS 2033', issuer:'GOI', faceValue:100, couponRate:7.26, maturityDate:'2033-02-22', issueDate:'2023-02-22', frequency:'Semi-Annual', rating:'SOV', bondType:'G-Sec', lastPrice:102.1, ytm:7.0 },
    { isin:'INE002A08252', last4:'8252', name:'7.37% GS 2028', issuer:'GOI', faceValue:100, couponRate:7.37, maturityDate:'2028-10-23', issueDate:'2022-10-14', frequency:'Semi-Annual', rating:'SOV', bondType:'G-Sec', lastPrice:103.2, ytm:6.8 },
    { isin:'INE002A08278', last4:'8278', name:'7.06% GS 2028', issuer:'GOI', faceValue:100, couponRate:7.06, maturityDate:'2028-04-10', issueDate:'2023-04-10', frequency:'Semi-Annual', rating:'SOV', bondType:'G-Sec', lastPrice:101.8, ytm:6.75 },
    { isin:'INE002A08310', last4:'8310', name:'7.30% GS 2053', issuer:'GOI', faceValue:100, couponRate:7.3, maturityDate:'2053-06-19', issueDate:'2023-06-19', frequency:'Semi-Annual', rating:'SOV', bondType:'G-Sec', lastPrice:105.5, ytm:6.9 },
    { isin:'INE002A08302', last4:'8302', name:'7.25% GS 2063', issuer:'GOI', faceValue:100, couponRate:7.25, maturityDate:'2063-06-12', issueDate:'2023-06-12', frequency:'Semi-Annual', rating:'SOV', bondType:'G-Sec', lastPrice:106.2, ytm:6.85 },
    { isin:'INE002A08237', last4:'8237', name:'6.54% GS 2032', issuer:'GOI', faceValue:100, couponRate:6.54, maturityDate:'2032-01-17', issueDate:'2022-01-07', frequency:'Semi-Annual', rating:'SOV', bondType:'G-Sec', lastPrice:98.5, ytm:6.8 },
    { isin:'INE002A08328', last4:'8328', name:'7.17% GS 2030', issuer:'GOI', faceValue:100, couponRate:7.17, maturityDate:'2030-01-08', issueDate:'2024-01-08', frequency:'Semi-Annual', rating:'SOV', bondType:'G-Sec', lastPrice:102.3, ytm:6.75 },

    // ─── AAA CORPORATE BONDS ───
    { isin:'INE040A08KM1', last4:'8KM1', name:'HDFC BANK LTD SR-Y001 7.73 NCD 21JN27', issuer:'HDFC BANK LTD', faceValue:1000000, couponRate:7.73, maturityDate:'2027-06-21', issueDate:'2024-06-21', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE09B308044', last4:'8044', name:'SLICE SFB 12.00 NCD 17DE31', issuer:'SLICE SMALL FINANCE BANK', faceValue:100000, couponRate:12.00, maturityDate:'2031-12-17', issueDate:'2026-03-17', frequency:'Monthly', rating:'BBB+', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE040A08KN9', last4:'8KN9', name:'HDFC BANK LTD SR-Y002 7.82 NCD 21JN29', issuer:'HDFC BANK LTD', faceValue:1000000, couponRate:7.82, maturityDate:'2029-06-21', issueDate:'2024-06-21', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE062A08312', last4:'8312', name:'SBI 7.72 BD 07MR35', issuer:'STATE BANK OF INDIA', faceValue:1000000, couponRate:7.72, maturityDate:'2035-03-07', issueDate:'2025-03-07', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE062A08304', last4:'8304', name:'SBI 7.50 BD 21FE30', issuer:'STATE BANK OF INDIA', faceValue:1000000, couponRate:7.50, maturityDate:'2030-02-21', issueDate:'2025-02-21', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE090A08UU6', last4:'8UU6', name:'ICICI BANK LTD SR-EE 7.65 NCD 27SP29', issuer:'ICICI BANK LTD', faceValue:1000000, couponRate:7.65, maturityDate:'2029-09-27', issueDate:'2024-09-27', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE752E08OX4', last4:'8OX4', name:'REC LTD SR-218 7.58 BD 15JL27', issuer:'REC LTD', faceValue:1000000, couponRate:7.58, maturityDate:'2027-07-15', issueDate:'2024-07-15', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE752E08PA0', last4:'8PA0', name:'REC LTD SR-220 7.68 BD 16AU34', issuer:'REC LTD', faceValue:1000000, couponRate:7.68, maturityDate:'2034-08-16', issueDate:'2024-08-16', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE134E08LN9', last4:'8LN9', name:'PFC LTD SR-235 7.55 BD 25JL29', issuer:'POWER FINANCE CORP LTD', faceValue:1000000, couponRate:7.55, maturityDate:'2029-07-25', issueDate:'2024-07-25', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE261F08CX7', last4:'8CX7', name:'NABARD SR-25A 7.44 BD 15MR28', issuer:'NABARD', faceValue:1000000, couponRate:7.44, maturityDate:'2028-03-15', issueDate:'2025-03-15', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE053F08HH3', last4:'8HH3', name:'IRFC LTD SR-193 7.50 BD 22SP29', issuer:'INDIAN RAILWAY FINANCE CORP', faceValue:1000000, couponRate:7.50, maturityDate:'2029-09-22', issueDate:'2024-09-22', frequency:'Semi-Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE296A08AX3', last4:'8AX3', name:'BAJAJ FINANCE LTD SR-66 8.30 NCD 11JN27', issuer:'BAJAJ FINANCE LTD', faceValue:100000, couponRate:8.30, maturityDate:'2027-06-11', issueDate:'2024-06-11', frequency:'Monthly', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE774D08DL3', last4:'8DL3', name:'NHPC LTD SR-98 7.50 BD 16AG29', issuer:'NHPC LTD', faceValue:1000000, couponRate:7.50, maturityDate:'2029-08-16', issueDate:'2024-08-16', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE733E08OS2', last4:'8OS2', name:'POWER GRID CORP SR-103 7.45 BD 27JN34', issuer:'POWER GRID CORP OF INDIA', faceValue:1000000, couponRate:7.45, maturityDate:'2034-06-27', issueDate:'2024-06-27', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE020B08DT5', last4:'8DT5', name:'NTPC LTD SR-89 7.48 BD 09AG34', issuer:'NTPC LTD', faceValue:1000000, couponRate:7.48, maturityDate:'2034-08-09', issueDate:'2024-08-09', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE206D08CM8', last4:'8CM8', name:'NHB SR-S72 7.55 BD 15AP27', issuer:'NATIONAL HOUSING BANK', faceValue:1000000, couponRate:7.55, maturityDate:'2027-04-15', issueDate:'2024-04-15', frequency:'Semi-Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },

    // ─── AA+ CORPORATE BONDS ───
    { isin:'INE774D08DM1', last4:'8DM1', name:'TATA CAPITAL FIN SR-F 8.40 NCD 08NO27', issuer:'TATA CAPITAL FINANCIAL SERVICES', faceValue:100000, couponRate:8.40, maturityDate:'2027-11-08', issueDate:'2024-11-08', frequency:'Annual', rating:'AA+', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE548D08GR3', last4:'8GR3', name:'L&T FINANCE LTD SR-A2 8.20 NCD 15FE28', issuer:'L&T FINANCE LTD', faceValue:100000, couponRate:8.20, maturityDate:'2028-02-15', issueDate:'2025-02-15', frequency:'Annual', rating:'AA+', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE721A08BY4', last4:'8BY4', name:'SHRIRAM FINANCE LTD SR-PP 9.00 NCD 09JN27', issuer:'SHRIRAM FINANCE LTD', faceValue:100000, couponRate:9.00, maturityDate:'2027-06-09', issueDate:'2024-06-09', frequency:'Monthly', rating:'AA+', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE774D08DK5', last4:'8DK5', name:'MUTHOOT FINANCE LTD SR-XIV 8.75 NCD 25JL27', issuer:'MUTHOOT FINANCE LTD', faceValue:100000, couponRate:8.75, maturityDate:'2027-07-25', issueDate:'2024-07-25', frequency:'Monthly', rating:'AA+', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE414G08FL8', last4:'8FL8', name:'MAHINDRA & MAHINDRA FIN SR-T 8.35 NCD 27MY27', issuer:'MAHINDRA & MAHINDRA FINANCIAL', faceValue:100000, couponRate:8.35, maturityDate:'2027-05-27', issueDate:'2024-05-27', frequency:'Annual', rating:'AA+', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE860H08BM6', last4:'8BM6', name:'PIRAMAL CAPITAL SR-IV 9.15 NCD 18OC27', issuer:'PIRAMAL CAPITAL & HOUSING', faceValue:100000, couponRate:9.15, maturityDate:'2027-10-18', issueDate:'2024-10-18', frequency:'Monthly', rating:'AA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE916DA8HZ2', last4:'8HZ2', name:'CHOLAMANDALAM INV SR-D3 8.55 NCD 06MR28', issuer:'CHOLAMANDALAM INVESTMENT', faceValue:100000, couponRate:8.55, maturityDate:'2028-03-06', issueDate:'2025-03-06', frequency:'Annual', rating:'AA+', bondType:'Corporate', lastPrice:null, ytm:null },

    // ─── SDLs (State Development Loans) ───
    { isin:'INE848F09EL8', last4:'9EL8', name:'MAHARASHTRA SDL 7.38 15MR35', issuer:'GOVT OF MAHARASHTRA', faceValue:1000, couponRate:7.38, maturityDate:'2035-03-15', issueDate:'2025-03-05', frequency:'Semi-Annual', rating:'SOV', bondType:'SDL', lastPrice:null, ytm:null },
    { isin:'INE848C09FR4', last4:'9FR4', name:'TAMIL NADU SDL 7.42 23AP35', issuer:'GOVT OF TAMIL NADU', faceValue:1000, couponRate:7.42, maturityDate:'2035-04-23', issueDate:'2025-04-16', frequency:'Semi-Annual', rating:'SOV', bondType:'SDL', lastPrice:null, ytm:null },
    { isin:'INE848K09DS8', last4:'9DS8', name:'RAJASTHAN SDL 7.45 01JN35', issuer:'GOVT OF RAJASTHAN', faceValue:1000, couponRate:7.45, maturityDate:'2035-06-01', issueDate:'2025-05-21', frequency:'Semi-Annual', rating:'SOV', bondType:'SDL', lastPrice:null, ytm:null },
    { isin:'INE848D09GH1', last4:'9GH1', name:'UTTAR PRADESH SDL 7.48 10JL35', issuer:'GOVT OF UTTAR PRADESH', faceValue:1000, couponRate:7.48, maturityDate:'2035-07-10', issueDate:'2025-07-02', frequency:'Semi-Annual', rating:'SOV', bondType:'SDL', lastPrice:null, ytm:null },
    { isin:'INE848G09CW5', last4:'9CW5', name:'KARNATAKA SDL 7.35 20FE35', issuer:'GOVT OF KARNATAKA', faceValue:1000, couponRate:7.35, maturityDate:'2035-02-20', issueDate:'2025-02-12', frequency:'Semi-Annual', rating:'SOV', bondType:'SDL', lastPrice:null, ytm:null },

    // ─── Tax-Free Bonds ───
    { isin:'INE752E08497', last4:'8497', name:'REC TAX FREE BD SR-3 8.01 01MR29', issuer:'REC LTD', faceValue:1000, couponRate:8.01, maturityDate:'2029-03-01', issueDate:'2014-02-28', frequency:'Annual', rating:'AAA', bondType:'Tax-Free', lastPrice:null, ytm:null },
    { isin:'INE134E08IH7', last4:'8IH7', name:'PFC TAX FREE BD SR-3 8.20 01MR29', issuer:'POWER FINANCE CORP', faceValue:1000, couponRate:8.20, maturityDate:'2029-03-01', issueDate:'2014-02-28', frequency:'Annual', rating:'AAA', bondType:'Tax-Free', lastPrice:null, ytm:null },
    { isin:'INE053F08247', last4:'8247', name:'IRFC TAX FREE BD 8.15 01FE29', issuer:'INDIAN RAILWAY FINANCE CORP', faceValue:1000, couponRate:8.15, maturityDate:'2029-02-01', issueDate:'2014-01-31', frequency:'Annual', rating:'AAA', bondType:'Tax-Free', lastPrice:null, ytm:null },
    { isin:'INE020B08BC2', last4:'8BC2', name:'NTPC TAX FREE BD SR-67 8.01 01MR29', issuer:'NTPC LTD', faceValue:1000, couponRate:8.01, maturityDate:'2029-03-01', issueDate:'2014-02-28', frequency:'Annual', rating:'AAA', bondType:'Tax-Free', lastPrice:null, ytm:null },
    { isin:'INE775A08110', last4:'8110', name:'NHAI TAX FREE BD SR-III 8.20 01FE29', issuer:'NATIONAL HIGHWAYS AUTHORITY', faceValue:1000, couponRate:8.20, maturityDate:'2029-02-01', issueDate:'2014-01-31', frequency:'Annual', rating:'AAA', bondType:'Tax-Free', lastPrice:null, ytm:null },
    { isin:'INE233P08111', last4:'8111', name:'HUDCO TAX FREE BD SR-3 8.20 01MR29', issuer:'HUDCO LTD', faceValue:1000, couponRate:8.20, maturityDate:'2029-03-01', issueDate:'2014-02-28', frequency:'Annual', rating:'AAA', bondType:'Tax-Free', lastPrice:null, ytm:null },

    // ─── More AAA PSU Bonds ───
    { isin:'INE020B08DP5', last4:'8DP5', name:'NTPC LTD SR-87 7.40 BD 25AP29', issuer:'NTPC LTD', faceValue:1000000, couponRate:7.40, maturityDate:'2029-04-25', issueDate:'2024-04-25', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE134E08LP4', last4:'8LP4', name:'PFC LTD SR-237 7.65 BD 30SP34', issuer:'POWER FINANCE CORP LTD', faceValue:1000000, couponRate:7.65, maturityDate:'2034-09-30', issueDate:'2024-09-30', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE752E08OY2', last4:'8OY2', name:'REC LTD SR-219 7.62 BD 30AG29', issuer:'REC LTD', faceValue:1000000, couponRate:7.62, maturityDate:'2029-08-30', issueDate:'2024-08-30', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE101A08AE4', last4:'8AE4', name:'EXIM BANK SR-16 7.50 BD 20SP29', issuer:'EXPORT-IMPORT BANK OF INDIA', faceValue:1000000, couponRate:7.50, maturityDate:'2029-09-20', issueDate:'2024-09-20', frequency:'Semi-Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
    { isin:'INE115A08CY7', last4:'8CY7', name:'SIDBI SR-X 7.45 BD 30OC29', issuer:'SMALL INDUSTRIES DEV BANK', faceValue:1000000, couponRate:7.45, maturityDate:'2029-10-30', issueDate:'2024-10-30', frequency:'Annual', rating:'AAA', bondType:'Corporate', lastPrice:null, ytm:null },
  ];
}

// ── Generate Database File ──────────────────────────────────────────
function generateDatabase(bonds) {
  // Deduplicate by ISIN
  const seen = new Set();
  const unique = bonds.filter(b => {
    if (seen.has(b.isin)) return false;
    seen.add(b.isin);
    return true;
  });

  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const dateStr = istTime.toISOString().replace('Z', '+05:30');

  const db = {
    lastUpdated: dateStr,
    lastUpdatedDisplay: istTime.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) +
      ' ' + istTime.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }),
    source: 'NSE India',
    count: unique.length,
    bonds: unique,
  };

  const content =
`// ═══════════════════════════════════════════════════════════════
// BondCalc — Bond Database (Auto-generated)
// Updated : ${db.lastUpdatedDisplay}
// Source  : ${db.source}
// Bonds   : ${db.count}
// ═══════════════════════════════════════════════════════════════
// DO NOT EDIT — this file is regenerated by update_bonds.js

var BONDS_DB = ${JSON.stringify(db, null, 2)};
`;

  fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');
  ok(`Database saved → ${OUTPUT_FILE}`);
  log(`  Bonds: ${unique.length} | Size: ${(Buffer.byteLength(content) / 1024).toFixed(1)} KB`);
}

// ── CSV Import Support ──────────────────────────────────────────────
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const bonds = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

    // Try to map common CSV column names
    const isin = row['ISIN'] || row['isin'] || row['Isin'] || '';
    if (!isin || !isin.startsWith('IN')) continue;

    bonds.push({
      isin,
      last4: isin.slice(-4),
      name: row['Security'] || row['SecurityName'] || row['SECURITY'] || row['Symbol'] || '',
      issuer: (row['Issuer'] || row['ISSUER'] || row['Company'] || '').trim(),
      faceValue: parseFloat(row['FaceValue'] || row['Face Value'] || row['FACE_VALUE'] || 1000),
      couponRate: parseFloat(row['CouponRate'] || row['Coupon Rate'] || row['COUPON'] || row['Coupon'] || 0),
      maturityDate: row['MaturityDate'] || row['Maturity Date'] || row['MATURITY_DATE'] || row['Maturity'] || '',
      issueDate: row['IssueDate'] || row['Issue Date'] || row['ISSUE_DATE'] || '',
      frequency: row['Frequency'] || row['FREQUENCY'] || row['Payment Frequency'] || 'Semi-Annual',
      rating: row['Rating'] || row['RATING'] || row['Credit Rating'] || '',
      bondType: 'Corporate',
      lastPrice: parseFloat(row['LastPrice'] || row['LTP'] || 0) || null,
      ytm: parseFloat(row['YTM'] || row['Yield'] || 0) || null,
    });
  }

  return bonds;
}

// ── BSE Fetcher ──────────────────────────────────────────────────────
async function fetchBSEBonds() {
  log('Fetching BSE Debt Segment...');
  const bonds = [];
  try {
    const { execSync } = require('child_process');
    const today = new Date();
    // adjust for weekends
    if (today.getDay() === 0) today.setDate(today.getDate() - 2);
    if (today.getDay() === 6) today.setDate(today.getDate() - 1);
    
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const fullYear = today.getFullYear();
    const bseUrl = `https://www.bseindia.com/download/BhavCopy/Debt/DEBTBHAVCOPY${d}${m}${fullYear}.zip`;
    const zipFile = 'bse.zip';
    
    log(`Downloading BSE ZIP: ${bseUrl}`);
    execSync(`curl -s -L -A "Mozilla/5.0" -o ${zipFile} ${bseUrl}`);
    
    // Attempt extraction natively
    try {
      execSync(`unzip -o -q ${zipFile} -d bse_out`, { stdio: 'ignore' });
    } catch(e) {
       // fallback for windows
       execSync(`powershell Expand-Archive -Path ${zipFile} -DestinationPath bse_out -Force`, { stdio: 'ignore' });
    }
    
    const fs = require('fs');
    if (fs.existsSync('bse_out')) {
      const bseCsvs = fs.readdirSync('bse_out').filter(f => f.toUpperCase().endsWith('.CSV'));
      for (const bseCsv of bseCsvs) {
        const csvData = fs.readFileSync('bse_out/' + bseCsv, 'utf-8');
        const lines = csvData.split('\n');
        if (lines.length < 2) continue;
        
        const headers = lines[0].split(',').map(h => h.trim().toUpperCase());
        const isinIdx = headers.findIndex(h => h.includes('ISIN'));
        const priceIdx = headers.findIndex(h => h === 'CLOSE PRICE' || h === 'LTP' || h === 'LAST');
        const nameIdx = headers.findIndex(h => h === 'SC_NAME' || h === 'ISSUER NAME');
        
        if (isinIdx === -1 || priceIdx === -1) continue;
        
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols.length > isinIdx) {
            const isin = cols[isinIdx];
            if (isin && isin.startsWith('IN')) {
               bonds.push({
                 isin: isin,
                 last4: isin.slice(-4),
                 name: (nameIdx !== -1 && cols[nameIdx]) ? cols[nameIdx] : isin,
                 issuer: 'BSE Traded',
                 faceValue: 1000, // Default fallback
                 couponRate: 0,
                 maturityDate: '',
                 issueDate: '',
                 frequency: 'Semi-Annual',
                 rating: '',
                 bondType: 'Corporate',
                 lastPrice: parseFloat(cols[priceIdx]) || null,
                 ytm: null
               });
            }
          }
        }
      }
      if (bonds.length > 0) {
        ok(`Parsed ${bonds.length} bonds from BSE.`);
      }
    }
  } catch(e) {
    warn(`BSE fetch skipped (Market likely closed or file unavailable): ${e.message}`);
  }
  return bonds;
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  log('═══════════════════════════════════════════════════');
  log('  BondCalc — Bond Database Update');
  log(`  ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  log('═══════════════════════════════════════════════════');
  console.log('');

  // Check for CSV import mode
  const csvArg = process.argv.find(a => a.endsWith('.csv'));
  if (csvArg) {
    log(`Importing from CSV: ${csvArg}`);
    try {
      const csvText = fs.readFileSync(csvArg, 'utf-8');
      const bonds = parseCSV(csvText);
      if (bonds.length === 0) {
        fail('No valid bonds found in CSV');
        process.exit(1);
      }
      generateDatabase(bonds);
      ok(`Imported ${bonds.length} bonds from CSV!`);
      return;
    } catch (e) {
      fail(`CSV import failed: ${e.message}`);
      process.exit(1);
    }
  }

  // Try NSE first
  let bonds = [];
  try {
    const cookies = await fetchNSESession();
    await sleep(2000);
    bonds = await fetchNSEBonds(cookies);
  } catch (err) {
    warn(`NSE fetch failed: ${err.message}`);
  }

  // Then try BSE
  try {
    const bseBonds = await fetchBSEBonds();
    // Merge BSE bonds (skip if ISIN already exists from NSE)
    const existingIsins = new Set(bonds.map(b => b.isin));
    for (const bseBond of bseBonds) {
      if (!existingIsins.has(bseBond.isin)) {
        bonds.push(bseBond);
        existingIsins.add(bseBond.isin);
      }
    }
  } catch (err) {
    warn(`BSE merge failed: ${err.message}`);
  }

  if (bonds.length > 0) {
    generateDatabase(bonds);
    ok(`Success! ${bonds.length} unique bonds loaded from Live Markets.`);
    console.log('');
    return;
  }

  // Fallback to sample database
  if (bonds.length === 0) {
    warn('Using curated sample database (40 bonds)');
    warn('To get full data, download CSV from NSE → run: node update_bonds.js path/to/file.csv');
    console.log('');
    const sampleBonds = getSampleBonds();
    generateDatabase(sampleBonds);
    ok(`Sample database created with ${sampleBonds.length} bonds.`);
  }

  console.log('');
}

main().catch(err => {
  fail(`Fatal error: ${err.message}`);
  process.exit(1);
});
