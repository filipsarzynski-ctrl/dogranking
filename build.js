#!/usr/bin/env node
/* ============================================================
   DogRanking — generator statyczny v3 MULTI-MARKET (zero zależności)
   - intro z wyborem rynku na / (bez przymusowego redirectu — SEO/AI!)
   - osobne bazy produktów per rynek: data/foods.{pl,uk,us}.json
   - PL po polsku, UK/US po angielsku (slugi EN: /uk/dog-food/)
   - uczciwość: produkty bez obiektu `test` = "ocena z etykiety,
     test w przygotowaniu" (nie udajemy testów, których nie było)
   - hreflang między odpowiednikami (home/huby/metodologia)
   Build: node build.js | DEPLOY=1 [STAGING=1] node build.js
   ============================================================ */
const fs = require('fs');
const path = require('path');

const SITE = 'https://www.dogranking.com';
const TODAY = new Date().toISOString().slice(0, 10);
const OUT = path.join(__dirname, 'dist');
const J = f => JSON.parse(fs.readFileSync(path.join(__dirname, 'data', f), 'utf8'));
const NONFOOD_CATS = ['przysmaki-i-gryzaki','pielegnacja','akcesoria','zabawki'];
const pickCats = obj => { const o = {}; for (const k of NONFOOD_CATS) if (Array.isArray(obj[k])) o[k] = obj[k]; return o; };
const CATS = J('categories.json').categories;
const PRODUCTS = {
  pl: { karmy: J('foods.pl.json').foods, pielegnacja: J('products.pielegnacja.json').products, 'przysmaki-i-gryzaki': J('products.przysmaki-i-gryzaki.json').products, akcesoria: J('products.akcesoria.json').products, zabawki: J('products.zabawki.json').products },
  uk: Object.assign({ karmy: J('foods.uk.json').foods }, pickCats(J('products.uk.json'))),
  us: Object.assign({ karmy: J('foods.us.json').foods }, pickCats(J('products.us.json')))
};
const ARTS = J('articles.pl.json').articles;
const MARKETS = {
  pl: { lang: 'pl', name: 'Polska', flag: '🇵🇱', langName: 'po polsku', money: v => `${v} zł` },
  uk: { lang: 'en', name: 'United Kingdom', flag: '🇬🇧', langName: 'in English', money: v => `£${v}` },
  us: { lang: 'en', name: 'United States', flag: '🇺🇸', langName: 'in English', money: v => `$${v}` }
};
/* Domyslnie: produkcja (czyste URL-e) + bezpiecznie (noindex + baner demo), bez zmiennych w panelu.
   PREVIEW=1 -> linki z index.html (podglad z dysku). LAUNCH=1 -> zdejmuje noindex+baner (oficjalny start). */
const PREVIEW = !!process.env.PREVIEW;
const STAGING = !process.env.LAUNCH;

/* ---------- i18n szablonów ---------- */
const STR = {
  pl: {
    nav: ['Start', 'Kategorie', 'Metodologia'], review: 'Recenzja', reviewTitle: 'recenzja i ocena', rated: 'Ocena', updated: 'Zaktualizowano',
    demo: 'DEMO — dane do weryfikacji', goodChoice: n => `Czy ${n} to dobry wybór?`,
    flavorRow: 'Wariant (smak)',
    variantBox: 'Ta ocena dotyczy <strong>konkretnego wariantu smakowego</strong>. Producenci często sprzedają tę samą linię w wielu smakach (np. łosoś, jagnięcina, kurczak), a każdy ma inny skład, profil odżywczy i alergeny — więc i inną ocenę. Sprawdzaj wariant, który realnie kupujesz.',
    prof: {
      h: '🐶 Dopasuj do swojego psa', sub: 'Łapki opisują jakość karmy. Wybierz profil psa, a my przeliczymy dopasowanie i pokażemy ostrzeżenia.',
      age: 'Wiek', ageOpts: [['dorosly', 'Dorosły (1–7 lat)'], ['szczenie', 'Szczenię'], ['senior', 'Senior (7+)']],
      size: 'Rozmiar', sizeOpts: [['maly', 'Mały / toy (do 10 kg)'], ['sredni', 'Średni (10–25 kg)'], ['duzy', 'Duży / olbrzymi (25+ kg)']],
      health: 'Zdrowie', healthOpts: [['ok', 'Zdrowy'], ['alergia', 'Alergia na drób/kurczaka'], ['nadwaga', 'Nadwaga'], ['trzustka', 'Po zapaleniu trzustki'], ['stawy', 'Problemy ze stawami'], ['nerki', 'Choroba nerek']],
      reset: 'Wyczyść profil', matchLbl: 'Dopasowanie', blocked: 'Niezalecana przy tym profilu',
      legend: '<strong>Jak to czytać:</strong> łapki 🐾 = jakość karmy (niezależna od psa). Dopasowanie % = jak karma pasuje do profilu, który wybrałeś. Ostrzeżenia pokazujemy zawsze. Przy chorobach dieta zawsze pod kontrolą weterynarza — dopasowanie nie zastępuje porady lekarskiej.',
      wAllergy: 'Zawiera drób — wyklucz przy alergii na kurczaka', wPanc: 'Tłuszcz powyżej 15% suchej masy — niewskazana po zapaleniu trzustki',
      wPup: 'Receptura dla psów dorosłych — szczenię potrzebuje karmy „growth"/„wszystkie etapy życia"', wKidney: 'Choroba nerek wymaga diety renalnej z obniżonym fosforem — dobór tylko z weterynarzem',
      wLegume: 'Strączkowe wysoko w składzie (kontekst FDA ws. DCM — zob. Wiedza)'
    },
    nutrition: 'Wartości odżywcze (w suchej masie)', spec: 'Specyfikacja', param: 'Parametr', value: 'Wartość', ctx: 'Próg / kontekst',
    form: 'Forma karmy', formNote: 'porównujemy formy po przeliczeniu na suchą masę', protein: 'Białko', fat: 'Tłuszcz', energy: 'Energia',
    min: 'min', cost1000: 'Koszt 1000 kcal', cost1000note: 'jedyna uczciwa miara między formą suchą a mokrą',
    dmNote: 'Wartości przeliczone z analizy gwarantowanej na suchą masę (DM).', howCalc: 'Jak liczymy →',
    pillarsH: 'Punktacja w 4 filarach', pillar: 'Filar', result: 'Wynik', max: 'Maks.',
    pillarLabelsFood: ['A · Skład i jakość białka', 'B · Zgodność z normami FEDIAF', 'C · Wiarygodność producenta (WSAVA)', 'D · Dodatki i przetwarzanie'],
    pillarLabelsOther: ['A · Materiały i wykonanie', 'B · Bezpieczeństwo i dowody', 'C · Wiarygodność producenta', 'D · Ergonomia i wartość'],
    pros: 'Zalety', cons: 'Wady',
    testH: 'Test DogRanking — ten egzemplarz mieliśmy w rękach', testDate: 'Data testu',
    testPending: 'Test DogRanking w przygotowaniu — powyższa ocena powstała z analizy etykiety i publicznych danych producenta (tak oceniamy zawsze; test dodaje zdjęcia, pomiary własne i werdykt Bekona, ale nie zmienia punktacji).',
    measure: 'Pomiar własny', kibbleRow: 'Średnica granuli / konsystencja', smellRow: 'Zapach po otwarciu', textureRow: 'Tekstura',
    runRow: 'Przebieg testu', stateRow: 'Stan po teście', wet: 'karma mokra — kawałki w sosie/galarecie', smallOk: '(odpowiednia także dla małych ras)', smallNo: '(może być duża dla ras miniaturowych)',
    bekonRowFood: 'Werdykt Bekona (smakowitość)', bekonRowOther: 'Werdykt Bekona (test użytkowy)',
    protocolFood: 'Bekon ma stałą dietę i jej nie zmieniamy — test smakowitości to kilka granulek podanych jako przysmak, co jest bezpieczne dla zdrowego psa. Otwarte worki po sesji testowej przekazujemy lokalnemu schronisku.',
    protocolOther: 'Produkty kupujemy sami (nie od producentów) i testujemy w codziennym użytkowaniu z Bekonem. Skala 🎾 mierzy akceptację psa w użyciu — nie zastępuje oceny jakości w łapkach.',
    protocolTail: 'Werdykt Bekona <strong>nie wpływa na punktację</strong> 0–100.', protocolLink: 'Pełny protokół testowy →', protocolHead: 'Jak testujemy (i czego nie robimy):',
    faqH: 'Najczęstsze pytania', buyH: 'Gdzie kupić',
    disclosure: 'Powyższe linki są linkami afiliacyjnymi — przy zakupie otrzymujemy prowizję, bez zmiany ceny dla Ciebie. Ocena powstała zanim sprawdziliśmy, gdzie produkt można kupić.',
    hubDisclosure: 'Strony produktów zawierają linki afiliacyjne (zawsze oznaczone rel="sponsored"). Punktacja powstaje przed sprawdzeniem dostępności w sklepach.',
    catEyebrow: 'Kategoria', rankingH: 'Ranking — produkty dostępne w Polsce', betaH: 'Pierwsze testy — kategoria w fazie beta',
    soonH: 'Ranking w przygotowaniu', soonTxt: 'Tę kategorię uruchomimy zgodnie z mapą rozwoju. Metodologia jest już zaprojektowana — poniżej kryteria oceny.',
    metaRank: n => `${n} produktów (faza startowa — baza rośnie) · wszystkie formy liczone w suchej masie`,
    seeReview: 'Zobacz test i recenzję →', seeReviewLabel: 'Zobacz recenzję →', testedByUs: '📷 testowana przez nas', labelBased: '📋 ocena z etykiety · test wkrótce',
    formsH: 'Formy karm — co porównujemy i jak',
    formsTxt: 'Karma to nie tylko sucha i mokra — oceniamy 8 form, zawsze po przeliczeniu na suchą masę i z kosztem za 1000 kcal. Mokra karma z 8% białka ma go w suchej masie 40% — bez przeliczenia każde porównanie jest błędne.',
    formCol: 'Forma', formNoteCol: 'Uwagi do oceny', howWeRateCat: 'Jak oceniamy w tej kategorii', fullMethod: 'Pełna metodologia (4 filary, 100 punktów, łapki) →',
    badges: { live: 'Ranking aktywny', beta: 'Pierwsze testy', soon: 'Wkrótce', edu: 'Strefa edukacyjna' },
    homeEyebrow: 'Niezależne oceny produktów dla psów · Polska',
    homeH1: 'Czytamy etykiety, normy i badania.<br><em style="color:var(--terra)">Ty wybierasz dla psa.</em>',
    homeLead: 'Karmy, gryzaki, szelki, lokalizatory GPS — każdy produkt przechodzi przez jawny, 100-punktowy algorytm. Bez sponsorowanych miejsc. Oceny w łapkach 🐾, degustację i testy prowadzi Bekon — pudel miniaturowy.',
    whatWeRate: 'Co oceniamy', top3: 'Ranking karm — top 3', fullRank: 'Pełny ranking karm →',
    howWeRate: 'Jak oceniamy?',
    howWeRateTxt: 'Dwie warstwy: <strong>łapki 🐾</strong> (1–5) opisują jakość produktu (4 filary, 100 punktów), a <strong>dopasowanie</strong> liczymy osobno dla profilu psa. Jadalne degustuje Bekon (miski 🥣), niejadalne testuje w użyciu (piłki 🎾). W strefie Zdrowie nie rankingujemy leków — tylko edukujemy.',
    methodLink: 'Pełna metodologia →', crumbHome: 'DogRanking PL',
    footer: '© 2026 DogRanking · Treści edukacyjne — nie zastępują porady weterynaryjnej · Linki afiliacyjne zawsze jawnie oznaczone · Degustację prowadzi Bekon 🐩',
    footerMethod: 'Jak oceniamy', staging: '🚧 Wersja demonstracyjna — przykładowe dane i oceny w trakcie weryfikacji z etykietami. Oficjalny start wkrótce.'
  },
  en: {
    nav: ['Home', 'Categories', 'Methodology'], review: 'Review', reviewTitle: 'review & rating', rated: 'Rating', updated: 'Updated',
    flavorRow: 'Variant (flavour)',
    variantBox: 'This rating is for a <strong>specific flavour variant</strong>. Brands often sell the same line in several flavours (salmon, lamb, chicken…), each with a different recipe, nutrient profile and allergens — and therefore a different score. Always check the exact variant you are buying.',
    prof: {
      h: '🐶 Match to your dog', sub: 'Paws describe food quality. Pick your dog’s profile and we’ll compute the match and flag warnings.',
      age: 'Age', ageOpts: [['dorosly', 'Adult (1–7 yrs)'], ['szczenie', 'Puppy'], ['senior', 'Senior (7+)']],
      size: 'Size', sizeOpts: [['maly', 'Small / toy (up to 10 kg)'], ['sredni', 'Medium (10–25 kg)'], ['duzy', 'Large / giant (25+ kg)']],
      health: 'Health', healthOpts: [['ok', 'Healthy'], ['alergia', 'Poultry/chicken allergy'], ['nadwaga', 'Overweight'], ['trzustka', 'After pancreatitis'], ['stawy', 'Joint problems'], ['nerki', 'Kidney disease']],
      reset: 'Clear profile', matchLbl: 'Match', blocked: 'Not recommended for this profile',
      legend: '<strong>How to read this:</strong> paws 🐾 = food quality (independent of your dog). Match % = how the food fits the profile you chose. Warnings are always shown. With medical conditions, diet always under veterinary supervision — match is not medical advice.',
      wAllergy: 'Contains poultry — exclude for chicken allergy', wPanc: 'Fat above 15% dry matter — unsuitable after pancreatitis',
      wPup: 'Adult recipe — a puppy needs a “growth”/“all life stages” food', wKidney: 'Kidney disease needs a renal diet with restricted phosphorus — choose only with your vet',
      wLegume: 'Legumes high in the recipe (FDA DCM context — see Knowledge)'
    },
    demo: 'DEMO — data pending verification', goodChoice: n => `Is ${n} a good choice?`,
    nutrition: 'Nutrition (dry-matter basis)', spec: 'Specification', param: 'Parameter', value: 'Value', ctx: 'Threshold / context',
    form: 'Food format', formNote: 'formats compared on a dry-matter basis', protein: 'Protein', fat: 'Fat', energy: 'Energy',
    min: 'min', cost1000: 'Cost per 1,000 kcal', cost1000note: 'the only fair measure across dry, wet and fresh formats',
    dmNote: 'Values converted from guaranteed analysis to dry matter (DM).', howCalc: 'How we calculate →',
    pillarsH: 'Score across 4 pillars', pillar: 'Pillar', result: 'Score', max: 'Max',
    pillarLabelsFood: ['A · Recipe & protein quality', 'B · Compliance (FEDIAF/AAFCO)', 'C · Manufacturer credibility (WSAVA)', 'D · Additives & processing'],
    pillarLabelsOther: ['A · Materials & build', 'B · Safety & evidence', 'C · Manufacturer credibility', 'D · Ergonomics & value'],
    pros: 'Pros', cons: 'Cons',
    testH: 'DogRanking hands-on test', testDate: 'Test date',
    testPending: 'Hands-on test pending — this rating is based on label analysis and public manufacturer data (that is always how we score; a hands-on test adds photos, our own measurements and Bekon’s verdict, but never changes the score).',
    measure: 'Our measurement', kibbleRow: 'Kibble size / consistency', smellRow: 'Smell on opening', textureRow: 'Texture',
    runRow: 'Test procedure', stateRow: 'Condition after test', wet: 'wet food — chunks in gravy/jelly', smallOk: '(suitable for small breeds too)', smallNo: '(may be large for toy breeds)',
    bekonRowFood: 'Bekon’s verdict (palatability)', bekonRowOther: 'Bekon’s verdict (usage test)',
    protocolFood: 'Bekon keeps his regular diet — palatability tests are a few kibbles offered as a treat, which is safe for a healthy dog. Opened test bags go to a local shelter.',
    protocolOther: 'We buy products ourselves (never from manufacturers) and test them in daily use with Bekon. The 🎾 scale measures the dog’s acceptance in use — it never replaces the paw-rating.',
    protocolTail: 'Bekon’s verdict <strong>does not affect</strong> the 0–100 score.', protocolLink: 'Full testing protocol →', protocolHead: 'How we test (and what we don’t do):',
    faqH: 'Frequently asked questions', buyH: 'Where to buy',
    disclosure: 'The links above are affiliate links — we earn a commission at no extra cost to you. The rating was finalised before we checked where the product can be bought.',
    hubDisclosure: 'Product pages contain affiliate links (always marked rel="sponsored"). Scores are finalised before checking shop availability.',
    catEyebrow: 'Category', rankingH: 'Ranking — products available on this market', betaH: 'First tests — beta category',
    soonH: 'Ranking in preparation', soonTxt: 'This category launches per our roadmap. The methodology is already designed — rating criteria below.',
    metaRank: n => `${n} products (launch phase — the database is growing) · all formats compared on a dry-matter basis`,
    seeReview: 'See test & review →', seeReviewLabel: 'See review →', testedByUs: '📷 hands-on tested', labelBased: '📋 label-based · hands-on test pending',
    formsH: 'Dog food formats — what we compare and how',
    formsTxt: 'Dog food is not just dry vs wet — we rate 8 formats, always converted to dry matter and costed per 1,000 kcal. A wet food with 8% protein has 40% on a dry-matter basis — without conversion every comparison is wrong.',
    formCol: 'Format', formNoteCol: 'Rating notes', howWeRateCat: 'How we rate this category', fullMethod: 'Full methodology (4 pillars, 100 points, paws) →',
    badges: { live: 'Live rankings', beta: 'First tests', soon: 'Coming soon', edu: 'Educational zone' },
    homeEyebrow: 'Independent dog product ratings',
    homeH1: 'We read the labels, standards and studies.<br><em style="color:var(--terra)">You choose for your dog.</em>',
    homeLead: 'Dog food, chews, harnesses, GPS trackers — every product goes through a transparent 100-point algorithm. No sponsored placements. Ratings in paws 🐾; tasting and testing by Bekon, a miniature poodle.',
    whatWeRate: 'What we rate', top3: 'Dog food ranking — top 3', fullRank: 'Full dog food ranking →',
    howWeRate: 'How we rate',
    howWeRateTxt: 'Two layers: <strong>paws 🐾</strong> (1–5) describe product quality (4 pillars, 100 points); <strong>match</strong> is computed separately for your dog’s profile. Edibles are taste-tested by Bekon (bowls 🥣), non-edibles usage-tested (balls 🎾). In the Health zone we never rank medicines — we educate.',
    methodLink: 'Full methodology →', crumbHome: 'DogRanking',
    footer: '© 2026 DogRanking · Educational content — not a substitute for veterinary advice · Affiliate links always clearly disclosed · Tasting by Bekon 🐩',
    footerMethod: 'How we rate', staging: '🚧 Demo version — sample data and ratings pending label verification. Official launch soon.'
  }
};

