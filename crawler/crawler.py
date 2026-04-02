"""
auto.market — Crawler principal
Supabase via API REST directe (pas de supabase-py).
"""

import os
import re
import time
import json
import hashlib
import logging
import random
from datetime import date, datetime
from typing import Optional
from difflib import SequenceMatcher

import requests
from bs4 import BeautifulSoup

# ── LOGGING ──────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("crawler")

# ── SUPABASE REST ─────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

SB_HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=representation",
}

def sb_get(table: str, params: dict = {}) -> list:
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=SB_HEADERS,
        params=params,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()

def sb_post(table: str, data: dict) -> Optional[dict]:
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=SB_HEADERS,
        json=data,
        timeout=15,
    )
    if resp.status_code in (200, 201):
        result = resp.json()
        return result[0] if isinstance(result, list) and result else result
    log.warning(f"sb_post {table}: {resp.status_code} {resp.text[:200]}")
    return None

def sb_patch(table: str, filters: dict, data: dict) -> bool:
    params = {k: f"eq.{v}" for k, v in filters.items()}
    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=SB_HEADERS,
        params=params,
        json=data,
        timeout=15,
    )
    return resp.status_code in (200, 204)

def sb_upsert(table: str, data: dict, on_conflict: str) -> Optional[dict]:
    headers = {**SB_HEADERS, "Prefer": f"resolution=merge-duplicates,return=representation"}
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={on_conflict}",
        headers=headers,
        json=data,
        timeout=15,
    )
    if resp.status_code in (200, 201):
        result = resp.json()
        return result[0] if isinstance(result, list) and result else result
    log.warning(f"sb_upsert {table}: {resp.status_code} {resp.text[:200]}")
    return None

# ── HEADERS ROTATIFS ─────────────────────────────────────────────
USER_AGENTS = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1",
]

def get_headers(referer: str = "https://www.google.fr/") -> dict:
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": referer,
        "Connection": "keep-alive",
    }

def safe_get(url: str, referer: str = "https://www.google.fr/", retries: int = 3) -> Optional[requests.Response]:
    for attempt in range(retries):
        try:
            time.sleep(random.uniform(2, 5))
            resp = requests.get(url, headers=get_headers(referer), timeout=20)
            if resp.status_code == 200:
                return resp
            if resp.status_code == 429:
                log.warning(f"Rate limited — attente 30s")
                time.sleep(30)
            else:
                log.warning(f"HTTP {resp.status_code} sur {url}")
        except Exception as e:
            log.error(f"Erreur réseau ({attempt+1}/{retries}): {e}")
            time.sleep(5 * (attempt + 1))
    return None

# ── FINGERPRINT ───────────────────────────────────────────────────
def make_fingerprint(source: str, year: int, mileage: int, price: int, department: str) -> str:
    mileage_rounded = round(mileage / 500) * 500
    raw = f"{source}|{year}|{mileage_rounded}|{price}|{department}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]

