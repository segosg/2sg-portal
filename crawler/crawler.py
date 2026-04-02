"""
auto.market — Crawler principal
Scrape LBC, ParuVendu, La Centrale pour chaque véhicule surveillé dans Supabase.
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
from supabase import create_client, Client

# ── LOGGING ──────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("crawler")

# ── SUPABASE ─────────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── HEADERS ROTATIFS ─────────────────────────────────────────────
USER_AGENTS = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 13; Samsung Galaxy S23) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
]

def get_headers(referer: str = "https://www.google.fr/") -> dict:
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": referer,
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
    }

def safe_get(url: str, referer: str = "https://www.google.fr/", retries: int = 3) -> Optional[requests.Response]:
    for attempt in range(retries):
        try:
            time.sleep(random.uniform(2, 5))  # délai humain
            resp = requests.get(url, headers=get_headers(referer), timeout=20)
            if resp.status_code == 200:
                return resp
            if resp.status_code == 429:
                log.warning(f"Rate limited sur {url} — attente 30s")
                time.sleep(30)
            else:
                log.warning(f"HTTP {resp.status_code} sur {url}")
        except Exception as e:
            log.error(f"Erreur réseau ({attempt+1}/{retries}) : {e}")
            time.sleep(5 * (attempt + 1))
    return None

# ── FINGERPRINT ───────────────────────────────────────────────────
def make_fingerprint(source: str, year: int, mileage: int, price: int, department: str) -> str:
    """
    Fingerprint robuste : arrondi km à 500 près pour tolérer les légères
    variations entre sources (ex: 53239 vs 53200 = même annonce).
    """
    mileage_rounded = round(mileage / 500) * 500
    raw = f"{source}|{year}|{mileage_rounded}|{price}|{department}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]

# ── FUZZY MATCHING ────────────────────────────────────────────────
def normalize_text(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def fuzzy_score(a: str, b: str) -> float:
    return SequenceMatcher(None, normalize_text(a), normalize_text(b)).ratio()

def match_version(version_raw: str, vehicle: dict) -> tuple[Optional[str], float]:
    """
    Compare version_raw avec la version cible du véhicule.
    Retourne (version_matched, score).
    """
    if not version_raw or not vehicle.get("version"):
        return None, 0.0

    target = vehicle["version"]
    score = fuzzy_score(version_raw, target)

    # Vérifier aussi les keywords de crawl_config
    config = vehicle.get("crawl_config", {})
    keywords = config.get("keywords", [])
    for kw in keywords:
        s = fuzzy_score(version_raw, kw)
        if s > score:
            score = s

    # Vérifier les exclusions
    excludes = config.get("exclude_keywords", [])
    for ex in excludes:
        if ex.lower() in normalize_text(version_raw):
            return None, 0.0  # exclusion explicite

    return target if score > 0 else None, score

# ── NORMALISATION COULEUR ─────────────────────────────────────────
COLOR_MAP = {
    "rouge": "rouge", "red": "rouge",
    "gris": "gris", "grey": "gris", "gray": "gris", "anthracite": "gris", "magnetic": "gris",
    "noir": "noir", "black": "noir", "agate": "noir",
    "blanc": "blanc", "white": "blanc", "glacier": "blanc",
    "bleu": "bleu", "blue": "bleu", "roi": "bleu", "marine": "bleu",
    "vert": "vert", "green": "vert",
    "orange": "orange",
    "beige": "beige", "sable": "beige",
    "marron": "marron", "brun": "marron", "brown": "marron",
}

def normalize_color(raw: str) -> str:
    if not raw:
        return "autre"
    raw_lower = raw.lower()
    for key, val in COLOR_MAP.items():
        if key in raw_lower:
            return val
    return "autre"

# ── NORMALISATION BOÎTE ───────────────────────────────────────────
def normalize_gearbox(raw: str) -> Optional[str]:
    if not raw:
        return None
    raw_lower = raw.lower()
    if any(k in raw_lower for k in ["auto", "powershift", "robotis", "dsg", "edc", "bva", "cvt"]):
        return "Automatique"
    if any(k in raw_lower for k in ["manuelle", "bvm", "manu", "mecanique"]):
        return "Manuelle"
    return None

# ── PARSERS PAR SOURCE ────────────────────────────────────────────

def parse_price(text: str) -> Optional[int]:
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else None

def parse_mileage(text: str) -> Optional[int]:
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else None

def extract_department(location: str) -> str:
    """Extrait le département depuis 'Ville (75)' ou 'Ville 75000'."""
    m = re.search(r"\((\d{2,3}[AB]?)\)", location)
    if m:
        return m.group(1)
    m = re.search(r"\b(\d{5})\b", location)
    if m:
        return m.group(1)[:2]
    return ""


# ── LBC ──────────────────────────────────────────────────────────
def scrape_lbc(vehicle: dict) -> list[dict]:
    """
    Scrape LeBonCoin via l'API mobile non officielle.
    Plus stable que le HTML desktop.
    """
    results = []
    config = vehicle.get("crawl_config", {})
    keywords = config.get("keywords", [vehicle["model"]])
    main_keyword = keywords[0]

    # LBC API mobile endpoint
    search_url = "https://api.leboncoin.fr/finder/classified/search"
    payload = {
        "filters": {
            "category": {"id": "2"},  # Voitures
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
        "api_key": "ba0c2dad52b3585c9a5b1df4fd842332",  # clé publique LBC mobile app
        "Accept": "application/json",
    }

    try:
        time.sleep(random.uniform(3, 6))
        resp = requests.post(search_url, json=payload, headers=headers, timeout=20)
        if resp.status_code != 200:
            log.warning(f"LBC API: HTTP {resp.status_code}")
            return results

        data = resp.json()
        ads = data.get("ads", [])
        log.info(f"LBC: {len(ads)} annonces brutes trouvées")

        for ad in ads:
            try:
                attrs = {a["key"]: a.get("value_label") or a.get("value") for a in ad.get("attributes", [])}
                price_raw = ad.get("price", [None])[0]
                if not price_raw:
                    continue

                location_data = ad.get("location", {})
                city = location_data.get("city", "")
                dept = location_data.get("department_id", "")

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
                    "location": city,
                    "department": dept,
                })
            except Exception as e:
                log.debug(f"LBC: erreur parsing annonce: {e}")
                continue

    except Exception as e:
        log.error(f"LBC scraping error: {e}")

    return results


# ── PARUVENDU ─────────────────────────────────────────────────────
def scrape_paruvendu(vehicle: dict) -> list[dict]:
    results = []
    config = vehicle.get("crawl_config", {})
    keywords = config.get("keywords", [vehicle["model"]])
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
            title_el = ad.select_one("h2, h3, .title, [class*='title']")
            price_el  = ad.select_one("[class*='price'], .prix")
            km_el     = ad.select_one("[class*='km'], [class*='mileage'], .kilom")
            year_el   = ad.select_one("[class*='year'], [class*='annee'], .annee")
            loc_el    = ad.select_one("[class*='location'], [class*='ville'], .ville")
            link_el   = ad.select_one("a[href]")

            price = parse_price(price_el.get_text()) if price_el else None
            mileage = parse_mileage(km_el.get_text()) if km_el else None
            year_text = year_el.get_text() if year_el else ""
            year_m = re.search(r"20\d{2}", year_text)
            year = int(year_m.group()) if year_m else 0
            location = loc_el.get_text(strip=True) if loc_el else ""

            if not price or not mileage or not year:
                continue

            results.append({
                "source": "paruvendu",
                "external_id": "",
                "external_url": "https://www.paruvendu.fr" + (link_el["href"] if link_el and link_el.get("href", "").startswith("/") else ""),
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
            log.debug(f"ParuVendu: erreur parsing: {e}")
            continue

    return results


# ── LA CENTRALE ───────────────────────────────────────────────────
def scrape_lacentrale(vehicle: dict) -> list[dict]:
    results = []
    config = vehicle.get("crawl_config", {})
    keywords = config.get("keywords", [vehicle["model"]])
    query = keywords[0].replace(" ", "%20")

    url = f"https://www.lacentrale.fr/listing?makesModelsCommercialNames=FORD%3AFOCUS&options=&gearbox=&mileageMax=&priceMax=&priceMin=&yearMin=&yearMax=&energy=&page=1"
    resp = safe_get(url, referer="https://www.lacentrale.fr/")
    if not resp:
        return results

    soup = BeautifulSoup(resp.text, "html.parser")

    # La Centrale utilise du JS pour rendre les annonces — on parse le JSON embarqué
    scripts = soup.find_all("script", type="application/json")
    for script in scripts:
        try:
            data = json.loads(script.string or "{}")
            ads = (
                data.get("props", {})
                    .get("pageProps", {})
                    .get("searchResults", {})
                    .get("ads", [])
            )
            if not ads:
                continue

            log.info(f"La Centrale: {len(ads)} annonces dans JSON embarqué")
            for ad in ads:
                try:
                    price = ad.get("price")
                    mileage = ad.get("mileage") or ad.get("km")
                    year = ad.get("year") or ad.get("firstRegistrationYear")
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
                        "gearbox_raw": ad.get("gearbox", "") or ad.get("transmission", ""),
                        "color": ad.get("color", ""),
                        "version_raw": ad.get("title", "") or ad.get("version", ""),
                        "seller_type": "pro" if ad.get("isPro") else "particulier",
                        "seller_name": ad.get("sellerName", ""),
                        "location": location,
                        "department": extract_department(location),
                    })
                except Exception as e:
                    log.debug(f"LC: erreur parsing annonce: {e}")
        except Exception:
            continue

    log.info(f"La Centrale: {len(results)} annonces extraites")
    return results


# ── UPSERT SUPABASE ───────────────────────────────────────────────
def upsert_listing(raw: dict, vehicle: dict, vehicle_id: str):
    """
    Insère ou met à jour une annonce dans Supabase.
    Gère le fingerprint, le fuzzy matching et la validation queue.
    """
    year     = raw.get("year", 0)
    mileage  = raw.get("mileage", 0)
    price    = raw.get("price", 0)
    dept     = raw.get("department", "")
    source   = raw["source"]

    if not all([year, mileage, price]):
        return

    fp = make_fingerprint(source, year, mileage, price, dept)

    # Fuzzy matching version
    version_raw = raw.get("version_raw", "")
    version_matched, match_score = match_version(version_raw, vehicle)
    match_threshold = vehicle.get("crawl_config", {}).get("match_threshold", 0.75)

    # Normalisation
    gearbox   = normalize_gearbox(raw.get("gearbox_raw", ""))
    color_raw = raw.get("color", "")
    color_n   = normalize_color(color_raw)

    record = {
        "vehicle_id":      vehicle_id,
        "fingerprint":     fp,
        "source":          source,
        "external_id":     raw.get("external_id", ""),
        "external_url":    raw.get("external_url", ""),
        "year":            year,
        "mileage":         mileage,
        "price":           price,
        "gearbox":         gearbox,
        "color":           color_raw,
        "color_normalized":color_n,
        "version_raw":     version_raw,
        "version_matched": version_matched,
        "match_score":     round(match_score, 3),
        "match_validated": None if match_score < match_threshold else True,
        "seller_type":     raw.get("seller_type"),
        "seller_name":     raw.get("seller_name", ""),
        "location":        raw.get("location", ""),
        "department":      dept,
        "price_initial":   price,
        "price_current":   price,
        "last_seen_at":    datetime.utcnow().isoformat(),
        "is_active":       True,
    }

    try:
        # Upsert sur fingerprint (insert ou update last_seen_at + price)
        existing = supabase.table("listings").select("id,price,match_validated").eq("fingerprint", fp).execute()

        if existing.data:
            row = existing.data[0]
            update_data = {"last_seen_at": record["last_seen_at"], "is_active": True}
            # Mise à jour prix si changé
            if row["price"] != price:
                update_data["price"] = price
                update_data["price_current"] = price
            supabase.table("listings").update(update_data).eq("id", row["id"]).execute()
        else:
            result = supabase.table("listings").insert(record).execute()
            new_id = result.data[0]["id"] if result.data else None

            # Ajouter à la validation queue si matching ambigu
            if new_id and match_score < match_threshold and match_score > 0.3 and version_raw:
                supabase.table("validation_queue").insert({
                    "listing_id":        new_id,
                    "version_raw":       version_raw,
                    "version_candidate": version_matched or vehicle.get("version", ""),
                    "match_score":       round(match_score, 3),
                    "status":            "pending",
                }).execute()

    except Exception as e:
        log.error(f"Erreur upsert listing (fp={fp}): {e}")


# ── MARQUER DISPARITIONS ──────────────────────────────────────────
def mark_disappeared(vehicle_id: str, seen_fingerprints: set[str]):
    """
    Les annonces en base non vues lors du crawl actuel → is_active = false.
    """
    try:
        active = supabase.table("listings") \
            .select("id,fingerprint") \
            .eq("vehicle_id", vehicle_id) \
            .eq("is_active", True) \
            .execute()

        disappeared = [
            row["id"] for row in active.data
            if row["fingerprint"] not in seen_fingerprints
        ]

        if disappeared:
            supabase.table("listings") \
                .update({"is_active": False}) \
                .in_("id", disappeared) \
                .execute()
            log.info(f"  {len(disappeared)} annonces marquées disparues")

    except Exception as e:
        log.error(f"Erreur mark_disappeared: {e}")


# ── SNAPSHOT QUOTIDIEN ────────────────────────────────────────────
def compute_snapshot(vehicle_id: str):
    """
    Calcule et insère le snapshot marché du jour pour ce véhicule.
    """
    try:
        rows = supabase.table("listings") \
            .select("price,mileage,source,first_seen_at,disappeared_at") \
            .eq("vehicle_id", vehicle_id) \
            .execute()

        if not rows.data:
            return

        today = date.today().isoformat()
        prices = sorted([r["price"] for r in rows.data if r["price"]])
        n = len(prices)
        if not n:
            return

        def percentile(lst, p):
            idx = int(len(lst) * p / 100)
            return lst[min(idx, len(lst) - 1)]

        # Nouvelles annonces (first_seen aujourd'hui)
        new_today = sum(1 for r in rows.data if r.get("first_seen_at", "")[:10] == today)
        # Disparues aujourd'hui
        sold_today = sum(1 for r in rows.data if r.get("disappeared_at", "")[:10] == today)

        active_rows = [r for r in rows.data if not r.get("disappeared_at")]
        active_prices = sorted([r["price"] for r in active_rows if r["price"]])

        snapshot = {
            "vehicle_id":    vehicle_id,
            "snapshot_date": today,
            "source":        None,
            "listing_count": len(active_rows),
            "price_median":  percentile(active_prices, 50) if active_prices else None,
            "price_p25":     percentile(active_prices, 25) if active_prices else None,
            "price_p75":     percentile(active_prices, 75) if active_prices else None,
            "price_min":     min(active_prices) if active_prices else None,
            "price_max":     max(active_prices) if active_prices else None,
            "mileage_median":percentile(sorted([r["mileage"] for r in active_rows if r.get("mileage")]), 50) if active_rows else None,
            "new_listings":  new_today,
            "sold_listings": sold_today,
            "price_drops":   0,  # calculé via trigger Supabase
        }

        supabase.table("market_snapshots").upsert(snapshot, on_conflict="vehicle_id,snapshot_date,source").execute()
        log.info(f"  Snapshot inséré : {len(active_rows)} annonces actives, médiane {snapshot['price_median']}€")

    except Exception as e:
        log.error(f"Erreur compute_snapshot: {e}")


# ── MAIN ──────────────────────────────────────────────────────────
def main():
    log.info("=== Démarrage du crawler auto.market ===")

    # Charger les véhicules actifs
    vehicles_resp = supabase.table("vehicles").select("*").eq("is_active", True).execute()
    vehicles = vehicles_resp.data
    log.info(f"{len(vehicles)} véhicule(s) à crawler")

    for vehicle in vehicles:
        vid = vehicle["id"]
        label = f"{vehicle['make']} {vehicle['model']} — {vehicle.get('version', 'toutes versions')}"
        log.info(f"\n── {label}")

        all_raw: list[dict] = []

        # LBC
        log.info("  → LBC")
        all_raw += scrape_lbc(vehicle)
        time.sleep(random.uniform(5, 10))

        # ParuVendu
        log.info("  → ParuVendu")
        all_raw += scrape_paruvendu(vehicle)
        time.sleep(random.uniform(5, 10))

        # La Centrale
        log.info("  → La Centrale")
        all_raw += scrape_lacentrale(vehicle)

        log.info(f"  Total brut : {len(all_raw)} annonces")

        # Filtrer les annonces invalides
        valid = [r for r in all_raw if r.get("year", 0) >= 2010 and r.get("price", 0) > 1000 and r.get("mileage", 0) >= 0]
        log.info(f"  Après filtrage : {len(valid)} annonces valides")

        # Upsert en base
        seen_fps: set[str] = set()
        for raw in valid:
            fp = make_fingerprint(raw["source"], raw.get("year", 0), raw.get("mileage", 0), raw.get("price", 0), raw.get("department", ""))
            seen_fps.add(fp)
            upsert_listing(raw, vehicle, vid)

        # Marquer les disparitions
        mark_disappeared(vid, seen_fps)

        # Snapshot du jour
        compute_snapshot(vid)

        log.info(f"  ✓ {label} terminé")
        time.sleep(random.uniform(10, 20))

    log.info("\n=== Crawler terminé ===")


if __name__ == "__main__":
    main()