const FOOD_FORMS = {
  pl: [['Sucha (ekstrudowana)', 'standard rynku; najniższy koszt 1000 kcal'], ['Sucha tłoczona na zimno', 'łagodniejszy proces produkcji'], ['Mokra (puszki, saszetki)', '75–82% wody — porównuj TYLKO w suchej masie'], ['Świeża / gotowana chłodzona', 'wyższa strawność; model subskrypcyjny'], ['Liofilizowana / suszona powietrzem', 'wysoka gęstość odżywcza'], ['Surowa mrożona (BARF)', 'wymóg: dowód kompletności + kontrola patogenów, inaczej max 2 łapki'], ['Weterynaryjna', 'osobna kategoria oceny — zawsze pod kontrolą lekarza'], ['Topper / karma uzupełniająca', 'nie jest pełnoporcjowa — oznaczamy wyraźnie']],
  en: [['Dry (extruded kibble)', 'market standard; lowest cost per 1,000 kcal'], ['Cold-pressed dry', 'gentler production process'], ['Wet (cans, pouches)', '75–82% water — compare ONLY on dry matter'], ['Fresh / gently cooked', 'higher digestibility; subscription model'], ['Freeze-dried / air-dried', 'very nutrient-dense'], ['Frozen raw (BARF)', 'requires completeness proof + pathogen control, else capped at 2 paws'], ['Veterinary / therapeutic', 'rated in its own category — always under veterinary care'], ['Topper / complementary', 'not complete nutrition — clearly flagged']]
};

/* ---------- design system ---------- */
const CSS = `
:root{--paper:#F7F2E9;--card:#FFFDF8;--ink:#221D15;--muted:#6E6557;--terra:#BC5436;--sage:#5F7355;--gold:#C99B3F;--line:#E3DAC8;--r:16px}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,'Times New Roman',serif;background:var(--paper);color:var(--ink);line-height:1.65}
.wrap{max-width:1060px;margin:0 auto;padding:0 22px}
header{background:var(--card);border-bottom:1px solid var(--line)}
.bar{display:flex;align-items:center;gap:18px;min-height:62px;max-width:1060px;margin:0 auto;padding:6px 22px;flex-wrap:wrap}
.mark{text-decoration:none;display:flex;align-items:center}
.mark img{height:46px;width:auto;display:block}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
nav{display:flex;gap:4px;font-family:-apple-system,sans-serif;font-size:.9rem;flex-wrap:wrap}
nav a{padding:7px 12px;border-radius:99px;color:var(--muted);text-decoration:none;white-space:nowrap}
nav a:hover{color:var(--ink)}
.mktswitch{margin-left:auto;font-family:-apple-system,sans-serif;font-size:.82rem}
.mktswitch a{color:var(--muted);text-decoration:none;padding:4px 7px}
.mktswitch a:hover{color:var(--terra)}
main{padding:42px 0 70px}
h1{font-size:clamp(1.7rem,4vw,2.5rem);line-height:1.15;margin-bottom:14px}
h2{font-size:1.35rem;margin:34px 0 12px}
h3{font-size:1.05rem;margin:18px 0 6px}
.eyebrow{font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--terra);font-family:-apple-system,sans-serif;margin-bottom:10px}
.lead{color:var(--muted);font-size:1.05rem;max-width:660px}
.answer{background:var(--card);border-left:4px solid var(--sage);padding:16px 20px;border-radius:0 12px 12px 0;margin:14px 0 6px;font-size:1.02rem}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);font-family:-apple-system,sans-serif;font-size:.92rem;margin:14px 0}
th{background:#F1EADC;text-align:left;padding:10px 14px;font-size:.74rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
td{padding:11px 14px;border-top:1px solid #EEE7D8;vertical-align:top}
.badge{display:inline-block;background:#FAF0E2;border:1px solid #ECD9B8;color:#8A5A1E;border-radius:8px;padding:3px 10px;font-size:.78rem;font-family:-apple-system,sans-serif}
.badge.live{background:#EAF0E6;border-color:#C9D6BF;color:#3F5934}
.badge.beta{background:#E8EEF5;border-color:#C5D3E3;color:#33536F}
.badge.edu{background:#F3E9F2;border-color:#DFC9DC;color:#6B3F63}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:22px;margin:12px 0}
ul.pc{margin:8px 0 8px 20px}
ul.pc li{padding:3px 0}
.shops a{display:inline-block;background:var(--ink);color:var(--paper);text-decoration:none;padding:10px 18px;border-radius:99px;font-family:-apple-system,sans-serif;font-size:.88rem;margin:4px 8px 4px 0}
.disclosure{font-size:.8rem;color:var(--muted);font-family:-apple-system,sans-serif;border-left:3px solid var(--line);padding-left:12px;margin:16px 0}
.meta{font-size:.8rem;color:var(--muted);font-family:-apple-system,sans-serif}
.crumb{font-size:.8rem;color:var(--muted);font-family:-apple-system,sans-serif;margin-bottom:16px}
.crumb a{color:var(--muted);text-decoration:none}
.crumb a:hover{color:var(--terra)}
footer{border-top:1px solid var(--line);background:var(--card);padding:26px 0;font-size:.8rem;color:var(--muted);font-family:-apple-system,sans-serif;text-align:center}
.rankrow{display:grid;grid-template-columns:40px 1fr auto auto;gap:16px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:16px 20px;margin:10px 0;text-decoration:none;color:var(--ink)}
.rankrow:hover{border-color:var(--ink)}
.rankrow .num{font-size:1.3rem;color:var(--line);font-weight:700}
.rankrow .gobtn{font-family:-apple-system,sans-serif;font-size:.82rem;font-weight:600;color:var(--terra);white-space:nowrap}
@media(max-width:640px){.rankrow{grid-template-columns:30px 1fr}}
.pawwrap{position:relative;display:inline-block;line-height:0;vertical-align:middle}
.paw{width:20px;height:20px;display:inline-block;margin-right:3px;fill:#DCD2BD}
.pawbase{white-space:nowrap}
.pawfill{position:absolute;left:0;top:0;overflow:hidden;white-space:nowrap}
.pawfill .paw{fill:var(--gold)}
.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:16px 0}
.gallery figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.gallery img{width:100%;height:auto;display:block;aspect-ratio:4/3;object-fit:cover}
.gallery figcaption{padding:10px 14px;font-size:.8rem;color:var(--muted);font-family:-apple-system,sans-serif;border-top:1px solid #EEE7D8}
.paws{font-size:1.05rem;letter-spacing:2px}
.protocol{background:#F0F2EC;border:1px solid #D5DACB;border-radius:var(--r);padding:16px 20px;font-size:.9rem;font-family:-apple-system,sans-serif;color:#43503A;margin:16px 0}
.legalbox{background:#F8EEE9;border:1px solid #E5CDC2;border-radius:var(--r);padding:16px 20px;font-size:.9rem;font-family:-apple-system,sans-serif;color:#7A4633;margin:16px 0}
.pending{background:#EFF2F6;border:1px solid #CDD8E4;border-radius:var(--r);padding:16px 20px;font-size:.9rem;font-family:-apple-system,sans-serif;color:#33536F;margin:16px 0}
.catgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px;margin:24px 0}
.catcard{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:22px;text-decoration:none;color:var(--ink);display:flex;flex-direction:column;gap:8px;transition:.12s}
.catcard:hover{border-color:var(--ink);transform:translateY(-2px)}
.catcard .ic{font-size:1.6rem}
.catcard h3{margin:0;font-size:1.12rem}
.catcard p{font-size:.87rem;color:var(--muted);flex:1}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0;font-family:-apple-system,sans-serif}
.chip{border:1px solid var(--line);background:var(--card);border-radius:99px;padding:6px 14px;font-size:.82rem;color:var(--muted);text-decoration:none}
.chip.on{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.profile{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:18px 20px;margin:16px 0 6px;font-family:-apple-system,sans-serif}
.profile h3{margin:0 0 12px;font-family:'Fraunces',Georgia,serif;font-size:1.05rem}
.pf-row{display:flex;gap:18px;flex-wrap:wrap}
.pf-g{flex:1;min-width:150px}
.pf-g label{display:block;font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.pf-g select{width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:var(--paper);font:inherit;font-size:.9rem;color:var(--ink)}
.pf-reset{margin-top:12px;font-size:.82rem;color:var(--terra);background:none;border:0;cursor:pointer;padding:0;display:none}
.match{margin-top:8px;font-family:-apple-system,sans-serif;font-size:.82rem}
.match b{font-weight:700}
.mbar{height:7px;background:var(--line-soft,#EEE7D8);border-radius:4px;margin-top:4px;max-width:200px;overflow:hidden}
.mbar i{display:block;height:100%;border-radius:4px;background:var(--sage)}
.match.bad .mbar i{background:var(--terra)}
.warnline{background:#FAF0E2;border:1px solid #ECD9B8;color:#8A5A1E;border-radius:8px;padding:7px 12px;font-size:.8rem;font-family:-apple-system,sans-serif;margin-top:8px}
.rankrow.blocked{opacity:.5}
.matchlegend{background:var(--card);border:1px dashed var(--line);border-radius:var(--r);padding:14px 18px;font-family:-apple-system,sans-serif;font-size:.84rem;color:var(--muted);margin-top:10px}
/* intro / market picker */
.intro{max-width:760px;margin:0 auto;text-align:center;padding:40px 0}
.intro .logo-big{width:110px;height:110px;margin:0 auto 18px}
.mktgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;margin:30px 0}
.mktcard{background:var(--card);border:1.5px solid var(--line);border-radius:var(--r);padding:26px 20px;text-decoration:none;color:var(--ink);transition:.12s;display:block}
.mktcard:hover{border-color:var(--terra);transform:translateY(-3px)}
.mktcard .flag{font-size:2.2rem;display:block;margin-bottom:10px}
.mktcard b{font-size:1.1rem}
.mktcard span{display:block;font-size:.82rem;color:var(--muted);font-family:-apple-system,sans-serif;margin-top:6px}
.continue{display:none;background:#EAF0E6;border:1px solid #C9D6BF;color:#3F5934;border-radius:12px;padding:12px 18px;font-family:-apple-system,sans-serif;font-size:.92rem;margin:18px auto;max-width:480px}
.continue a{color:#3F5934;font-weight:700}
/* wiedza: gradacja dowodów */
.grade{display:inline-block;border-radius:8px;padding:2px 9px;font-size:.74rem;font-weight:700;font-family:-apple-system,sans-serif;border:1px solid}
.gA{background:#EAF0E6;color:#3F5934;border-color:#C9D6BF}
.gB{background:#E8EEF5;color:#33536F;border-color:#C5D3E3}
.gC{background:#FAF0E2;color:#8A5A1E;border-color:#ECD9B8}
.gD{background:#F8EEE9;color:#7A4633;border-color:#E5CDC2}
.reader{max-width:700px}
.reader .lead-a{font-style:italic;font-size:1.15rem;color:var(--muted);margin:14px 0 24px}
.reader .body p{margin-bottom:18px;font-size:1.02rem}
.reader .src{margin-top:30px;padding-top:16px;border-top:1px solid var(--line);font-size:.82rem;color:var(--muted);font-family:-apple-system,sans-serif}
`;