# ── FUZZY MATCHING ────────────────────────────────────────────────
def normalize_text(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def fuzzy_score(a: str, b: str) -> float:
    return SequenceMatcher(None, normalize_text(a), normalize_text(b)).ratio()

def match_version(version_raw: str, vehicle: dict) -> tuple:
    if not version_raw or not vehicle.get("version"):
        return None, 0.0
    target = vehicle["version"]
    score = fuzzy_score(version_raw, target)
    config = vehicle.get("crawl_config") or {}
    for kw in config.get("keywords", []):
        s = fuzzy_score(version_raw, kw)
        if s > score:
            score = s
    for ex in config.get("exclude_keywords", []):
        if ex.lower() in normalize_text(version_raw):
            return None, 0.0
    return target if score > 0 else None, score

# ── NORMALISATION ─────────────────────────────────────────────────
COLOR_MAP = {
    "rouge": "rouge", "red": "rouge",
    "gris": "gris", "grey": "gris", "gray": "gris", "anthracite": "gris", "magnetic": "gris",
    "noir": "noir", "black": "noir", "agate": "noir",
    "blanc": "blanc", "white": "blanc", "glacier": "blanc",
    "bleu": "bleu", "blue": "bleu", "roi": "bleu", "marine": "bleu",
    "vert": "vert", "orange": "orange", "beige": "beige",
    "marron": "marron", "brun": "marron",
}

def normalize_color(raw: str) -> str:
    if not raw:
        return "autre"
    for key, val in COLOR_MAP.items():
        if key in raw.lower():
            return val
    return "autre"

def normalize_gearbox(raw: str) -> Optional[str]:
    if not raw:
        return None
    r = raw.lower()
    if any(k in r for k in ["auto", "powershift", "robotis", "dsg", "edc", "bva", "cvt"]):
        return "Automatique"
    if any(k in r for k in ["manuelle", "bvm", "manu", "mecanique"]):
        return "Manuelle"
    return None

def parse_price(text: str) -> Optional[int]:
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits and int(digits) > 500 else None

def parse_mileage(text: str) -> Optional[int]:
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else None

def extract_department(location: str) -> str:
    m = re.search(r"\((\d{2,3}[AB]?)\)", location)
    if m:
        return m.group(1)
    m = re.search(r"\b(\d{5})\b", location)
    if m:
        return m.group(1)[:2]
    return ""

# ── LBC ──────────────────────────────────────────────────────────
def scrape_lbc(vehicle: dict) -> list:
    results = []
    config = vehicle.get("crawl_config") or {}
    keywords = config.get("keywords", [f"{vehicle['make']} {vehicle['model']}"])
    main_keyword = keywords[0]

    search_url = "https://api.leboncoin.fr/finder/classified/search"
    payload = {
        "filters": {
            "category": {"id": "2"},
            "keywords": {"text": main_keyword, "type": "subject"},
        },
        "limit": 100,
        "offset": 0,
        "sort_by": "time",
        "sort_order": "desc",
    }
    headers = {
        **get_headers("https://www.leboncoin.fr/"),
        "Content-Type": "application/json",
        "api_key": "ba0c2dad52b3585c9a5b1df4fd842332",
        "Accept": "application/json",
    }

    try:
        time.sleep(random.uniform(3, 6))
        resp = requests.post(search_url, json=payload, headers=headers, timeout=20)
        if resp.status_code != 200:
            log.warning(f"LBC API: HTTP {resp.status_code}")
            return results

        ads = resp.json().get("ads", [])
        log.info(f"LBC: {len(ads)} annonces brutes")

        for ad in ads:
            try:
                attrs = {a["key"]: a.get("value_label") or a.get("value") for a in ad.get("attributes", [])}
                price_raw = ad.get("price", [None])[0]
                if not price_raw:
                    continue
                loc = ad.get("location", {})
                results.append({
                    "source": "lbc",
                    "external_id": str(ad.get("list_id", "")),
                    "external_url": ad.get("url", ""),
                    "year": int(attrs.get("regdate", 0) or 0),
                    "mileage": parse_mileage(str(attrs.get("mileage", "0") or "0")),
                    "price": int(price_raw),
                    "gearbox_raw": attrs.get("gearbox", ""),
                    "color": attrs.get("color", ""),
                    "version_raw": attrs.get("brand_model_name", "") or ad.get("subject", ""),
                    "seller_type": "pro" if ad.get("store_id") else "particulier",
                    "seller_name": ad.get("owner", {}).get("name", ""),
                    "location": loc.get("city", ""),
                    "department": loc.get("department_id", ""),
                })
            except Exception as e:
                log.debug(f"LBC parsing: {e}")
    except Exception as e:
        log.error(f"LBC error: {e}")

    return results

# ── PARUVENDU ─────────────────────────────────────────────────────
def scrape_paruvendu(vehicle: dict) -> list:
    results = []
    config = vehicle.get("crawl_config") or {}
    keywords = config.get("keywords", [f"{vehicle['make']} {vehicle['model']}"])
    query = keywords[0].replace(" ", "+")

    url = f"https://www.paruvendu.fr/voiture-occasion/?q={query}&nbAnn=100"
    resp = safe_get(url, referer="https://www.paruvendu.fr/")
    if not resp:
        return results

    soup = BeautifulSoup(resp.text, "html.parser")
    ads = soup.select("article.annonce, div.annonce-item, div[data-testid='listing-card']")
    log.info(f"ParuVendu: {len(ads)} annonces brutes")

    for ad in ads:
        try:
            title_el = ad.select_one("h2, h3, .title")
            price_el  = ad.select_one("[class*='price'], .prix")
            km_el     = ad.select_one("[class*='km'], [class*='mileage']")
            year_el   = ad.select_one("[class*='year'], [class*='annee']")
            loc_el    = ad.select_one("[class*='location'], [class*='ville']")
            link_el   = ad.select_one("a[href]")

            price   = parse_price(price_el.get_text()) if price_el else None
            mileage = parse_mileage(km_el.get_text()) if km_el else None
            year_m  = re.search(r"20\d{2}", year_el.get_text()) if year_el else None
            year    = int(year_m.group()) if year_m else 0
            location = loc_el.get_text(strip=True) if loc_el else ""

            if not price or not mileage or not year:
                continue

            href = link_el["href"] if link_el else ""
            results.append({
                "source": "paruvendu",
                "external_id": "",
                "external_url": "https://www.paruvendu.fr" + href if href.startswith("/") else href,
                "year": year,
                "mileage": mileage,
                "price": price,
                "gearbox_raw": "",
                "color": "",
                "version_raw": title_el.get_text(strip=True) if title_el else "",
                "seller_type": None,
                "seller_name": "",
                "location": location.split("(")[0].strip(),
                "department": extract_department(location),
            })
        except Exception as e:
            log.debug(f"ParuVendu parsing: {e}")

    return results

# ── LA CENTRALE ───────────────────────────────────────────────────
def scrape_lacentrale(vehicle: dict) -> list:
    results = []
    make_encoded = vehicle["make"].upper().replace(" ", "%20")
    url = f"https://www.lacentrale.fr/listing?makesModelsCommercialNames={make_encoded}&page=1"
    resp = safe_get(url, referer="https://www.lacentrale.fr/")
    if not resp:
        return results

    soup = BeautifulSoup(resp.text, "html.parser")
    for script in soup.find_all("script", type="application/json"):
        try:
            data = json.loads(script.string or "{}")
            ads = data.get("props", {}).get("pageProps", {}).get("searchResults", {}).get("ads", [])
            if not ads:
                continue
            log.info(f"La Centrale: {len(ads)} annonces")
            for ad in ads:
                price   = ad.get("price")
                mileage = ad.get("mileage") or ad.get("km")
                year    = ad.get("year") or ad.get("firstRegistrationYear")
                if not all([price, mileage, year]):
                    continue
                location = ad.get("city", "") or ad.get("location", "")
                results.append({
                    "source": "lacentrale",
                    "external_id": str(ad.get("id", "")),
                    "external_url": "https://www.lacentrale.fr" + ad.get("url", ""),
                    "year": int(year),
                    "mileage": int(mileage),
                    "price": int(price),
                    "gearbox_raw": ad.get("gearbox", ""),
                    "color": ad.get("color", ""),
                    "version_raw": ad.get("title", "") or ad.get("version", ""),
                    "seller_type": "pro" if ad.get("isPro") else "particulier",
                    "seller_name": ad.get("sellerName", ""),
                    "location": location,
                    "department": extract_department(location),
                })
        except Exception:
            continue

    log.info(f"La Centrale: {len(results)} annonces extraites")
    return results

# ── UPSERT ────────────────────────────────────────────────────────
def upsert_listing(raw: dict, vehicle: dict, vehicle_id: str):
    year    = raw.get("year", 0)
    mileage = raw.get("mileage") or 0
    price   = raw.get("price", 0)
    dept    = raw.get("department", "")
    source  = raw["source"]

    if not all([year, mileage, price]):
        return

    fp = make_fingerprint(source, year, mileage, price, dept)
    version_raw = raw.get("version_raw", "")
    version_matched, match_score = match_version(version_raw, vehicle)
    match_threshold = (vehicle.get("crawl_config") or {}).get("match_threshold", 0.75)

    gearbox = normalize_gearbox(raw.get("gearbox_raw", ""))
    color_n = normalize_color(raw.get("color", ""))

    existing = sb_get("listings", {"fingerprint": f"eq.{fp}", "select": "id,price"})

    if existing:
        row = existing[0]
        update = {"last_seen_at": datetime.utcnow().isoformat(), "is_active": True}
        if row["price"] != price:
            update["price"] = price
            update["price_current"] = price
        sb_patch("listings", {"fingerprint": fp}, update)
    else:
        record = {
            "vehicle_id":       vehicle_id,
            "fingerprint":      fp,
            "source":           source,
            "external_id":      raw.get("external_id", ""),
            "external_url":     raw.get("external_url", ""),
            "year":             year,
            "mileage":          mileage,
            "price":            price,
            "gearbox":          gearbox,
            "color":            raw.get("color", ""),
            "color_normalized": color_n,
            "version_raw":      version_raw,
            "version_matched":  version_matched,
            "match_score":      round(match_score, 3),
            "match_validated":  None if match_score < match_threshold else True,
            "seller_type":      raw.get("seller_type"),
            "seller_name":      raw.get("seller_name", ""),
            "location":         raw.get("location", ""),
            "department":       dept,
            "price_initial":    price,
            "price_current":    price,
            "last_seen_at":     datetime.utcnow().isoformat(),
            "is_active":        True,
        }
        result = sb_post("listings", record)

        if result and match_score < match_threshold and match_score > 0.3 and version_raw:
            sb_post("validation_queue", {
                "listing_id":        result["id"],
                "version_raw":       version_raw,
                "version_candidate": version_matched or vehicle.get("version", ""),
                "match_score":       round(match_score, 3),
                "status":            "pending",
            })

# ── DISPARITIONS ─────────────────────────────────────────────────
def mark_disappeared(vehicle_id: str, seen_fps: set):
    active = sb_get("listings", {
        "vehicle_id": f"eq.{vehicle_id}",
        "is_active":  "eq.true",
        "select":     "id,fingerprint",
    })
    disappeared = [r["id"] for r in active if r["fingerprint"] not in seen_fps]
    if disappeared:
        for listing_id in disappeared:
            sb_patch("listings", {"id": listing_id}, {"is_active": False})
        log.info(f"  {len(disappeared)} annonces disparues")

# ── SNAPSHOT ──────────────────────────────────────────────────────
def compute_snapshot(vehicle_id: str):
    rows = sb_get("listings", {
        "vehicle_id": f"eq.{vehicle_id}",
        "select": "price,mileage,first_seen_at,disappeared_at"
    })
    if not rows:
        return

    today  = date.today().isoformat()
    active = [r for r in rows if not r.get("disappeared_at")]
    prices = sorted([r["price"] for r in active if r.get("price")])
    if not prices:
        return

    def pct(lst, p):
        return lst[min(int(len(lst) * p / 100), len(lst)-1)]

    km_list    = sorted([r["mileage"] for r in active if r.get("mileage")])
    new_today  = sum(1 for r in rows if (r.get("first_seen_at") or "")[:10] == today)
    sold_today = sum(1 for r in rows if (r.get("disappeared_at") or "")[:10] == today)

    sb_upsert("market_snapshots", {
        "vehicle_id":    vehicle_id,
        "snapshot_date": today,
        "source":        None,
        "listing_count": len(active),
        "price_median":  pct(prices, 50),
        "price_p25":     pct(prices, 25),
        "price_p75":     pct(prices, 75),
        "price_min":     prices[0],
        "price_max":     prices[-1],
        "mileage_median":pct(km_list, 50) if km_list else None,
        "new_listings":  new_today,
        "sold_listings": sold_today,
        "price_drops":   0,
    }, "vehicle_id,snapshot_date,source")
    log.info(f"  Snapshot: {len(active)} actives, médiane {pct(prices,50)}€")

# ── MAIN ──────────────────────────────────────────────────────────
def main():
    log.info("=== Démarrage crawler auto.market ===")

    vehicles = sb_get("vehicles", {"is_active": "eq.true"})
    log.info(f"{len(vehicles)} véhicule(s) actif(s)")

    for vehicle in vehicles:
        vid   = vehicle["id"]
        label = f"{vehicle['make']} {vehicle['model']}"
        log.info(f"\n── {label}")

        all_raw = []
        log.info("  → LBC")
        all_raw += scrape_lbc(vehicle)
        time.sleep(random.uniform(5, 10))

        log.info("  → ParuVendu")
        all_raw += scrape_paruvendu(vehicle)
        time.sleep(random.uniform(5, 10))

        log.info("  → La Centrale")
        all_raw += scrape_lacentrale(vehicle)

        valid = [r for r in all_raw if r.get("year", 0) >= 2010 and r.get("price", 0) > 1000 and r.get("mileage") is not None]
        log.info(f"  {len(valid)} annonces valides sur {len(all_raw)} brutes")

        seen_fps = set()
        for raw in valid:
            fp = make_fingerprint(raw["source"], raw.get("year", 0), raw.get("mileage", 0), raw.get("price", 0), raw.get("department", ""))
            seen_fps.add(fp)
            upsert_listing(raw, vehicle, vid)

        mark_disappeared(vid, seen_fps)
        compute_snapshot(vid)
        log.info(f"  ✓ {label} terminé")
        time.sleep(random.uniform(10, 20))

    log.info("=== Crawler terminé ===")

if __name__ == "__main__":
    main()