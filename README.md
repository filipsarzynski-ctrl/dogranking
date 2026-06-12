# DogRanking - zrodla strony dogranking.com

Generator statyczny bez zaleznosci (zero npm install).

build.js = generator: node build.js buduje strone do dist/
data/*.json = bazy produktow i artykulow per rynek (PL / UK / US)
static/ = logo marki BEKON

## Konfiguracja Cloudflare Pages (jednorazowo)

Workers & Pages > Create > Pages > Connect to Git > repo dogranking:

Build command: node build.js
Build output directory: dist
Environment variables: DEPLOY=1 oraz STAGING=1

STAGING=1 to baner demo + noindex. Przed oficjalnym startem (po weryfikacji danych z etykiet) usunac STAGING, zostawic DEPLOY=1.

Po spieciu kazdy commit do main = automatyczny deploy. Na koncu przeniesc custom domain dogranking.com na ten projekt i usunac stary projekt direct-upload.

## Aktualizacje tresci

Edycja plikow w data/ (nowy produkt = nowy rekord JSON), commit, strona przebuduje sie sama.