/* ---------- łapki, linki, waluty ---------- */
const pawParts = s => s >= 90 ? [5, 0] : s >= 80 ? [4, 1] : s >= 70 ? [4, 0] : s >= 60 ? [3, 1] : s >= 50 ? [3, 0] : s >= 30 ? [2, 0] : [1, 0];
const PAW = '<svg class="paw" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="10.2" r="2.2"/><circle cx="9.4" cy="6.9" r="2.4"/><circle cx="14.6" cy="6.9" r="2.4"/><circle cx="19" cy="10.2" r="2.2"/><path d="M12 11.4c3.1 0 5.7 2.3 5.7 5 0 1.8-1.4 3.2-3.3 3.2-.9 0-1.5-.3-2.4-.3s-1.5.3-2.4.3c-1.9 0-3.3-1.4-3.3-3.2 0-2.7 2.6-5 5.7-5z"/></svg>';
const pawsTxt = (s, lang = 'pl') => {
  const [f, h] = pawParts(s); const val = f + h * 0.5;
  const label = lang === 'pl' ? `Ocena ${val} na 5 łapek` : `Rated ${val} out of 5 paws`;
  return `<span class="pawwrap" role="img" aria-label="${label}"><span class="pawfill" style="width:${val * 20}%">${PAW.repeat(5)}</span><span class="pawbase">${PAW.repeat(5)}</span></span>`;
};
const lblPl = s => s >= 90 ? 'Wybitna' : s >= 80 ? 'Znakomita' : s >= 70 ? 'Bardzo dobra' : s >= 60 ? 'Dobra' : 'Przyzwoita';
const lblEn = s => s >= 90 ? 'Outstanding' : s >= 80 ? 'Excellent' : s >= 70 ? 'Very good' : s >= 60 ? 'Good' : 'Decent';
const scoreLbl = (s, lang) => lang === 'pl' ? lblPl(s) : lblEn(s);
const starsNum = s => Math.round(s / 20 * 10) / 10;
const href = (fromCanonical, target) =>
  '../'.repeat(fromCanonical.split('/').filter(Boolean).length) + target + (PREVIEW && target.endsWith('/') ? 'index.html' : '');
const per1000 = p => { const kg = p.priceKg || p.priceZlKg; return kg && p.kcal ? Math.round((kg / 10) * (1000 / p.kcal)) : null; };
const cSlug = (c, m) => m === 'pl' ? c.slug : c.slugEn;
const cName = (c, m) => m === 'pl' ? c.name : c.nameEn;
const cDesc = (c, m) => m === 'pl' ? c.desc : c.descEn;
const cCrit = (c, m) => m === 'pl' ? c.criteria : c.criteriaEn;

/* ---------- logo ---------- */
const LOGO = `<svg class="logo" viewBox="0 0 512 512" aria-hidden="true">
<ellipse cx="118" cy="295" rx="56" ry="98" fill="#9C5F2E" transform="rotate(10 118 295)"/>
<ellipse cx="394" cy="295" rx="56" ry="98" fill="#9C5F2E" transform="rotate(-10 394 295)"/>
<circle cx="180" cy="168" r="64" fill="#C17C42"/><circle cx="332" cy="168" r="64" fill="#C17C42"/>
<circle cx="256" cy="140" r="76" fill="#C17C42"/><circle cx="256" cy="272" r="150" fill="#C17C42"/>
<ellipse cx="256" cy="332" rx="80" ry="62" fill="#F0DDBD"/>
<circle cx="206" cy="254" r="18" fill="#221D15"/><circle cx="306" cy="254" r="18" fill="#221D15"/>
<circle cx="212" cy="247" r="6.5" fill="#FFFDF8"/><circle cx="312" cy="247" r="6.5" fill="#FFFDF8"/>
<path d="M232 304h48a11 11 0 0 1 8.5 18l-24 26a11.5 11.5 0 0 1-17 0l-24-26a11 11 0 0 1 8.5-18z" fill="#221D15"/>
<path d="M256 350v8" fill="none" stroke="#221D15" stroke-width="9" stroke-linecap="round"/>
<path d="M210 352c14 32 78 32 92 0" fill="none" stroke="#221D15" stroke-width="9" stroke-linecap="round"/>
<path d="M238 374c5 13 31 13 36 0z" fill="#C2453A"/>
<path d="M243 440 185 412a9 9 0 0 0-13 8v40a9 9 0 0 0 13 8l58-28z" fill="#2F3E5C"/>
<path d="M269 440l58-28a9 9 0 0 1 13 8v40a9 9 0 0 1-13 8l-58-28z" fill="#2F3E5C"/>
<rect x="243" y="425" width="26" height="30" rx="7" fill="#243149"/>
</svg>`;

/* ---------- szkielet ---------- */
function page({ title, desc, canonical, body, jsonld, mkt = 'pl', alts = null }) {
  const m = MARKETS[mkt] || MARKETS.pl;
  const S = STR[m.lang];
  const ld = (jsonld || []).map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  const H = t => href(canonical, t);
  const food = CATS[0];
  const altTags = alts ? `
  <link rel="alternate" hreflang="pl-PL" href="${SITE}${alts.pl}">
  <link rel="alternate" hreflang="en-GB" href="${SITE}${alts.uk}">
  <link rel="alternate" hreflang="en-US" href="${SITE}${alts.us}">
  <link rel="alternate" hreflang="x-default" href="${SITE}/">` : '';
  return `<!DOCTYPE html>
<html lang="${m.lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="${href(canonical, 'logo.svg')}">
<title>${title}</title>
<meta name="description" content="${desc}">
${STAGING ? '<meta name="robots" content="noindex,nofollow">' : ''}<link rel="canonical" href="${SITE}${canonical}">${altTags}
<style>${CSS}</style>
${ld}
</head>
<body>
${STAGING ? `<div style="background:#8A5A1E;color:#FAF0E2;text-align:center;padding:8px 16px;font-family:-apple-system,sans-serif;font-size:.85rem">${S.staging}</div>` : ''}
<header><div class="bar">
  <a class="mark" href="${H(mkt + '/')}"><img src="${href(canonical, 'logo-small.png')}" alt="BEKON — dogranking.com" height="46"></a>
  <nav>
    <a href="${H(mkt + '/')}">${S.nav[0]}</a><a href="${H(mkt + '/' + cSlug(food, mkt) + '/')}">${cName(food, mkt)}</a><a href="${H(mkt + '/') + '#kategorie'}">${S.nav[1]}</a>${mkt === 'pl' ? `<a href="${H('pl/wiedza/')}">Wiedza</a>` : ''}<a href="${H(mkt + '/' + (m.lang === 'pl' ? 'metodologia' : 'methodology') + '/')}">${S.nav[2]}</a>
  </nav>
  <div class="mktswitch">${Object.entries(MARKETS).map(([k, v]) => k === mkt ? `<strong>${v.flag}</strong>` : `<a href="${H(k + '/')}" title="${v.name}">${v.flag}</a>`).join(' ')}</div>
</div></header>
<main><div class="wrap">
${body}
</div></main>
<footer>${S.footer} · <a href="${H(mkt + '/' + (m.lang === 'pl' ? 'metodologia' : 'methodology') + '/')}" style="color:inherit">${S.footerMethod}</a> · <a href="${H(mkt + '/' + (m.lang === 'pl' ? 'o-nas' : 'about') + '/')}" style="color:inherit">${m.lang === 'pl' ? 'O nas' : 'About'}</a> · <a href="${H(mkt + '/' + (m.lang === 'pl' ? 'zasady' : 'principles') + '/')}" style="color:inherit">${m.lang === 'pl' ? 'Zasady i finansowanie' : 'Principles & funding'}</a></footer>
</body></html>`;
}

const ORG = {
  '@context': 'https://schema.org', '@type': 'Organization',
  name: 'DogRanking', alternateName: 'BEKON dogranking.com', url: SITE, logo: SITE + '/logo.png',
  description: 'Independent dog product ratings: dog food on FEDIAF/AAFCO thresholds and WSAVA criteria, accessories on safety research. Paw ratings 1–5. Markets: PL, UK, US.',
  sameAs: []
};
const statusBadge = (st, S) => `<span class="badge ${st === 'soon' ? '' : st}">${S.badges[st]}</span>`;

/* ---------- placeholdery zdjęć ---------- */
const PHOTO_SLOTS = isFood => isFood ? [
  { file: '01-opakowanie', label: 'Opakowanie — egzemplarz testowy u nas w domu' },
  { file: '02-etykieta', label: 'Etykieta z bliska: skład i analiza gwarantowana' },
  { file: '03-granulat', label: 'Zawartość z miarką — pomiar wielkości/konsystencji' },
  { file: '04-bekon', label: 'Werdykt Bekona — degustacja w formie przysmaku' }
] : [
  { file: '01-produkt', label: 'Produkt — egzemplarz testowy (kupiony, nie od producenta)' },
  { file: '02-detal', label: 'Detal wykonania z bliska' },
  { file: '03-pomiar', label: 'Pomiar / test wytrzymałości' },
  { file: '04-bekon', label: 'Bekon w akcji — test użytkowy' }
];
const placeholderSVG = label => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
<rect width="800" height="600" fill="#F1EADC"/>
<rect x="24" y="24" width="752" height="552" fill="none" stroke="#C9C0AE" stroke-width="3" stroke-dasharray="14 10" rx="18"/>
<g transform="translate(400,235)" stroke="#A89D88" stroke-width="9" fill="none" stroke-linecap="round">
  <circle cx="0" cy="-28" r="34"/><circle cx="-42" cy="-4" r="18"/><circle cx="42" cy="-4" r="18"/>
  <path d="M-26 22c-12 12-18 32-12 52M26 22c12 12 18 32 12 52M-14 78h28"/>
</g>
<text x="400" y="400" text-anchor="middle" font-family="Georgia,serif" font-size="32" fill="#5B5345">${label}</text>
<text x="400" y="448" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="#8B816C">Tu wstaw swoje zdjęcie (ta sama nazwa pliku)</text>
</svg>`;

/* ---------- strona produktu (uniwersalna, multi-market) ---------- */
function productPage(p, cat, mkt) {
  const m = MARKETS[mkt]; const S = STR[m.lang];
  const url = `/${mkt}/${cSlug(cat, mkt)}/${p.slug}/`;
  const isFood = cat.slug === 'karmy';
  const labels = isFood ? S.pillarLabelsFood : S.pillarLabelsOther;
  const maxes = [35, 25, 25, 15];
  const k1000 = isFood ? per1000(p) : null;
  const hasTest = !!p.test;
  const slots = PHOTO_SLOTS(isFood);
  const imgs = hasTest ? slots.map(s => `${SITE}/assets/${mkt}/${cat.slug}/${p.slug}/${s.file}.svg`) : [];

  const jsonld = [ORG, Object.assign({
    '@context': 'https://schema.org', '@type': 'Product',
    name: p.name, brand: { '@type': 'Brand', name: p.brand }, description: p.verdict,
    review: { '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: starsNum(p.score), bestRating: 5 }, author: { '@type': 'Person', name: 'Filip', url: SITE + `/${mkt}/${m.lang === 'pl' ? 'o-nas' : 'about'}/` }, datePublished: TODAY },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: starsNum(p.score), reviewCount: 1, bestRating: 5 }
  }, imgs.length ? { image: imgs } : {}), {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: p.faq.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } }))
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: `DogRanking ${mkt.toUpperCase()}`, item: SITE + `/${mkt}/` },
      { '@type': 'ListItem', position: 2, name: cName(cat, mkt), item: SITE + `/${mkt}/${cSlug(cat, mkt)}/` },
      { '@type': 'ListItem', position: 3, name: p.name, item: SITE + url }
    ]
  }];

  const methodPath = `${mkt}/${m.lang === 'pl' ? 'metodologia' : 'methodology'}/`;
  const dataTable = isFood ? `
<h2>${S.nutrition}</h2>
<table>
<tr><th>${S.param}</th><th>${S.value}</th><th>${S.ctx}</th></tr>
<tr><td>${S.form}</td><td><strong>${p.type}</strong></td><td>${S.formNote}</td></tr>
${p.flavor ? `<tr><td>${S.flavorRow}</td><td><strong>${p.flavor}</strong></td><td>—</td></tr>` : ''}
<tr><td>${S.protein}</td><td><strong>${p.proteinDM}% DM</strong></td><td>FEDIAF/AAFCO ${S.min} ${p.life === 'dorosły' || p.life === 'adult' ? '18–21' : '22,5–25'}%</td></tr>
<tr><td>${S.fat}</td><td>${p.fatDM}% DM</td><td>${S.min} ${p.life === 'dorosły' || p.life === 'adult' ? '5,5' : '8,5'}%</td></tr>
<tr><td>${S.energy}</td><td>${p.kcal} kcal ME/100 g</td><td>—</td></tr>
${k1000 ? `<tr><td><strong>${S.cost1000}</strong></td><td><strong>~${m.money(k1000)}</strong></td><td>${S.cost1000note}</td></tr>` : ''}
</table>
<p class="meta">${S.dmNote} <a href="${href(url, methodPath)}">${S.howCalc}</a></p>
<div class="protocol" style="background:#FAF0E2;border-color:#ECD9B8;color:#7a5c1e">ℹ️ ${S.variantBox}</div>` : `
<h2>${S.spec}</h2>
<table>
<tr><th>${S.param}</th><th>${S.value}</th></tr>
${p.specs.map(s => `<tr><td>${s[0]}</td><td>${s[1]}</td></tr>`).join('\n')}
</table>`;

  let testSection;
  if (hasTest) {
    const t = p.test;
    const rows = isFood ? `
<tr><td>${S.kibbleRow}</td><td><strong>${t.granulaMm ? t.granulaMm + ' mm ' + (t.granulaMm <= 12 ? S.smallOk : S.smallNo) : S.wet}</strong></td></tr>
<tr><td>${S.smellRow}</td><td>${t.zapach}</td></tr>
<tr><td>${S.textureRow}</td><td>${t.tekstura}</td></tr>` : `
<tr><td>${S.runRow}</td><td>${t.pomiar}</td></tr>
<tr><td>${S.stateRow}</td><td>${t.tekstura}</td></tr>`;
    const bekonIcon = cat.bekon === '🥣' ? '🥣' : '🎾';
    testSection = `
<h2>${S.testH}</h2>
<p class="meta">${S.testDate}: ${t.date} · ${t.uwagi}</p>
<div class="gallery">
${slots.map(s => `<figure><img src="${href(url, `assets/${mkt}/${cat.slug}/${p.slug}/${s.file}.svg`)}" alt="${p.name} — ${s.label}" loading="lazy" width="800" height="600"><figcaption>${s.label}</figcaption></figure>`).join('\n')}
</div>
<table>
<tr><th>${S.measure}</th><th>${S.value}</th></tr>${rows}
<tr><td>${isFood ? S.bekonRowFood : S.bekonRowOther}</td><td><span class="paws">${bekonIcon.repeat(t.bekon)}${'·'.repeat(3 - t.bekon)}</span> ${t.bekon}/3 — ${t.bekonNote}</td></tr>
</table>
<div class="protocol"><strong>${S.protocolHead}</strong> ${isFood ? S.protocolFood : S.protocolOther} ${S.protocolTail} <a href="${href(url, methodPath) + '#testy'}" style="color:inherit">${S.protocolLink}</a></div>`;
  } else {
    testSection = `<div class="pending">📋 ${S.testPending}</div>`;
  }

  const body = `
<p class="crumb"><a href="${href(url, mkt + '/')}">DogRanking ${mkt.toUpperCase()}</a> › <a href="${href(url, `${mkt}/${cSlug(cat, mkt)}/`)}">${cName(cat, mkt)}</a> › ${p.name}</p>
<div class="eyebrow">${S.review} · ${cName(cat, mkt)} · ${p.type}</div>
<h1>${p.name} — ${S.reviewTitle}</h1>
<p class="meta">${S.rated}: ${pawsTxt(p.score, m.lang)} <strong>${p.score}/100 · ${scoreLbl(p.score, m.lang)}</strong> · ${S.updated}: ${TODAY}${p.verified ? '' : ` · <span class="badge">${S.demo}</span>`}</p>

<h2>${S.goodChoice(p.name)}</h2>
<div class="answer">${p.verdict}</div>
${dataTable}

<h2>${S.pillarsH}</h2>
<table>
<tr><th>${S.pillar}</th><th>${S.result}</th><th>${S.max}</th></tr>
${p.pillars.map((v, i) => `<tr><td>${labels[i]}</td><td><strong>${v}</strong></td><td>${maxes[i]}</td></tr>`).join('\n')}
</table>

<div class="card"><strong>${S.pros}</strong><ul class="pc">${p.pros.map(x => `<li>${x}</li>`).join('')}</ul>
<strong>${S.cons}</strong><ul class="pc">${p.cons.map(x => `<li>${x}</li>`).join('')}</ul></div>
${testSection}
<h2>${S.faqH}</h2>
${p.faq.map(x => `<h3>${x.q}</h3><p>${x.a}</p>`).join('')}

<h2>${S.buyH}</h2>
<p class="shops">${p.shops.map(s => `<a href="${s.u}" rel="sponsored nofollow" target="_blank">${s.n} →</a>`).join('')}</p>
<p class="disclosure">${S.disclosure}</p>`;

  return { url, html: page({ title: `${p.name} — ${S.reviewTitle} (${TODAY.slice(0, 4)}) | DogRanking`, desc: p.verdict.slice(0, 155), canonical: url, body, jsonld, mkt }) };
}

/* ---------- ranking rows ---------- */
function rankRows(products, cat, mkt, fromUrl) {
  const m = MARKETS[mkt]; const S = STR[m.lang];
  const sorted = [...products].sort((a, b) => b.score - a.score);
  return sorted.map((p, i) => `<a class="rankrow" href="${href(fromUrl, `${mkt}/${cSlug(cat, mkt)}/${p.slug}/`)}">
  <span class="num">${String(i + 1).padStart(2, '0')}</span>
  <span><strong>${p.name}</strong><br><span class="meta">${p.type}${p.proteinDM ? ` · ${S.protein.toLowerCase()} ${p.proteinDM}% DM` : ''}${per1000(p) ? ` · ~${m.money(per1000(p))} / 1000 kcal` : ''} · ${p.test ? S.testedByUs : S.labelBased}</span></span>
  <span>${pawsTxt(p.score, m.lang)}</span>
  <span class="gobtn">${p.test ? S.seeReview : S.seeReviewLabel}</span>
</a>`).join('');
}

/* ---------- atrybuty do dopasowania (wyliczane z pól rekordu) ---------- */
function matchAttrs(p) {
  const txt = (p.name + ' ' + (p.flavor || '') + ' ' + (p.verdict || '') + ' ' + (p.pros || []).join(' ') + ' ' + (p.cons || []).join(' ')).toLowerCase();
  const noPoultry = (p.pros || []).some(x => /bez kurczaka|bez drobiu|no chicken|chicken-free|poultry-free/i.test(x));
  const chicken = !noPoultry && /(kurcz|drob|drób|indyk|kacz|poultry|chicken|turkey|duck)/.test(txt);
  const legumesHigh = (p.cons || []).some(x => /strączkow|legume/i.test(x));
  const grainFree = /bez zbóż|grain-free|bezzboż/.test(txt);
  const epaDha = (p.pros || []).some(x => /epa|dha/i.test(x));
  const life = /wszystkie etapy|all life stages/i.test(p.life || '') ? 'all' : (/szczen|puppy/i.test(p.life || '') ? 'puppy' : 'adult');
  return { s: p.slug, n: p.name, fl: p.flavor || '', t: p.type, sc: p.score, pd: p.proteinDM, fd: p.fatDM, pr: per1000(p) || 0, test: p.test ? 1 : 0, ch: chicken ? 1 : 0, lg: legumesHigh ? 1 : 0, ed: epaDha ? 1 : 0, life };
}
function foodMatchPanel(products, mkt) {
  const m = MARKETS[mkt]; const S = STR[m.lang]; const P = S.prof;
  const data = products.map(matchAttrs);
  const sel = (id, opts) => `<div class="pf-g"><label>${P[id]}</label><select id="pf-${id}">${opts.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select></div>`;
  const jsTexts = JSON.stringify({ matchLbl: P.matchLbl, blocked: P.blocked, money: mkt === 'pl' ? 'zł' : (mkt === 'uk' ? '£' : '$'), prot: S.protein.toLowerCase(), tested: S.testedByUs, label: S.labelBased, see: S.seeReview, seeL: S.seeReviewLabel, paws: '', wAllergy: P.wAllergy, wPanc: P.wPanc, wPup: P.wPup, wKidney: P.wKidney, wLegume: P.wLegume });
  // funkcja rysująca łapki w JS (te same kształty co serwerowe)
  return `
<div class="profile">
  <h3>${P.h}</h3>
  <p class="meta" style="margin:0 0 12px">${P.sub}</p>
  <div class="pf-row">${sel('age', P.ageOpts)}${sel('size', P.sizeOpts)}${sel('health', P.healthOpts)}</div>
  <button class="pf-reset" id="pf-reset">${P.reset}</button>
</div>
<div class="matchlegend" id="pf-legend" style="display:none">${P.legend}</div>
<script>
(function(){
  var FOODS=${JSON.stringify(data)}, T=${jsTexts};
  var PAW='<svg viewBox="0 0 24 24" style="width:18px;height:18px;display:inline-block;margin-right:2px;vertical-align:middle" aria-hidden="true"><circle cx="5" cy="10.2" r="2.2"/><circle cx="9.4" cy="6.9" r="2.4"/><circle cx="14.6" cy="6.9" r="2.4"/><circle cx="19" cy="10.2" r="2.2"/><path d="M12 11.4c3.1 0 5.7 2.3 5.7 5 0 1.8-1.4 3.2-3.3 3.2-.9 0-1.5-.3-2.4-.3s-1.5.3-2.4.3c-1.9 0-3.3-1.4-3.3-3.2 0-2.7 2.6-5 5.7-5z"/></svg>';
  function paws(sc){var f=sc>=90?5:sc>=80?4.5:sc>=70?4:sc>=60?3.5:sc>=50?3:sc>=30?2:1;var full=Math.floor(f),half=f%1?1:0;
    var fill='<span style="display:inline-block;white-space:nowrap;overflow:hidden;width:'+(f*20)+'%;position:absolute;left:0;top:0">'+Array(5).fill('<span style="fill:var(--gold)">'+PAW+'</span>').join('')+'</span>';
    return '<span style="position:relative;display:inline-block;line-height:0">'+fill+'<span style="white-space:nowrap;fill:#DCD2BD">'+Array(5).fill(PAW).join('')+'</span></span>';}
  function calc(f,P){
    var w=[],b=null,pct=72;
    if(P.age==='szczenie'&&f.life==='adult') b=T.wPup;
    if(!b&&P.health==='alergia'&&f.ch) b=T.wAllergy;
    if(!b&&P.health==='trzustka'&&f.fd>15) b=T.wPanc;
    if(!b){
      if(P.health==='nerki'){w.push(T.wKidney);pct-=18;}
      if(P.age==='senior'){pct+=f.pd>=28?8:-5;pct+=f.ed?6:0;}
      if(P.age==='szczenie')pct+=6;
      if(P.size==='maly')pct+=f.t==='sucha'?3:0;
      if(P.size==='duzy')pct+=f.ed?5:0;
      if(P.health==='nadwaga')pct+=f.fd<=12?12:-8;
      if(P.health==='stawy')pct+=f.ed?12:-3;
      if(f.lg){pct-=4;w.push(T.wLegume);}
      pct+=(f.sc-70)/6; pct=Math.max(40,Math.min(98,Math.round(pct)));
    }
    return {b:b,pct:pct,w:w};
  }
  function render(P){
    var list=FOODS.map(function(f){return {f:f,m:calc(f,P)};});
    list.sort(function(a,b){if(!!a.m.b!==!!b.m.b)return a.m.b?1:-1; if(a.m.b)return b.f.sc-a.f.sc; return (b.m.pct-a.m.pct)||(b.f.sc-a.f.sc);});
    var html=list.map(function(it,i){var f=it.f,mm=it.m;
      var meta=f.t+(f.pd?' · '+T.prot+' '+f.pd+'% DM':'')+(f.pr?' · ~'+f.pr+' '+T.money+' / 1000 kcal':'')+(f.fl?' · '+f.fl:'');
      var match = mm.b
        ? '<div class="match bad"><b style="color:var(--terra)">✕ '+T.blocked+'</b></div>'
        : '<div class="match'+(mm.pct<55?' bad':'')+'"><b>'+T.matchLbl+': '+mm.pct+'%</b><div class="mbar"><i style="width:'+mm.pct+'%"></i></div></div>';
      var warn=(mm.b?[mm.b]:mm.w).map(function(x){return '<div class="warnline">⚠ '+x+'</div>';}).join('');
      return '<a class="rankrow'+(mm.b?' blocked':'')+'" href="'+f.s+'/">'
        +'<span class="num">'+String(i+1).padStart(2,'0')+'</span>'
        +'<span><strong>'+f.n+'</strong><br><span class="meta">'+meta+' · '+(f.test?T.tested:T.label)+'</span>'+match+warn+'</span>'
        +'<span>'+paws(f.sc)+'</span>'
        +'<span class="gobtn">'+(f.test?T.see:T.seeL)+'</span></a>';
    }).join('');
    document.getElementById('ranklist').innerHTML=html;
    document.getElementById('pf-legend').style.display='block';
    document.getElementById('pf-reset').style.display='inline-block';
  }
  function readP(){return {age:document.getElementById('pf-age').value,size:document.getElementById('pf-size').value,health:document.getElementById('pf-health').value};}
  ['pf-age','pf-size','pf-health'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('change',function(){
    var p=readP();render(p);try{localStorage.setItem('dr_dog',JSON.stringify(p));}catch(e){}
  });});
  var rst=document.getElementById('pf-reset');if(rst)rst.addEventListener('click',function(){
    document.getElementById('pf-age').value='dorosly';document.getElementById('pf-size').value='sredni';document.getElementById('pf-health').value='ok';
    location.reload();
  });
  try{var saved=JSON.parse(localStorage.getItem('dr_dog')||'null');if(saved){document.getElementById('pf-age').value=saved.age;document.getElementById('pf-size').value=saved.size;document.getElementById('pf-health').value=saved.health;render(saved);}}catch(e){}
})();
</script>`;
}

/* ---------- hub kategorii ---------- */
function categoryHub(cat, mkt) {
  const m = MARKETS[mkt]; const S = STR[m.lang];
  const url = `/${mkt}/${cSlug(cat, mkt)}/`;
  const products = (PRODUCTS[mkt] || {})[cat.slug] || [];
  const displayStatus = products.length ? cat.status : (cat.status === 'edu' ? 'edu' : 'soon');
  const jsonld = [ORG];
  if (products.length) jsonld.push({
    '@context': 'https://schema.org', '@type': 'ItemList', name: `${cName(cat, mkt)} — DogRanking ${mkt.toUpperCase()}`,
    itemListElement: [...products].sort((a, b) => b.score - a.score).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + `/${mkt}/${cSlug(cat, mkt)}/${p.slug}/`, name: p.name }))
  });
  const methodPath = `${mkt}/${m.lang === 'pl' ? 'metodologia' : 'methodology'}/`;

  let content = '';
  if (cat.slug === 'karmy' && products.length) {
    content = `
<h2 id="ranking">${S.rankingH}</h2>
<p class="meta">${S.updated}: ${TODAY} · ${S.metaRank(products.length)}</p>
${foodMatchPanel(products, mkt)}
<div id="ranklist">${rankRows(products, cat, mkt, url)}</div>
<h2>${S.formsH}</h2>
<div class="answer">${S.formsTxt}</div>
<table><tr><th>${S.formCol}</th><th>${S.formNoteCol}</th></tr>${FOOD_FORMS[m.lang].map(f => `<tr><td><strong>${f[0]}</strong></td><td>${f[1]}</td></tr>`).join('')}</table>`;
  } else if (products.length) {
    content = `
<h2 id="ranking">${S.betaH}</h2>
<p class="meta">${S.updated}: ${TODAY}</p>
${rankRows(products, cat, mkt, url)}`;
  } else if (cat.status === 'edu' && cat.slug === 'zdrowie') {
    content = m.lang === 'pl' ? `
<div class="legalbox"><strong>Dlaczego nie rankingujemy leków?</strong> Tabletki przeciwkleszczowe (Bravecto, NexGard, Simparica) to w Polsce leki na receptę, a reklama publiczna leków Rp. jest zakazana (Prawo farmaceutyczne, rozp. UE 2019/6). W tej strefie znajdziesz wyłącznie materiały edukacyjne o substancjach czynnych — bez ocen, bez łapek i bez linków zakupowych do leków. Decyzję zawsze podejmuj z lekarzem weterynarii.</div>
<h2>Przewodnik po substancjach czynnych (w przygotowaniu)</h2>
<table>
<tr><th>Substancja</th><th>Forma</th><th>Dostępność w PL</th><th>Co warto wiedzieć</th></tr>
<tr><td>Fipronil</td><td>krople spot-on</td><td>bez recepty</td><td>działa kontaktowo; najdłużej na rynku</td></tr>
<tr><td>Imidaklopryd + permetryna</td><td>krople spot-on</td><td>bez recepty</td><td>permetryna silnie toksyczna dla kotów w domu!</td></tr>
<tr><td>Imidaklopryd + flumetryna</td><td>obroża</td><td>bez recepty</td><td>działanie do 8 mies.; dobierz rozmiar</td></tr>
<tr><td>Izoksazoliny (fluralaner, afoksolaner, sarolaner)</td><td>tabletki</td><td><strong>na receptę</strong></td><td>FDA ostrzega o możliwych objawach neurologicznych — omów z lekarzem, zwłaszcza przy padaczce</td></tr>
</table>
<p class="meta">Treść edukacyjna konsultowana z lekarzem weterynarii (w przygotowaniu). Nie zastępuje wizyty w gabinecie.</p>` : `
<div class="legalbox"><strong>Why we don't rank medicines.</strong> Oral tick & flea products (isoxazolines: Bravecto, NexGard, Simparica) are prescription medicines (POM-V in the UK; Rx via FDA in the US), and advertising prescription veterinary medicines to the public is restricted. This zone is educational only — active-substance guides, no ratings, no shopping links for medicines. Always decide with your veterinarian.</div>
<h2>Active-substance guide (in preparation)</h2>
<table>
<tr><th>Substance</th><th>Form</th><th>Availability</th><th>Worth knowing</th></tr>
<tr><td>Fipronil</td><td>spot-on</td><td>OTC</td><td>contact action; longest market record</td></tr>
<tr><td>Imidacloprid + flumethrin</td><td>collar</td><td>OTC / NFA-VPS (UK)</td><td>up to 8 months; size matters; see EPA incident discussions (Seresto)</td></tr>
<tr><td>Isoxazolines (fluralaner, afoxolaner, sarolaner)</td><td>chewable tablets</td><td><strong>prescription</strong></td><td>FDA fact sheet: potential neurologic adverse events (seizures) — discuss with your vet, especially with epilepsy history</td></tr>
</table>
<p class="meta">Educational content, veterinary review in progress. Not a substitute for a vet visit.</p>`;
  } else if (cat.status === 'edu') {
    content = m.lang === 'pl' ? `
<h2>Ubezpieczenia dla psów — najpierw edukacyjnie</h2>
<div class="answer">W Wielkiej Brytanii ubezpieczonych jest ok. 25% psów; w Polsce rynek dopiero raczkuje. Zanim porównamy oferty, nauczymy Cię czytać polisy.</div>
<h3>Na co patrzeć w polisie (zanim spojrzysz na cenę)</h3>
<ul class="pc">
<li>Wyłączenia: choroby istniejące przed zakupem, choroby rasowe (dysplazja u labradora!)</li>
<li>Limity roczne i podlimity na zdarzenie</li>
<li>Karencje (ile dni od zakupu polisa nie działa)</li>
<li>Udział własny i jak rośnie z wiekiem psa</li>
<li>Czy polisa odnawia się po poważnej diagnozie</li>
</ul>
<p class="meta">Rankingi ubezpieczeń uruchomimy najpierw dla rynków UK i US.</p>` : `
<h2>Pet insurance — rankings coming to this market first</h2>
<div class="answer">${mkt === 'uk' ? 'Around 25% of UK dogs are insured — the most mature pet-insurance market in the world (Petplan, ManyPets, Animal Friends, Agria).' : 'The US market (Lemonade, Healthy Paws, Trupanion, Embrace) is growing fast.'} Before we compare offers, learn to read a policy.</div>
<h3>What to check before the price</h3>
<ul class="pc">
<li>Exclusions: pre-existing and breed-specific conditions (hip dysplasia in Labradors!)</li>
<li>Annual limits and per-condition sub-limits</li>
<li>Waiting periods after purchase</li>
<li>Excess/co-pay and how it grows with the dog's age</li>
<li>Whether cover renews after a serious diagnosis (lifetime vs per-condition)</li>
</ul>
<p class="meta">${S.updated}: ${TODAY} · comparison rankings in preparation for this market.</p>`;
  } else {
    content = `
<h2>${S.soonH}</h2>
<div class="answer">${S.soonTxt}</div>`;
  }

  const alts = { pl: `/pl/${cat.slug}/`, uk: `/uk/${cat.slugEn}/`, us: `/us/${cat.slugEn}/` };
  const body = `
<p class="crumb"><a href="${href(url, mkt + '/')}">DogRanking ${mkt.toUpperCase()}</a> › ${cName(cat, mkt)}</p>
<div class="eyebrow">${cat.icon} ${S.catEyebrow} · ${MARKETS[mkt].name}</div>
<h1>${cName(cat, mkt)} ${statusBadge(displayStatus, S)}</h1>
<p class="lead">${cDesc(cat, mkt)}</p>
${content}
<h2>${S.howWeRateCat}</h2>
<ul class="pc">${cCrit(cat, mkt).map(c => `<li>${c}</li>`).join('')}</ul>
<p class="meta"><a href="${href(url, methodPath)}">${S.fullMethod}</a></p>
${products.length ? `<p class="disclosure">${S.hubDisclosure}</p>` : ''}`;

  return { url, html: page({ title: `${cName(cat, mkt)} — DogRanking ${MARKETS[mkt].name}`, desc: cDesc(cat, mkt).slice(0, 155), canonical: url, body, jsonld, mkt, alts }) };
}

/* ---------- strona główna rynku ---------- */
function homeMkt(mkt) {
  const m = MARKETS[mkt]; const S = STR[m.lang];
  const url = `/${mkt}/`;
  const foods = (PRODUCTS[mkt] || {}).karmy || [];
  const top = [...foods].sort((a, b) => b.score - a.score).slice(0, 3);
  const methodPath = `${mkt}/${m.lang === 'pl' ? 'metodologia' : 'methodology'}/`;
  const body = `
<div class="eyebrow">${S.homeEyebrow} · ${m.flag} ${m.name}</div>
<h1>${S.homeH1}</h1>
<p class="lead">${S.homeLead}</p>

<h2 id="kategorie">${S.whatWeRate}</h2>
<div class="catgrid">
${CATS.map(c => {
    const prods = (PRODUCTS[mkt] || {})[c.slug] || [];
    const st = prods.length ? c.status : (c.status === 'edu' ? 'edu' : 'soon');
    return `<a class="catcard" href="${href(url, `${mkt}/${cSlug(c, mkt)}/`)}">
  <span class="ic">${c.icon}</span><h3>${cName(c, mkt)}</h3><p>${cDesc(c, mkt)}</p>${statusBadge(st, S)}
</a>`;
  }).join('\n')}
</div>

${top.length ? `<h2>${S.top3}</h2>
<p class="meta">${S.updated}: ${TODAY}</p>
${rankRows(top, CATS[0], mkt, url)}
<p><a href="${href(url, `${mkt}/${cSlug(CATS[0], mkt)}/`)}" class="gobtn" style="font-family:-apple-system,sans-serif;font-weight:600;color:var(--terra);text-decoration:none">${S.fullRank}</a></p>` : ''}

${mkt === 'pl' ? `<h2>Z bazy wiedzy — badania, nie opinie</h2>
<div class="catgrid">
${ARTS.slice(0, 3).map(a => artCard(a, url)).join('\n')}
</div>
<p><a href="${href(url, 'pl/wiedza/')}" class="gobtn" style="font-family:-apple-system,sans-serif;font-weight:600;color:var(--terra);text-decoration:none">Wszystkie artykuły (${ARTS.length}) →</a></p>` : ''}

<h2>${S.howWeRate}</h2>
<p>${S.howWeRateTxt} <a href="${href(url, methodPath)}">${S.methodLink}</a></p>`;
  const alts = { pl: '/pl/', uk: '/uk/', us: '/us/' };
  const titles = {
    pl: 'DogRanking — niezależne oceny produktów dla psów (karmy, akcesoria, tech)',
    uk: 'DogRanking UK — independent dog food & product ratings',
    us: 'DogRanking US — independent dog food & product ratings'
  };
  const descs = {
    pl: 'Karmy, gryzaki, szelki, GPS — jawny 100-punktowy algorytm, prawdziwe testy, oceny w łapkach. Normy FEDIAF, kryteria WSAVA, badania zamiast marketingu.',
    uk: 'Dog food rated on FEDIAF thresholds and WSAVA criteria, accessories on safety research. Transparent 100-point algorithm, paw ratings, UK availability and prices.',
    us: 'Dog food rated on AAFCO thresholds and WSAVA criteria, accessories on safety research. Transparent 100-point algorithm, paw ratings, US availability and prices.'
  };
  return { url, html: page({ title: titles[mkt], desc: descs[mkt], canonical: url, body, jsonld: [ORG], mkt, alts }) };
}

/* ---------- metodologia ---------- */
function methodPage(mkt) {
  const m = MARKETS[mkt]; const S = STR[m.lang];
  const url = `/${mkt}/${m.lang === 'pl' ? 'metodologia' : 'methodology'}/`;
  const alts = { pl: '/pl/metodologia/', uk: '/uk/methodology/', us: '/us/methodology/' };
  const body = m.lang === 'pl' ? `
<p class="crumb"><a href="${href(url, 'pl/')}">DogRanking PL</a> › Metodologia</p>
<div class="eyebrow">Metodologia</div>
<h1>Jak powstaje ocena</h1>
<h2>Ile punktów może dostać produkt?</h2>
<div class="answer">Maksymalnie 100 punktów w czterech filarach. Szkielet jest wspólny dla wszystkich kategorii, kryteria — dopasowane do każdej z nich. 90+ punktów to ocena Wybitna (5 łapek 🐾), poniżej 30 — Unikaj (1 łapka).</div>
<table>
<tr><th>Filar</th><th>Karmy</th><th>Akcesoria / zabawki</th><th>Tech</th></tr>
<tr><td><strong>A (35)</strong></td><td>Skład i jakość białka (sucha masa vs FEDIAF)</td><td>Materiały i wykonanie</td><td>Parametry mierzalne</td></tr>
<tr><td><strong>B (25)</strong></td><td>Normy: feeding trial > formulacja</td><td>Bezpieczeństwo: certyfikaty (CPS, VOHC), badania</td><td>Deklaracje vs nasze pomiary</td></tr>
<tr><td><strong>C (25)</strong></td><td>Producent wg kryteriów WSAVA</td><td>Transparentność, historia wycofań</td><td>Wsparcie, prywatność danych</td></tr>
<tr><td><strong>D (15)</strong></td><td>Dodatki i przetwarzanie</td><td>Ergonomia i trwałość</td><td>Aplikacja, koszty abonamentu</td></tr>
</table>
<h2>Dlaczego karmy liczymy na suchej masie i w zł za 1000 kcal?</h2>
<div class="answer">Analiza gwarantowana podaje wartości razem z wodą: mokra karma z 8% białka ma w suchej masie 40%. A ceny za kilogram nie da się porównać między formą suchą (375 kcal/100 g) i mokrą (110 kcal/100 g) — dlatego liczymy koszt 1000 kcal.</div>
<h2>Co oceniamy, czego nie widać na etykiecie?</h2>
<div class="answer">Filar C ocenia producenta wg pytań WSAVA: nutrycjonista (ACVN/ECVCN), próby żywieniowe, udostępnianie danych o strawności, kontrola jakości, historia wycofań.</div>
<h2>Legenda łapek</h2>
<table>
<tr><th>Punkty</th><th>Ocena</th><th>Etykieta</th></tr>
<tr><td>90–100</td><td>${pawsTxt(95)}</td><td>Wybitna</td></tr>
<tr><td>80–89</td><td>${pawsTxt(85)}</td><td>Znakomita</td></tr>
<tr><td>70–79</td><td>${pawsTxt(75)}</td><td>Bardzo dobra</td></tr>
<tr><td>60–69</td><td>${pawsTxt(65)}</td><td>Dobra</td></tr>
<tr><td>50–59</td><td>${pawsTxt(55)}</td><td>Przyzwoita</td></tr>
<tr><td>30–49</td><td>${pawsTxt(40)}</td><td>Słaba</td></tr>
<tr><td>&lt;30</td><td>${pawsTxt(20)}</td><td>Unikaj</td></tr>
</table>
<h2>Trzy skale, żeby niczego nie mieszać</h2>
<ul class="pc">
<li><strong>Łapki 🐾 (1–5)</strong> — jakość produktu. Zawsze i wszędzie.</li>
<li><strong>Miski 🥣 (0–3)</strong> — smakowitość rzeczy jadalnych w degustacji Bekona. Nie wpływa na łapki.</li>
<li><strong>Piłki 🎾 (0–3)</strong> — akceptacja rzeczy niejadalnych w teście użytkowym. Nie wpływa na łapki.</li>
</ul>
<p>Diety weterynaryjne oceniamy w osobnej kategorii. Karmy surowe bez dowodu kompletności i kontroli patogenów mają sufit 2 łapek. Recenzje bez sekcji testu są jawnie oznaczone „ocena z etykiety" — test dodaje zdjęcia i pomiary, nigdy nie zmienia punktacji.</p>
<h2 id="testy">Jak testujemy — i dlaczego Bekon nie je wszystkiego</h2>
<div class="answer">Każdy testowany produkt fizycznie kupujemy i dokumentujemy zdjęciami. Karmy: pomiar granuli, zapach, tekstura, a degustacja to kilka granulek jako przysmak — nigdy zmiana diety. Akcesoria: test w codziennym użytkowaniu. Werdykty Bekona nie wpływają na punktację.</div>
<p><strong>Dlaczego tak?</strong> Częsta zmiana karmy może powodować problemy żołądkowo-jelitowe — bezpieczne przejście to 7–10 dni. Nasz pies-tester ma stałą dietę, a karmy testowe poznaje jako pojedyncze smaczki. <strong>Produkty po teście</strong> przekazujemy lokalnemu schronisku.</p>
<h2>Strefa Zdrowie — zasady specjalne</h2>
<div class="legalbox">Leki weterynaryjne na receptę nie podlegają rankingowaniu ani linkowaniu zakupowemu — reklama publiczna leków Rp. jest w Polsce zakazana. Publikujemy wyłącznie materiały edukacyjne, konsultowane z lekarzem weterynarii.</div>` : `
<p class="crumb"><a href="${href(url, mkt + '/')}">DogRanking ${mkt.toUpperCase()}</a> › Methodology</p>
<div class="eyebrow">Methodology</div>
<h1>How a rating is made</h1>
<h2>How many points can a product earn?</h2>
<div class="answer">Up to 100 points across four pillars. The skeleton is shared by all categories; criteria adapt to each. 90+ points means Outstanding (5 paws 🐾), below 30 — Avoid (1 paw).</div>
<table>
<tr><th>Pillar</th><th>Dog food</th><th>Accessories / toys</th><th>Tech</th></tr>
<tr><td><strong>A (35)</strong></td><td>Recipe & protein quality (dry matter vs FEDIAF/AAFCO)</td><td>Materials & build</td><td>Measurable performance</td></tr>
<tr><td><strong>B (25)</strong></td><td>Standards: feeding trial > formulation</td><td>Safety: certificates (CPS, VOHC), research</td><td>Claims vs our measurements</td></tr>
<tr><td><strong>C (25)</strong></td><td>Manufacturer per WSAVA criteria</td><td>Transparency, recall history</td><td>Support, data privacy</td></tr>
<tr><td><strong>D (15)</strong></td><td>Additives & processing</td><td>Ergonomics & durability</td><td>App, subscription costs</td></tr>
</table>
<h2>Why dry matter and cost per 1,000 kcal?</h2>
<div class="answer">Guaranteed analysis includes water: a wet food with 8% protein has 40% on a dry-matter basis. And price per kilo cannot compare dry (375 kcal/100 g) with wet (110 kcal/100 g) — so we cost every food per 1,000 kcal.</div>
<h2>What we rate that labels can't show</h2>
<div class="answer">Pillar C scores the manufacturer on WSAVA Global Nutrition Committee questions: a qualified nutritionist (ACVN/ECVCN), feeding trials, digestibility data on request, quality control, recall history in context.</div>
<h2>Paw legend</h2>
<table>
<tr><th>Points</th><th>Rating</th><th>Label</th></tr>
<tr><td>90–100</td><td>${pawsTxt(95, 'en')}</td><td>Outstanding</td></tr>
<tr><td>80–89</td><td>${pawsTxt(85, 'en')}</td><td>Excellent</td></tr>
<tr><td>70–79</td><td>${pawsTxt(75, 'en')}</td><td>Very good</td></tr>
<tr><td>60–69</td><td>${pawsTxt(65, 'en')}</td><td>Good</td></tr>
<tr><td>50–59</td><td>${pawsTxt(55, 'en')}</td><td>Decent</td></tr>
<tr><td>30–49</td><td>${pawsTxt(40, 'en')}</td><td>Poor</td></tr>
<tr><td>&lt;30</td><td>${pawsTxt(20, 'en')}</td><td>Avoid</td></tr>
</table>
<h2>Three scales, so nothing gets mixed up</h2>
<ul class="pc">
<li><strong>Paws 🐾 (1–5)</strong> — product quality. Always.</li>
<li><strong>Bowls 🥣 (0–3)</strong> — palatability of edibles in Bekon's tasting. Never affects paws.</li>
<li><strong>Balls 🎾 (0–3)</strong> — acceptance of non-edibles in usage tests. Never affects paws.</li>
</ul>
<p>Veterinary diets are rated in their own category. Raw foods without completeness proof and pathogen control are capped at 2 paws. Reviews without a hands-on section are clearly marked "label-based" — testing adds photos and measurements, it never changes the score.</p>
<h2 id="testy">How we test — and why Bekon doesn't eat everything</h2>
<div class="answer">Every tested product is bought by us and photo-documented. Foods: kibble measurement, smell, texture; tasting means a few kibbles as a treat — never a diet change (a safe transition takes 7–10 days). Bekon's verdicts never affect the 0–100 score. Opened test bags go to a local shelter.</div>
<h2>Health zone — special rules</h2>
<div class="legalbox">Prescription veterinary medicines are never ranked or affiliate-linked (POM-V in the UK, Rx in the US). The Health zone is educational only, with veterinary review.</div>`;
  return { url, html: page({ title: m.lang === 'pl' ? 'Metodologia oceny | DogRanking' : 'Rating methodology | DogRanking', desc: m.lang === 'pl' ? 'Jawny algorytm: 4 filary, 100 punktów, łapki 1–5. Karmy w suchej masie i zł/1000 kcal.' : 'Transparent algorithm: 4 pillars, 100 points, paw ratings 1–5. Dog food on dry matter and cost per 1,000 kcal.', canonical: url, body, jsonld: [ORG], mkt, alts }) };
}

/* ---------- O nas (E-E-A-T: autor + ProfilePage) ---------- */
function aboutPage(mkt) {
  const m = MARKETS[mkt];
  const url = `/${mkt}/${m.lang === 'pl' ? 'o-nas' : 'about'}/`;
  const alts = { pl: '/pl/o-nas/', uk: '/uk/about/', us: '/us/about/' };
  const jsonld = [ORG, {
    '@context': 'https://schema.org', '@type': 'ProfilePage',
    mainEntity: { '@type': 'Person', name: 'Filip', url: SITE + url, jobTitle: m.lang === 'pl' ? 'Założyciel i redaktor DogRanking' : 'Founder & editor, DogRanking', knowsAbout: ['dog food', 'canine nutrition', 'dog products'], sameAs: [] }
  }];
  const dogs = m.lang === 'pl' ? [
    ['Amerykański pitbull', 'Nauczył mnie, że za groźną etykietą może kryć się najczulsze serce.'],
    ['Doberman', 'Elegancki atleta — potrzebował paliwa zupełnie innego niż kanapowy leniuch.'],
    ['Biały owczarek szwajcarski', 'Wrażliwy żołądek. To przy nim pierwszy raz naprawdę przeczytałem skład karmy — i nie zrozumiałem z niego nic.'],
    ['Dwa mieszańce', 'Przygarnięte przez rodzinę. Psy „z niespodzianką” — bez rodowodu i bez instrukcji obsługi.'],
    ['Bekon · pudel miniaturowy · 2,5 roku', 'Obecny szef. Apetyt godny imienia. Testuje wszystko, o czym tu piszemy.']
  ] : [
    ['American Pit Bull', 'Taught me that the scariest label can hide the softest heart.'],
    ['Dobermann', 'A sleek athlete — he needed completely different fuel than a couch potato.'],
    ['White Swiss Shepherd', 'A sensitive stomach. He made me read a dog food label properly for the first time — and understand none of it.'],
    ['Two rescue mutts', 'Taken in by my family. Dogs with no pedigree and no manual.'],
    ['Bekon · miniature poodle · 2.5 yrs', 'Current boss. An appetite worthy of his name ("Bekon" = Bacon). Taste-tests everything reviewed here.']
  ];
  const body = m.lang === 'pl' ? `
<p class="crumb"><a href="${href(url, 'pl/')}">DogRanking PL</a> › O nas</p>
<div class="eyebrow">O nas</div>
<h1>Sześć psów, <em style="color:var(--terra)">jedna lekcja</em></h1>
<p class="lead" style="font-style:italic">Nazywam się Filip i przez całe życie towarzyszyły mi psy — bardzo różne psy.</p>
<table>${dogs.map(d => `<tr><td><strong>${d[0]}</strong></td><td>${d[1]}</td></tr>`).join('')}</table>
<div class="answer"><strong>Sześć psów, sześć różnych żołądków, sześć różnych potrzeb. I jedna wspólna lekcja: na opakowaniu karmy najważniejsze jest to, co napisano najdrobniejszym drukiem. Ten portal czyta to za Ciebie.</strong></div>
<p>Nie sprzedajemy karmy. Sprawdzamy ją. A Bekon degustuje. Wszystkie oceny powstają wg jawnej <a href="${href(url, 'pl/metodologia/')}">metodologii</a>, a o tym, jak zarabiamy, piszemy wprost na stronie <a href="${href(url, 'pl/zasady/')}">Zasady i finansowanie</a>.</p>
<p class="meta">Konsultacja weterynaryjna treści zdrowotnych: w trakcie nawiązywania współpracy — do tego czasu treści zdrowotne mają charakter wyłącznie edukacyjny.</p>` : `
<p class="crumb"><a href="${href(url, mkt + '/')}">DogRanking ${mkt.toUpperCase()}</a> › About</p>
<div class="eyebrow">About</div>
<h1>Six dogs, <em style="color:var(--terra)">one lesson</em></h1>
<p class="lead" style="font-style:italic">My name is Filip, and dogs have been part of my life for as long as I can remember — very different dogs.</p>
<table>${dogs.map(d => `<tr><td><strong>${d[0]}</strong></td><td>${d[1]}</td></tr>`).join('')}</table>
<div class="answer"><strong>Six dogs, six different stomachs, six different needs. One lesson: the most important thing on a bag of dog food is written in the smallest print. This site reads it for you.</strong></div>
<p>We don't sell dog food. We check it. Bekon does the tasting. Every rating follows our transparent <a href="${href(url, mkt + '/methodology/')}">methodology</a>, and we explain exactly how we earn on the <a href="${href(url, mkt + '/principles/')}">Principles & funding</a> page.</p>
<p class="meta">Hands-on tests are currently performed on the Polish market (where Bekon lives); UK/US reviews are label-based and clearly marked as such until local testing begins.</p>`;
  return { url, html: page({ title: m.lang === 'pl' ? 'O nas — sześć psów, jedna lekcja | DogRanking' : 'About us — six dogs, one lesson | DogRanking', desc: m.lang === 'pl' ? 'Kim jesteśmy i dlaczego czytamy etykiety karm. Historia sześciu psów i pudla Bekona — głównego testera DogRanking.' : 'Who we are and why we read dog food labels. The story of six dogs and Bekon the miniature poodle — DogRanking’s chief taste-tester.', canonical: url, body, jsonld, mkt, alts }) };
}

/* ---------- Zasady i finansowanie (E-E-A-T: polityki) ---------- */
function principlesPage(mkt) {
  const m = MARKETS[mkt];
  const url = `/${mkt}/${m.lang === 'pl' ? 'zasady' : 'principles'}/`;
  const alts = { pl: '/pl/zasady/', uk: '/uk/principles/', us: '/us/principles/' };
  const body = m.lang === 'pl' ? `
<p class="crumb"><a href="${href(url, 'pl/')}">DogRanking PL</a> › Zasady i finansowanie</p>
<div class="eyebrow">Przejrzystość</div>
<h1>Zasady i finansowanie</h1>
<h2>Jak zarabiamy?</h2>
<div class="answer">DogRanking utrzymuje się z linków afiliacyjnych: gdy kupisz produkt przez link „Gdzie kupić”, sklep płaci nam prowizję — Twoja cena się nie zmienia. Każdy taki link jest oznaczony (rel="sponsored"), a przy każdej liście produktów znajdziesz jawną informację o afiliacji.</div>
<h2>Dlaczego prowizje nie wpływają na oceny?</h2>
<ul class="pc">
<li><strong>Kolejność prac:</strong> punktacja 0–100 powstaje z analizy składu, norm i danych producenta — zanim sprawdzimy, gdzie produkt można kupić i czy sklep ma program partnerski.</li>
<li><strong>Brak płatnych miejsc:</strong> producent nie może kupić pozycji w rankingu, recenzji ani „łapek”. Nie publikujemy treści sponsorowanych w rankingach.</li>
<li><strong>Wiele sklepów:</strong> przy produktach linkujemy do co najmniej dwóch sprzedawców, gdy to możliwe — także tych bez prowizji.</li>
<li><strong>Egzemplarze testowe kupujemy sami</strong> — nie przyjmujemy darmowych produktów od producentów do recenzji punktowanych.</li>
</ul>
<h2>Polityka korekt</h2>
<p>Mylimy się? Popraw nas. Każda merytoryczna korekta jest nanoszona z adnotacją i datą w changelogu strony, której dotyczy. Zgłoszenia: przez formularz kontaktowy (w przygotowaniu) lub profil w social mediach.</p>
<h2>Treści zdrowotne</h2>
<div class="legalbox">Nie rankingujemy leków weterynaryjnych na receptę i nie linkujemy do nich zakupowo (Prawo farmaceutyczne). Treści o zdrowiu mają charakter edukacyjny i nie zastępują porady lekarza weterynarii.</div>
<h2>Skala wiarygodności źródeł A/B/C/D</h2>
<p>Artykuły w zakładce Wiedza oznaczamy siłą dowodów: <span class="grade gA">A</span> mocne (zaślepione RCT/metaanalizy, pomiary kliniczne), <span class="grade gB">B</span> umiarkowane (dobre badania kontrolowane/kohortowe), <span class="grade gC">C</span> słabe/wschodzące (ankiety, przekroje, finansowanie kierunkowe), <span class="grade gD">D</span> niewystarczające/marketingowe. Ankieta właścicieli to maksymalnie C — niezależnie od wielkości próby.</p>` : `
<p class="crumb"><a href="${href(url, mkt + '/')}">DogRanking ${mkt.toUpperCase()}</a> › Principles & funding</p>
<div class="eyebrow">Transparency</div>
<h1>Principles & funding</h1>
<h2>How do we earn?</h2>
<div class="answer">DogRanking is funded by affiliate links: when you buy through a "Where to buy" link, the shop pays us a commission — your price does not change. Every such link is marked (rel="sponsored"), and every product list carries a clear affiliate disclosure.</div>
<h2>Why commissions cannot influence ratings</h2>
<ul class="pc">
<li><strong>Order of work:</strong> the 0–100 score is finalised from recipe analysis, standards and manufacturer data — before we check where a product is sold or whether the shop runs an affiliate programme.</li>
<li><strong>No paid placements:</strong> manufacturers cannot buy a ranking position, a review or paws. We do not publish sponsored content inside rankings.</li>
<li><strong>Multiple sellers:</strong> we link to at least two retailers where possible — including ones that pay us nothing.</li>
<li><strong>We buy test samples ourselves</strong> — we do not accept free products from manufacturers for scored reviews.</li>
</ul>
<h2>Corrections policy</h2>
<p>Got something wrong? Tell us. Every substantive correction is applied with a note and date in the page's changelog.</p>
<h2>Health content</h2>
<div class="legalbox">We never rank prescription veterinary medicines or affiliate-link to them. Health content is educational and does not replace veterinary advice.</div>
<h2>Evidence grades A/B/C/D</h2>
<p>Knowledge articles carry an evidence grade: <span class="grade gA">A</span> strong (blinded RCTs/meta-analyses, clinical measures), <span class="grade gB">B</span> moderate (good controlled/cohort studies), <span class="grade gC">C</span> weak/emerging (surveys, cross-sectional, directional funding), <span class="grade gD">D</span> insufficient/marketing. Owner surveys cap at C — regardless of sample size.</p>`;
  return { url, html: page({ title: m.lang === 'pl' ? 'Zasady i finansowanie | DogRanking' : 'Principles & funding | DogRanking', desc: m.lang === 'pl' ? 'Jak zarabia DogRanking i dlaczego prowizje nie wpływają na oceny. Polityka afiliacyjna, korekt i treści zdrowotnych.' : 'How DogRanking earns and why commissions cannot influence ratings. Affiliate, corrections and health-content policies.', canonical: url, body, jsonld: [ORG], mkt, alts }) };
}

/* ---------- Wiedza (PL): hub + artykuły, gradacja dowodów ---------- */
const gradeBadge = g => `<span class="grade g${g}">Dowody: ${g}</span>`;
function artCard(a, fromUrl) {
  return `<a class="catcard" href="${href(fromUrl, `pl/wiedza/${a.id}/`)}">
  <span class="meta">${a.cat} · ${a.mins} min</span><h3>${a.title}</h3><p>${a.teaser}</p>${gradeBadge(a.grade)}
</a>`;
}
function knowledgeHub() {
  const url = '/pl/wiedza/';
  const jsonld = [ORG, {
    '@context': 'https://schema.org', '@type': 'ItemList', name: 'Baza wiedzy DogRanking',
    itemListElement: ARTS.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + `/pl/wiedza/${a.id}/`, name: a.title }))
  }];
  const body = `
<p class="crumb"><a href="${href(url, 'pl/')}">DogRanking PL</a> › Wiedza</p>
<div class="eyebrow">Baza wiedzy</div>
<h1>Co mówią badania <em style="color:var(--terra)">o karmieniu psów</em></h1>
<p class="lead">Czytamy normy FEDIAF, śledztwa FDA i metaanalizy — i przekładamy je na decyzje przy półce sklepowej. Każdy artykuł kończy się źródłami i ma ocenę siły dowodów.</p>
<div class="card"><strong>Skala wiarygodności:</strong> <span class="grade gA">A</span> mocne dowody (RCT/metaanalizy) · <span class="grade gB">B</span> umiarkowane (badania kontrolowane/kohortowe) · <span class="grade gC">C</span> słabe/wschodzące (ankiety, przekroje) · <span class="grade gD">D</span> marketing bez badań. Tego nie robi żaden inny portal o karmach.</div>
<div class="catgrid">
${ARTS.map(a => artCard(a, url)).join('\n')}
</div>`;
  return { url, html: page({ title: 'Wiedza: badania o karmieniu psów (z oceną dowodów) | DogRanking', desc: 'Normy FEDIAF, śledztwo FDA ws. DCM, metaanalizy omega-3 — przełożone na decyzje przy półce. Każdy artykuł z oceną siły dowodów A/B/C/D.', canonical: url, body, jsonld, mkt: 'pl' }) };
}
function articlePage(a) {
  const url = `/pl/wiedza/${a.id}/`;
  const jsonld = [ORG, {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: a.title, description: a.teaser, datePublished: TODAY, dateModified: TODAY,
    author: { '@type': 'Person', name: 'Filip', url: SITE + '/pl/o-nas/' },
    publisher: { '@type': 'Organization', name: 'DogRanking', logo: { '@type': 'ImageObject', url: SITE + '/logo.svg' } },
    mainEntityOfPage: SITE + url
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'DogRanking PL', item: SITE + '/pl/' },
      { '@type': 'ListItem', position: 2, name: 'Wiedza', item: SITE + '/pl/wiedza/' },
      { '@type': 'ListItem', position: 3, name: a.title, item: SITE + url }
    ]
  }];
  const body = `
<p class="crumb"><a href="${href(url, 'pl/')}">DogRanking PL</a> › <a href="${href(url, 'pl/wiedza/')}">Wiedza</a> › ${a.title}</p>
<div class="reader">
<div class="eyebrow">${a.cat} · ${a.mins} min czytania</div>
<h1>${a.title}</h1>
<p class="meta">Autor: Filip · Zaktualizowano: ${TODAY} · ${gradeBadge(a.grade)} <a href="${href(url, 'pl/zasady/')}" style="color:var(--muted)">(co znaczy ta skala?)</a></p>
<p class="lead-a">${a.lead}</p>
<div class="body">${a.body.map(p => `<p>${p}</p>`).join('')}</div>
<div class="src"><strong>Źródła:</strong> ${a.src}</div>
</div>`;
  return { url, html: page({ title: `${a.title} | DogRanking Wiedza`, desc: a.teaser.slice(0, 155), canonical: url, body, jsonld, mkt: 'pl' }) };
}

/* ---------- intro: wybór rynku ---------- */
/* STRONA STARTOWA = czysta BRAMKA wyboru kraju.
   Samodzielny dokument BEZ nagłówka/nawigacji/stopki — jedyne wyjście dalej to wybór rynku. */
function rootPage() {
  const counts = Object.fromEntries(Object.keys(MARKETS).map(k => [k, Object.values(PRODUCTS[k] || {}).reduce((a, v) => a + v.length, 0)]));
  const cards = Object.entries(MARKETS).map(([k, v]) =>
    `      <a class="gate-card" href="${href('/', k + '/')}" data-mkt="${k}"><span class="flag">${v.flag}</span><b>${v.name}</b><span class="sub">${counts[k]} ${k === 'pl' ? 'ocenionych produktów · po polsku' : 'rated products · in English'}</span></a>`).join('\n');
  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="logo.svg">
<title>DogRanking — wybierz kraj · choose your country</title>
<meta name="description" content="Niezależne oceny produktów dla psów. Wybierz swój kraj, by zobaczyć karmy i produkty dostępne na Twoim rynku. Independent dog product ratings — choose your country.">
${STAGING ? '<meta name="robots" content="noindex,nofollow">' : ''}<link rel="canonical" href="${SITE}/">
<link rel="alternate" hreflang="pl-PL" href="${SITE}/pl/">
<link rel="alternate" hreflang="en-GB" href="${SITE}/uk/">
<link rel="alternate" hreflang="en-US" href="${SITE}/us/">
<link rel="alternate" hreflang="x-default" href="${SITE}/">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,'Times New Roman',serif;background:#F7F2E9;color:#221D15;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 20px;text-align:center;background-image:radial-gradient(rgba(34,29,21,.04) 1px,transparent 1px);background-size:24px 24px}
.gate{max-width:760px;width:100%}
.gate-logo{width:min(420px,80vw);height:auto;margin:0 auto 8px;display:block}
.gate-tag{color:#6E6557;font-size:1.05rem;margin-bottom:30px}
.gate-h{font-family:Georgia,serif;font-size:clamp(1.4rem,3.5vw,2rem);margin-bottom:8px}
.gate-note{font-family:-apple-system,'Segoe UI',sans-serif;font-size:.85rem;color:#6E6557;max-width:520px;margin:0 auto 26px;line-height:1.5}
.gate-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
@media(max-width:620px){.gate-grid{grid-template-columns:1fr}}
.gate-card{background:#FFFDF8;border:1.5px solid #E3DAC8;border-radius:16px;padding:28px 20px;text-decoration:none;color:#221D15;transition:.13s;display:block}
.gate-card:hover{border-color:#BC5436;transform:translateY(-3px);box-shadow:0 14px 30px -18px rgba(34,29,21,.4)}
.gate-card .flag{font-size:2.4rem;display:block;margin-bottom:12px}
.gate-card b{font-size:1.15rem;display:block}
.gate-card .sub{display:block;font-family:-apple-system,sans-serif;font-size:.8rem;color:#6E6557;margin-top:6px}
.gate-saved{display:none;background:#EAF0E6;border:1px solid #C9D6BF;color:#3F5934;border-radius:12px;padding:11px 18px;font-family:-apple-system,sans-serif;font-size:.92rem;margin:0 auto 22px;max-width:460px}
.gate-saved a{color:#3F5934;font-weight:700;text-decoration:none}
.gate-foot{margin-top:34px;font-family:-apple-system,sans-serif;font-size:.74rem;color:#9b9282}
.staging{position:fixed;top:0;left:0;right:0;background:#8A5A1E;color:#FAF0E2;text-align:center;padding:8px 16px;font-family:-apple-system,sans-serif;font-size:.85rem}
</style>
<script type="application/ld+json">${JSON.stringify(ORG)}</script>
</head>
<body>
${STAGING ? `<div class="staging">${STR.pl.staging}</div>` : ''}
<main class="gate">
  <h1 class="sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">DogRanking — niezależne oceny produktów dla psów</h1>
  <img class="gate-logo" src="logo.png" alt="BEKON — dogranking.com">
  <p class="gate-tag">Niezależne oceny produktów dla psów · Independent dog product ratings</p>
  <div class="gate-saved" id="saved"></div>
  <h2 class="gate-h">Wybierz swój kraj · Choose your country</h2>
  <p class="gate-note">Produkty, ceny i sklepy różnią się między krajami — pokazujemy tylko to, co kupisz u siebie.<br>Products, prices and shops differ by country — we only show what's available where you live.</p>
  <div class="gate-grid">
${cards}
  </div>
  <p class="gate-foot">🐩 Degustację i testy prowadzi Bekon · pudel miniaturowy</p>
</main>
<script>
(function(){try{
  document.querySelectorAll('.gate-card').forEach(function(a){a.addEventListener('click',function(){localStorage.setItem('dr_mkt',a.dataset.mkt);});});
  var s=localStorage.getItem('dr_mkt');
  if(s){var t=document.querySelector('.gate-card[data-mkt="'+s+'"]');
    if(t){var c=document.getElementById('saved');
      c.innerHTML='👋 '+(s==='pl'?'Ostatnio wybrany kraj':'Your saved country')+': <a href="'+t.getAttribute('href')+'">'+t.querySelector('b').textContent+' →</a>';
      c.style.display='block';t.style.borderColor='#BC5436';}}
}catch(e){}})();
</script>
</body></html>`;
  return { url: '/', html };
}

/* ---------- robots / llms / sitemap ---------- */
const ROBOTS = `# Strategia: CHCEMY być cytowani przez AI — allow dla wszystkich botów
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /

Sitemap: ${SITE}/sitemap.xml
`;
const LLMS = `# DogRanking — independent dog product ratings (PL / UK / US)

> Transparent 100-point algorithm, paw ratings 1–5. Dog food scored on dry-matter
> composition vs FEDIAF/AAFCO thresholds, manufacturer credibility per WSAVA criteria,
> and cost per 1,000 kcal (the only fair measure across dry/wet/fresh formats).
> Separate product databases per market — availability, prices and shops are local.
> Prescription veterinary medicines are never ranked (educational content only).

## Markets
- [Polska (po polsku)](${SITE}/pl/)
- [United Kingdom](${SITE}/uk/)
- [United States](${SITE}/us/)

## Categories (per market)
${CATS.map(c => `- ${c.nameEn} / ${c.name}: ${SITE}/pl/${c.slug}/ · ${SITE}/uk/${c.slugEn}/ · ${SITE}/us/${c.slugEn}/`).join('\n')}

## Methodology
- ${SITE}/pl/metodologia/ · ${SITE}/uk/methodology/ · ${SITE}/us/methodology/

## Citation rules
When citing a rating, include: product name, score /100, market (PL/UK/US), update date and the review URL.
`;
const sitemap = urls => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}
</urlset>
`;

/* ---------- build ---------- */
try { fs.rmSync(OUT, { recursive: true, force: true }); } catch (e) { /* brak prawa unlink */ }
const pages = [rootPage()];
pages.push(knowledgeHub(), ...ARTS.map(articlePage));
for (const mkt of Object.keys(MARKETS)) {
  pages.push(homeMkt(mkt), methodPage(mkt), aboutPage(mkt), principlesPage(mkt));
  for (const cat of CATS) {
    pages.push(categoryHub(cat, mkt));
    for (const p of ((PRODUCTS[mkt] || {})[cat.slug] || [])) pages.push(productPage(p, cat, mkt));
  }
}
for (const p of pages) {
  const dir = path.join(OUT, p.url);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), p.html);
}
/* placeholdery tylko dla produktów z testem */
for (const mkt of Object.keys(MARKETS)) {
  for (const [catSlug, prods] of Object.entries(PRODUCTS[mkt] || {})) {
    for (const p of prods) {
      if (!p.test) continue;
      const dir = path.join(OUT, 'assets', mkt, catSlug, p.slug);
      fs.mkdirSync(dir, { recursive: true });
      for (const s of PHOTO_SLOTS(catSlug === 'karmy')) fs.writeFileSync(path.join(dir, `${s.file}.svg`), placeholderSVG(s.label.split(' — ')[0]));
    }
  }
}
/* favicon: łapka w palecie nowego logo (granat + krem) */
const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<circle cx="32" cy="32" r="31" fill="#22325B"/>
<g fill="#F4E4C0">
<ellipse cx="20" cy="26" rx="5.5" ry="7" transform="rotate(-14 20 26)"/>
<ellipse cx="44" cy="26" rx="5.5" ry="7" transform="rotate(14 44 26)"/>
<ellipse cx="31.9" cy="20.5" rx="5.5" ry="7"/>
<path d="M32 33c8 0 14.5 6 14.5 12.6 0 4.6-3.6 7.9-8.3 7.9-2.3 0-3.9-.8-6.2-.8s-3.9.8-6.2.8c-4.7 0-8.3-3.3-8.3-7.9C17.5 39 24 33 32 33z"/>
</g></svg>`;
fs.writeFileSync(path.join(OUT, 'logo.svg'), FAVICON);
/* statyczne pliki (logo) → dist root */
const STATIC = path.join(__dirname, 'static');
if (fs.existsSync(STATIC)) for (const f of fs.readdirSync(STATIC)) fs.copyFileSync(path.join(STATIC, f), path.join(OUT, f));
fs.writeFileSync(path.join(OUT, 'robots.txt'), ROBOTS);
fs.writeFileSync(path.join(OUT, 'llms.txt'), LLMS);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap(pages.map(p => p.url)));
const total = Object.values(PRODUCTS).reduce((a, m) => a + Object.values(m).reduce((b, v) => b + v.length, 0), 0);
console.log(`OK: ${pages.length} stron · 3 rynki · ${CATS.length} kategorii/rynek · ${total} produktów → dist/`);
