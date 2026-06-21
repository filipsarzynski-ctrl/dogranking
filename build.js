#!/usr/bin/env node
/* ============================================================
   DogRanking - generator statyczny v3 MULTI-MARKET (zero zależności)
   - intro z wyborem rynku na / (bez przymusowego redirectu - SEO/AI!)
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
const BEKON = J('bekon.json').posts;
const MARKETS = {
  pl: { lang: 'pl', name: 'Polska', flag: '🇵🇱', langName: 'po polsku', money: v => `${v} zł` },
  uk: { lang: 'en', name: 'United Kingdom', flag: '🇬🇧', langName: 'in English', money: v => `£${v}` },
  us: { lang: 'en', name: 'United States', flag: '🇺🇸', langName: 'in English', money: v => `$${v}` }
};
/* Domyslnie: produkcja (czyste URL-e) + bezpiecznie (noindex + baner demo), bez zmiennych w panelu.
   PREVIEW=1 -> linki z index.html (podglad z dysku). LAUNCH=1 -> zdejmuje noindex+baner (oficjalny start). */
const PREVIEW = !!process.env.PREVIEW;
const STAGING = !process.env.LAUNCH;

/* Opinie gości (UGC). enabled=false dopóki nie skonfigurujesz zasobów Cloudflare (D1/R2/Turnstile).
   PREVIEW_REVIEWS=1 wymusza render sekcji w lokalnym podglądzie. site key Turnstile jest publiczny. */
const REVIEWS = {
  enabled: true,
  api: '/api',
  turnstileSiteKey: '0x4AAAAAADnU-ECLyP4S7kJr'
};

/* ---------- i18n szablonów ---------- */
const STR = {
  pl: {
    nav: ['Start', 'Kategorie', 'Metodologia'], review: 'Recenzja', reviewTitle: 'recenzja i ocena', rated: 'Ocena', updated: 'Zaktualizowano',
    demo: 'DEMO - dane do weryfikacji', goodChoice: n => `Czy ${n} to dobry wybór?`,
    calc: {
      navlink: 'Kalkulator kosztów', slug: 'kalkulator',
      h: 'Kalkulator kosztu żywienia psa',
      lead: 'Cena za kilogram myli - sucha karma ma ~3,5× więcej kalorii niż mokra, więc „tańsza za kg" bywa droższa w misce. Policz realny koszt dzienny i miesięczny dla swojego psa.',
      answer: 'Dzienne zapotrzebowanie liczymy ze wzoru weterynaryjnego: zapotrzebowanie spoczynkowe RER = 70 × (masa w kg)^0,75, pomnożone przez współczynnik aktywności (MER). Następnie dzielimy je przez kaloryczność karmy i mnożymy przez cenę - to daje uczciwy koszt, niezależny od formy.',
      weight: 'Masa psa (kg)', activity: 'Aktywność / stan',
      actOpts: [['1.6', 'Dorosły, sterylizowany (typowy)'], ['1.8', 'Dorosły, aktywny'], ['1.4', 'Skłonność do tycia / mało ruchu'], ['1.0', 'Odchudzanie'], ['2.5', 'Szczenię / pies pracujący']],
      food: 'Karma', result: 'Wynik', kcalDay: 'Dzienne zapotrzebowanie', gramsDay: 'Porcja dzienna', perDay: 'Koszt dzienny', perMonth: 'Koszt miesięczny', perYear: 'Koszt roczny',
      note: 'Szacunek orientacyjny dla zdrowego dorosłego psa - rzeczywiste potrzeby zależą od rasy, metabolizmu i stanu zdrowia. Skonsultuj dawkowanie z weterynarzem; przy chorobach stosuj zalecenia lekarskie.',
      pickFood: 'Wybierz karmę z rankingu', cardTitle: 'Policz koszt karmienia', cardCta: 'Otwórz kalkulator →'
    },
    flavorRow: 'Wariant (smak)',
    variantBox: 'Ta ocena dotyczy <strong>konkretnego wariantu smakowego</strong>. Producenci często sprzedają tę samą linię w wielu smakach (np. łosoś, jagnięcina, kurczak), a każdy ma inny skład, profil odżywczy i alergeny - więc i inną ocenę. Sprawdzaj wariant, który realnie kupujesz.',
    prof: {
      h: '🐶 Dopasuj do swojego psa', sub: 'Łapki opisują jakość karmy. Wybierz profil psa, a my przeliczymy dopasowanie i pokażemy ostrzeżenia.',
      age: 'Wiek', ageOpts: [['dorosly', 'Dorosły (1–7 lat)'], ['szczenie', 'Szczenię'], ['senior', 'Senior (7+)']],
      form: 'Forma karmy', formOpts: [['all', 'Wszystkie formy'], ['sucha', 'Tylko sucha'], ['mokra', 'Tylko mokra']],
      size: 'Rozmiar', sizeOpts: [['maly', 'Mały / toy (do 10 kg)'], ['sredni', 'Średni (10–25 kg)'], ['duzy', 'Duży / olbrzymi (25+ kg)']],
      health: 'Zdrowie', healthOpts: [['ok', 'Zdrowy'], ['alergia_kurczak', 'Alergia na kurczaka'], ['alergia_drob', 'Alergia na drób (każdy)'], ['nadwaga', 'Nadwaga'], ['trzustka', 'Po zapaleniu trzustki'], ['stawy', 'Problemy ze stawami'], ['nerki', 'Choroba nerek']],
      reset: 'Wyczyść profil', matchLbl: 'Dopasowanie', blocked: 'Niezalecana przy tym profilu',
      legend: '<strong>Jak to czytać:</strong> łapki 🐾 = jakość karmy (niezależna od psa). Dopasowanie % = jak karma pasuje do profilu, który wybrałeś. Ostrzeżenia pokazujemy zawsze. Przy chorobach dieta zawsze pod kontrolą weterynarza - dopasowanie nie zastępuje porady lekarskiej.',
      wAllergy: 'Zawiera kurczaka - wyklucz przy alergii na kurczaka', wAllergyP: 'Zawiera drób - wyklucz przy alergii na drób', wPanc: 'Tłuszcz powyżej 15% suchej masy - niewskazana po zapaleniu trzustki',
      wPup: 'Receptura dla psów dorosłych - szczenię potrzebuje karmy „growth"/„wszystkie etapy życia"', wKidney: 'Choroba nerek wymaga diety renalnej z obniżonym fosforem - dobór tylko z weterynarzem',
      wLegume: 'Strączkowe wysoko w składzie (kontekst FDA ws. DCM - zob. Wiedza)'
    },
    nutrition: 'Wartości odżywcze (w suchej masie)', spec: 'Specyfikacja', param: 'Parametr', value: 'Wartość', ctx: 'Próg / kontekst',
    form: 'Forma karmy', formNote: 'porównujemy formy po przeliczeniu na suchą masę', protein: 'Białko', fat: 'Tłuszcz', energy: 'Energia',
    min: 'min', cost1000: 'Koszt 1000 kcal', cost1000note: 'jedyna uczciwa miara między formą suchą a mokrą',
    dmNote: 'Wartości przeliczone z analizy gwarantowanej na suchą masę (DM).', howCalc: 'Jak liczymy →',
    pillarsH: 'Punktacja w 4 filarach', pillar: 'Filar', result: 'Wynik', max: 'Maks.',
    pillarLabelsFood: ['A · Skład i jakość białka', 'B · Zgodność z normami FEDIAF', 'C · Wiarygodność producenta (WSAVA)', 'D · Dodatki i przetwarzanie'],
    pillarLabelsOther: ['A · Materiały i wykonanie', 'B · Bezpieczeństwo i dowody', 'C · Wiarygodność producenta', 'D · Ergonomia i wartość'],
    pros: 'Zalety', cons: 'Wady',
    testH: 'Test DogRanking - ten egzemplarz mieliśmy w rękach', testDate: 'Data testu',
    testPending: 'Test DogRanking w przygotowaniu - powyższa ocena powstała z analizy etykiety i publicznych danych producenta (tak oceniamy zawsze; test dodaje zdjęcia, pomiary własne i werdykt Bekona, ale nie zmienia punktacji).',
    measure: 'Pomiar własny', kibbleRow: 'Średnica granuli / konsystencja', smellRow: 'Zapach po otwarciu', textureRow: 'Tekstura',
    runRow: 'Przebieg testu', stateRow: 'Stan po teście', wet: 'karma mokra - kawałki w sosie/galarecie', smallOk: '(odpowiednia także dla małych ras)', smallNo: '(może być duża dla ras miniaturowych)',
    bekonRowFood: 'Werdykt Bekona (smakowitość)', bekonRowOther: 'Werdykt Bekona (test użytkowy)',
    protocolFood: 'Bekon ma stałą dietę i jej nie zmieniamy - test smakowitości to kilka granulek podanych jako przysmak, co jest bezpieczne dla zdrowego psa. Otwarte worki po sesji testowej przekazujemy lokalnemu schronisku.',
    protocolOther: 'Produkty kupujemy sami (nie od producentów) i testujemy w codziennym użytkowaniu z Bekonem. Skala 🎾 mierzy akceptację psa w użyciu - nie zastępuje oceny jakości w łapkach.',
    protocolTail: 'Werdykt Bekona <strong>nie wpływa na punktację</strong> 0–100.', protocolLink: 'Pełny protokół testowy →', protocolHead: 'Jak testujemy (i czego nie robimy):',
    faqH: 'Najczęstsze pytania', buyH: 'Gdzie kupić',
    disclosure: 'Powyższe linki są linkami afiliacyjnymi - przy zakupie otrzymujemy prowizję, bez zmiany ceny dla Ciebie. Ocena powstała zanim sprawdziliśmy, gdzie produkt można kupić.',
    hubDisclosure: 'Strony produktów zawierają linki afiliacyjne (zawsze oznaczone rel="sponsored"). Punktacja powstaje przed sprawdzeniem dostępności w sklepach.',
    catEyebrow: 'Kategoria', rankingH: 'Ranking - produkty dostępne w Polsce', betaH: 'Pierwsze testy - kategoria w fazie beta',
    soonH: 'Ranking w przygotowaniu', soonTxt: 'Tę kategorię uruchomimy zgodnie z mapą rozwoju. Metodologia jest już zaprojektowana - poniżej kryteria oceny.',
    metaRank: n => `${n} produktów (faza startowa - baza rośnie) · wszystkie formy liczone w suchej masie`,
    seeReview: 'Zobacz test i recenzję →', seeReviewLabel: 'Zobacz recenzję →', testedByUs: '📷 testowana przez nas', labelBased: '📋 ocena z etykiety · test wkrótce',
    formsH: 'Formy karm - co porównujemy i jak',
    formsTxt: 'Karma to nie tylko sucha i mokra - oceniamy 8 form, zawsze po przeliczeniu na suchą masę i z kosztem za 1000 kcal. Mokra karma z 8% białka ma go w suchej masie 40% - bez przeliczenia każde porównanie jest błędne.',
    formCol: 'Forma', formNoteCol: 'Uwagi do oceny', howWeRateCat: 'Jak oceniamy w tej kategorii', fullMethod: 'Pełna metodologia (4 filary, 100 punktów, łapki) →',
    badges: { live: 'Ranking aktywny', beta: 'Pierwsze testy', soon: 'Wkrótce', edu: 'Strefa edukacyjna' },
    homeEyebrow: 'Niezależne oceny produktów dla psów · Polska',
    homeH1: 'Czytamy etykiety, normy i badania.<br><em style="color:var(--terra)">Ty wybierasz dla psa.</em>',
    homeLead: 'Karmy, gryzaki, szelki, lokalizatory GPS - każdy produkt przechodzi przez jawny, 100-punktowy algorytm. Bez sponsorowanych miejsc. Oceny w łapkach 🐾, degustację i testy prowadzi Bekon - pudel miniaturowy.',
    whatWeRate: 'Co oceniamy', top3: 'Ranking karm - top 3', fullRank: 'Pełny ranking karm →',
    howWeRate: 'Jak oceniamy?',
    howWeRateTxt: 'Dwie warstwy: <strong>łapki 🐾</strong> (1–5) opisują jakość produktu (4 filary, 100 punktów), a <strong>dopasowanie</strong> liczymy osobno dla profilu psa. Jadalne degustuje Bekon (miski 🥣), niejadalne testuje w użyciu (piłki 🎾). W strefie Zdrowie nie rankingujemy leków - tylko edukujemy.',
    methodLink: 'Pełna metodologia →', crumbHome: 'DogRanking PL',
    footer: '© 2026 DogRanking · Treści edukacyjne - nie zastępują porady weterynaryjnej · Linki afiliacyjne zawsze jawnie oznaczone · Degustację prowadzi Bekon 🐩',
    footerMethod: 'Jak oceniamy', staging: '🚧 Wersja demonstracyjna - przykładowe dane i oceny w trakcie weryfikacji z etykietami. Oficjalny start wkrótce.'
  },
  en: {
    nav: ['Home', 'Categories', 'Methodology'], review: 'Review', reviewTitle: 'review & rating', rated: 'Rating', updated: 'Updated',
    calc: {
      navlink: 'Cost calculator', slug: 'calculator',
      h: 'Dog feeding cost calculator',
      lead: 'Price per kilo misleads - dry food has ~3.5× the calories of wet, so “cheaper per kg” can cost more in the bowl. Work out the real daily and monthly cost for your dog.',
      answer: 'Daily energy uses the veterinary formula: resting requirement RER = 70 × (body weight kg)^0.75, multiplied by an activity factor (MER). We divide that by the food’s calorie density and multiply by price - giving a fair cost independent of format.',
      weight: 'Dog weight (kg)', activity: 'Activity / status',
      actOpts: [['1.6', 'Adult, neutered (typical)'], ['1.8', 'Adult, active'], ['1.4', 'Prone to weight gain / low activity'], ['1.0', 'Weight loss'], ['2.5', 'Puppy / working dog']],
      food: 'Food', result: 'Result', kcalDay: 'Daily energy need', gramsDay: 'Daily portion', perDay: 'Cost per day', perMonth: 'Cost per month', perYear: 'Cost per year',
      note: 'Rough estimate for a healthy adult dog - real needs depend on breed, metabolism and health. Confirm portions with your vet; follow medical advice for conditions.',
      pickFood: 'Pick a food from the ranking', cardTitle: 'Calculate feeding cost', cardCta: 'Open the calculator →'
    },
    flavorRow: 'Variant (flavour)',
    variantBox: 'This rating is for a <strong>specific flavour variant</strong>. Brands often sell the same line in several flavours (salmon, lamb, chicken…), each with a different recipe, nutrient profile and allergens - and therefore a different score. Always check the exact variant you are buying.',
    prof: {
      h: '🐶 Match to your dog', sub: 'Paws describe food quality. Pick your dog’s profile and we’ll compute the match and flag warnings.',
      age: 'Age', ageOpts: [['dorosly', 'Adult (1–7 yrs)'], ['szczenie', 'Puppy'], ['senior', 'Senior (7+)']],
      form: 'Food format', formOpts: [['all', 'All formats'], ['sucha', 'Dry only'], ['mokra', 'Wet only']],
      size: 'Size', sizeOpts: [['maly', 'Small / toy (up to 10 kg)'], ['sredni', 'Medium (10–25 kg)'], ['duzy', 'Large / giant (25+ kg)']],
      health: 'Health', healthOpts: [['ok', 'Healthy'], ['alergia_kurczak', 'Chicken allergy'], ['alergia_drob', 'Any poultry allergy'], ['nadwaga', 'Overweight'], ['trzustka', 'After pancreatitis'], ['stawy', 'Joint problems'], ['nerki', 'Kidney disease']],
      reset: 'Clear profile', matchLbl: 'Match', blocked: 'Not recommended for this profile',
      legend: '<strong>How to read this:</strong> paws 🐾 = food quality (independent of your dog). Match % = how the food fits the profile you chose. Warnings are always shown. With medical conditions, diet always under veterinary supervision - match is not medical advice.',
      wAllergy: 'Contains chicken - exclude for chicken allergy', wAllergyP: 'Contains poultry - exclude for poultry allergy', wPanc: 'Fat above 15% dry matter - unsuitable after pancreatitis',
      wPup: 'Adult recipe - a puppy needs a “growth”/“all life stages” food', wKidney: 'Kidney disease needs a renal diet with restricted phosphorus - choose only with your vet',
      wLegume: 'Legumes high in the recipe (FDA DCM context - see Knowledge)'
    },
    demo: 'DEMO - data pending verification', goodChoice: n => `Is ${n} a good choice?`,
    nutrition: 'Nutrition (dry-matter basis)', spec: 'Specification', param: 'Parameter', value: 'Value', ctx: 'Threshold / context',
    form: 'Food format', formNote: 'formats compared on a dry-matter basis', protein: 'Protein', fat: 'Fat', energy: 'Energy',
    min: 'min', cost1000: 'Cost per 1,000 kcal', cost1000note: 'the only fair measure across dry, wet and fresh formats',
    dmNote: 'Values converted from guaranteed analysis to dry matter (DM).', howCalc: 'How we calculate →',
    pillarsH: 'Score across 4 pillars', pillar: 'Pillar', result: 'Score', max: 'Max',
    pillarLabelsFood: ['A · Recipe & protein quality', 'B · Compliance (FEDIAF/AAFCO)', 'C · Manufacturer credibility (WSAVA)', 'D · Additives & processing'],
    pillarLabelsOther: ['A · Materials & build', 'B · Safety & evidence', 'C · Manufacturer credibility', 'D · Ergonomics & value'],
    pros: 'Pros', cons: 'Cons',
    testH: 'DogRanking hands-on test', testDate: 'Test date',
    testPending: 'Hands-on test pending - this rating is based on label analysis and public manufacturer data (that is always how we score; a hands-on test adds photos, our own measurements and Bekon’s verdict, but never changes the score).',
    measure: 'Our measurement', kibbleRow: 'Kibble size / consistency', smellRow: 'Smell on opening', textureRow: 'Texture',
    runRow: 'Test procedure', stateRow: 'Condition after test', wet: 'wet food - chunks in gravy/jelly', smallOk: '(suitable for small breeds too)', smallNo: '(may be large for toy breeds)',
    bekonRowFood: 'Bekon’s verdict (palatability)', bekonRowOther: 'Bekon’s verdict (usage test)',
    protocolFood: 'Bekon keeps his regular diet - palatability tests are a few kibbles offered as a treat, which is safe for a healthy dog. Opened test bags go to a local shelter.',
    protocolOther: 'We buy products ourselves (never from manufacturers) and test them in daily use with Bekon. The 🎾 scale measures the dog’s acceptance in use - it never replaces the paw-rating.',
    protocolTail: 'Bekon’s verdict <strong>does not affect</strong> the 0–100 score.', protocolLink: 'Full testing protocol →', protocolHead: 'How we test (and what we don’t do):',
    faqH: 'Frequently asked questions', buyH: 'Where to buy',
    disclosure: 'The links above are affiliate links - we earn a commission at no extra cost to you. The rating was finalised before we checked where the product can be bought.',
    hubDisclosure: 'Product pages contain affiliate links (always marked rel="sponsored"). Scores are finalised before checking shop availability.',
    catEyebrow: 'Category', rankingH: 'Ranking - products available on this market', betaH: 'First tests - beta category',
    soonH: 'Ranking in preparation', soonTxt: 'This category launches per our roadmap. The methodology is already designed - rating criteria below.',
    metaRank: n => `${n} products (launch phase - the database is growing) · all formats compared on a dry-matter basis`,
    seeReview: 'See test & review →', seeReviewLabel: 'See review →', testedByUs: '📷 hands-on tested', labelBased: '📋 label-based · hands-on test pending',
    formsH: 'Dog food formats - what we compare and how',
    formsTxt: 'Dog food is not just dry vs wet - we rate 8 formats, always converted to dry matter and costed per 1,000 kcal. A wet food with 8% protein has 40% on a dry-matter basis - without conversion every comparison is wrong.',
    formCol: 'Format', formNoteCol: 'Rating notes', howWeRateCat: 'How we rate this category', fullMethod: 'Full methodology (4 pillars, 100 points, paws) →',
    badges: { live: 'Live rankings', beta: 'First tests', soon: 'Coming soon', edu: 'Educational zone' },
    homeEyebrow: 'Independent dog product ratings',
    homeH1: 'We read the labels, standards and studies.<br><em style="color:var(--terra)">You choose for your dog.</em>',
    homeLead: 'Dog food, chews, harnesses, GPS trackers - every product goes through a transparent 100-point algorithm. No sponsored placements. Ratings in paws 🐾; tasting and testing by Bekon, a miniature poodle.',
    whatWeRate: 'What we rate', top3: 'Dog food ranking - top 3', fullRank: 'Full dog food ranking →',
    howWeRate: 'How we rate',
    howWeRateTxt: 'Two layers: <strong>paws 🐾</strong> (1–5) describe product quality (4 pillars, 100 points); <strong>match</strong> is computed separately for your dog’s profile. Edibles are taste-tested by Bekon (bowls 🥣), non-edibles usage-tested (balls 🎾). In the Health zone we never rank medicines - we educate.',
    methodLink: 'Full methodology →', crumbHome: 'DogRanking',
    footer: '© 2026 DogRanking · Educational content - not a substitute for veterinary advice · Affiliate links always clearly disclosed · Tasting by Bekon 🐩',
    footerMethod: 'How we rate', staging: '🚧 Demo version - sample data and ratings pending label verification. Official launch soon.'
  }
};

const FOOD_FORMS = {
  pl: [['Sucha (ekstrudowana)', 'standard rynku; najniższy koszt 1000 kcal'], ['Sucha tłoczona na zimno', 'łagodniejszy proces produkcji'], ['Mokra (puszki, saszetki)', '75–82% wody - porównuj TYLKO w suchej masie'], ['Świeża / gotowana chłodzona', 'wyższa strawność; model subskrypcyjny'], ['Liofilizowana / suszona powietrzem', 'wysoka gęstość odżywcza'], ['Surowa mrożona (BARF)', 'wymóg: dowód kompletności + kontrola patogenów, inaczej max 2 łapki'], ['Weterynaryjna', 'osobna kategoria oceny - zawsze pod kontrolą lekarza'], ['Topper / karma uzupełniająca', 'nie jest pełnoporcjowa - oznaczamy wyraźnie']],
  en: [['Dry (extruded kibble)', 'market standard; lowest cost per 1,000 kcal'], ['Cold-pressed dry', 'gentler production process'], ['Wet (cans, pouches)', '75–82% water - compare ONLY on dry matter'], ['Fresh / gently cooked', 'higher digestibility; subscription model'], ['Freeze-dried / air-dried', 'very nutrient-dense'], ['Frozen raw (BARF)', 'requires completeness proof + pathogen control, else capped at 2 paws'], ['Veterinary / therapeutic', 'rated in its own category - always under veterinary care'], ['Topper / complementary', 'not complete nutrition - clearly flagged']]
};

/* ---------- design system ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@300;400;500;600&display=swap');
:root{--paper:#F4EDDF;--paper2:#FBF6EC;--card:#FFFDF8;--ink:#2B2218;--muted:#7B7060;--terra:#C75B38;--terra-deep:#A8472A;--olive:#6E7A45;--olive-deep:#55602F;--sage:#6E7A45;--gold:#D9A441;--maroon:#3E0E16;--maroon2:#671C26;--cream:#F4EDDF;--line:#E6DAC5;--r:18px;--r-lg:26px;--shadow:0 18px 40px -24px rgba(43,34,24,.40);--shadow-sm:0 6px 16px -10px rgba(43,34,24,.28);--f-serif:'Fraunces',Georgia,'Times New Roman',serif;--f-hand:'Caveat','Segoe Script',cursive;--f-sans:'Inter',-apple-system,'Segoe UI',sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--f-sans);font-weight:400;background:var(--paper);color:var(--ink);line-height:1.72;-webkit-font-smoothing:antialiased}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
header{background:var(--maroon);position:relative}
.bar{display:flex;align-items:center;gap:18px;min-height:64px;max-width:1100px;margin:0 auto;padding:10px 24px;flex-wrap:wrap}
.mark{text-decoration:none;display:flex;align-items:center}
.mark img{height:42px;width:auto;display:block}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
nav{display:flex;gap:6px;font-family:var(--f-sans);font-size:.95rem;font-weight:500;flex-wrap:wrap}
nav a{padding:7px 12px;border-radius:99px;color:#EBD9C2;text-decoration:none;white-space:nowrap}
nav a:hover{color:var(--gold)}
.social{margin-left:auto;display:inline-flex;align-items:center;gap:12px}
.social a{color:#EBD9C2;display:inline-flex;transition:color .15s}
.social a:hover{color:var(--gold)}
.social svg{width:20px;height:20px;display:block}
.mktswitch{margin-left:16px;font-family:var(--f-sans);font-size:.82rem}
.mktswitch a{color:#EBD9C2;text-decoration:none;padding:4px 7px}
.mktswitch a:hover{color:var(--gold)}
.navt{display:none}
.burger{display:none;cursor:pointer;align-items:center;justify-content:center;width:42px;height:42px;border-radius:10px;color:var(--cream)}
.burger:hover{background:rgba(255,255,255,.1)}
@media(max-width:760px){
  .bar{gap:8px;min-height:54px}
  .burger{display:inline-flex;margin-left:auto;order:2}
  .social{order:3;margin-left:0}
  .mktswitch{order:4;margin-left:2px}
  nav{display:none;order:5;width:100%}
  .navt:checked ~ nav{display:flex;flex-direction:column;gap:2px;position:absolute;left:0;right:0;top:100%;background:var(--maroon2);box-shadow:0 14px 26px -18px rgba(0,0,0,.5);padding:8px 16px 14px;z-index:30}
  .navt:checked ~ nav a{padding:12px 10px;border-radius:8px;font-size:1.02rem}
}
/* ===== Bekon: oś czasu życia ===== */
.bekpanel{position:relative;overflow:hidden;background:linear-gradient(135deg,#FBF5EA,#F2E5CC);border:1px solid var(--line);border-radius:22px;padding:32px 36px;margin:6px 0 4px;box-shadow:0 10px 30px -18px rgba(34,25,15,.35)}
.bekpanel::after{content:"🐾";position:absolute;right:6px;bottom:-26px;font-size:8.5rem;opacity:.07;transform:rotate(-14deg);pointer-events:none;line-height:1}
.bekhero{display:flex;gap:34px;align-items:center;margin:0;flex-wrap:wrap;position:relative;z-index:1}
.bekhero .lead{margin-bottom:0}
.bekstats{font-family:-apple-system,sans-serif;font-size:.82rem;color:var(--muted);margin-top:16px;display:flex;flex-wrap:wrap;gap:6px 16px}
.bekstats span{display:inline-flex;align-items:center;gap:6px}
.bekstats b{color:var(--terra);font-weight:700;font-size:.95rem}
.bekhero-txt{flex:1 1 340px}
.bekhero-txt h1{margin-bottom:12px}
.bekavatar{flex:0 0 auto;margin:0;width:200px;height:200px;border-radius:50%;overflow:hidden;border:6px solid var(--card);box-shadow:0 14px 36px -8px rgba(34,25,15,.3);transform:rotate(2.5deg);position:relative}
.bekavatar::after{content:"🐾";position:absolute;right:-4px;bottom:8px;width:46px;height:46px;display:flex;align-items:center;justify-content:center;background:var(--gold);border-radius:50%;border:4px solid var(--paper);font-size:1.1rem;transform:rotate(-2.5deg)}
.bekavatar img{width:100%;height:100%;object-fit:cover;display:block}
.bekfacts{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
.bekfact{font-family:-apple-system,sans-serif;font-size:.84rem;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:99px;padding:6px 14px;display:inline-flex;align-items:center;gap:8px;box-shadow:0 2px 5px -2px rgba(34,25,15,.12)}
.bekfact b{font-weight:400;font-size:1.05rem;line-height:1}
.tl{position:relative;margin:42px 0 0;padding-left:0}
.tl::before{content:"";position:absolute;left:21px;top:16px;bottom:34px;width:2px;background:linear-gradient(var(--gold) 0%,var(--gold) 72%,transparent);opacity:.5}
.tlyear{position:relative;font-family:-apple-system,sans-serif;font-weight:700;font-size:.78rem;letter-spacing:.14em;color:var(--muted);margin:0 0 24px;padding-left:62px}
.tlyear::before{content:"";position:absolute;left:15px;top:50%;width:14px;height:14px;background:var(--gold);border:3px solid var(--paper);border-radius:50%;transform:translateY(-50%)}
.tlitem{position:relative;padding:0 0 42px 62px}
.tlitem::before{content:"🐾";position:absolute;left:4px;top:1px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:1rem;background:var(--card);border:2px solid var(--gold);border-radius:50%;box-shadow:0 3px 8px -2px rgba(34,25,15,.18)}
.tlitem:last-child{padding-bottom:0}
.tldate{display:inline-block;font-family:-apple-system,sans-serif;font-size:.72rem;font-weight:700;color:#fff;background:var(--terra);text-transform:uppercase;letter-spacing:.06em;padding:4px 11px;border-radius:99px}
.tlage{font-weight:500;opacity:.85;margin-left:5px;text-transform:none;letter-spacing:0}
.tlcard{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:20px 22px;margin-top:11px;box-shadow:0 8px 22px -14px rgba(34,25,15,.4);transition:transform .18s ease,box-shadow .18s ease}
.tlcard:hover{transform:translateY(-2px);box-shadow:0 18px 34px -16px rgba(34,25,15,.45)}
.tlcard h3{margin:0 0 8px;font-size:1.3rem;line-height:1.25}
.tlcard p{margin:0;color:var(--ink)}
.tlcard.is-now{border-color:var(--gold);background:linear-gradient(180deg,#FFF8EC,var(--card))}
.tlgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}
.tlgrid.one{grid-template-columns:1fr;max-width:600px}
.tlfig{margin:0}
.tlframe{position:relative;display:block;overflow:hidden;border-radius:13px;background:#1a1712;box-shadow:0 4px 12px -4px rgba(34,25,15,.3)}
.tlmedia{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;transition:transform .45s ease}
.tlfig:not(.tlfig--video):hover .tlmedia{transform:scale(1.05)}
.tlbadge{position:absolute;top:10px;left:10px;font-family:-apple-system,sans-serif;font-size:.64rem;font-weight:700;letter-spacing:.09em;color:#fff;background:rgba(26,23,18,.62);padding:3px 9px;border-radius:6px;display:inline-flex;align-items:center;gap:5px;pointer-events:none}
.tlfig figcaption{font-family:-apple-system,sans-serif;font-size:.82rem;color:var(--muted);margin-top:8px;line-height:1.4;font-style:italic}
.tlend{position:relative;padding-left:62px;font-family:-apple-system,sans-serif;font-size:.86rem;color:var(--muted);font-style:italic}
.tlend::before{content:"🐾";position:absolute;left:9px;font-size:1rem;font-style:normal}
.tlcard.is-first>p:first-of-type::first-letter{font-size:3rem;line-height:.78;float:left;margin:5px 11px 0 0;color:var(--terra);font-family:Georgia,serif;font-weight:700}
.tlfig:not(.tlfig--video) .tlframe{cursor:zoom-in}
.tlfig:not(.tlfig--video) .tlframe::after{content:"⤢";position:absolute;right:9px;bottom:9px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:.95rem;color:#fff;background:rgba(26,23,18,.5);border-radius:8px;opacity:0;transition:opacity .15s;pointer-events:none}
.tlfig:not(.tlfig--video):hover .tlframe::after{opacity:1}
/* lightbox */
.lbx{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;background:rgba(20,16,11,.93);padding:24px;opacity:0;transition:opacity .2s}
.lbx.on{display:flex;opacity:1}
.lbx-img{max-width:92vw;max-height:82vh;border-radius:10px;box-shadow:0 24px 70px rgba(0,0,0,.55);object-fit:contain;background:#1a1712}
.lbx-cap{position:absolute;bottom:20px;left:0;right:0;text-align:center;color:#F7F2E9;font-family:-apple-system,sans-serif;font-size:.9rem;font-style:italic;text-shadow:0 1px 5px rgba(0,0,0,.7);padding:0 60px}
.lbx button{position:absolute;background:rgba(247,242,233,.12);border:1px solid rgba(247,242,233,.32);color:#F7F2E9;width:46px;height:46px;border-radius:50%;font-size:1.5rem;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;transition:background .15s;-webkit-tap-highlight-color:transparent}
.lbx button:hover{background:rgba(247,242,233,.26)}
.lbx-x{top:20px;right:20px;font-size:1.7rem}
.lbx-prev{left:20px;top:50%;transform:translateY(-50%)}
.lbx-next{right:20px;top:50%;transform:translateY(-50%)}
@media(max-width:600px){.tlgrid{grid-template-columns:1fr}.bekpanel{padding:24px 22px}.bekavatar{width:150px;height:150px}.tlitem,.tlyear,.tlend{padding-left:54px}.tl::before{left:17px}.tlitem::before{left:1px}.tlyear::before{left:11px}.tlend::before{left:6px}.lbx-prev{left:8px}.lbx-next{right:8px}.lbx button{width:40px;height:40px}.lbx-cap{padding:0 16px;bottom:14px}}
main{padding:56px 0 92px}
h1{font-family:var(--f-serif);font-weight:600;font-size:clamp(2rem,5vw,3rem);line-height:1.1;letter-spacing:-.01em;margin-bottom:18px}
h2{font-family:var(--f-serif);font-weight:600;font-size:clamp(1.5rem,3vw,1.9rem);line-height:1.2;margin:52px 0 18px;position:relative}
h2::after{content:none}
h3{font-family:var(--f-serif);font-weight:600;font-size:1.18rem;margin:24px 0 8px}
.eyebrow{font-family:var(--f-hand);font-weight:700;font-size:1.5rem;letter-spacing:0;text-transform:none;color:var(--terra);margin-bottom:4px;line-height:1}
.lead{color:var(--muted);font-size:1.1rem;max-width:680px;line-height:1.65}
.answer{font-size:1.14rem;line-height:1.72;color:var(--ink);margin:8px 0 22px;max-width:66ch}
table{width:100%;border-collapse:separate;border-spacing:0;background:var(--paper2);border:1px solid #E6DAC5;border-radius:var(--r);overflow:hidden;font-family:var(--f-sans);font-size:.94rem;margin:18px 0;box-shadow:0 10px 26px -22px rgba(62,14,22,.4)}
th{background:#EADCC2;text-align:left;padding:13px 18px;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--maroon2);font-weight:600}
td{padding:14px 18px;border-top:1px solid #EFE2CC;vertical-align:top}
.badge{display:inline-block;background:#FAF0E2;border:1px solid #ECD9B8;color:#8A5A1E;border-radius:8px;padding:3px 10px;font-size:.78rem;font-family:-apple-system,sans-serif}
.badge.live{background:#EAF0E6;border-color:#C9D6BF;color:#3F5934}
.badge.beta{background:#E8EEF5;border-color:#C5D3E3;color:#33536F}
.badge.edu{background:#F3E9F2;border-color:#DFC9DC;color:#6B3F63}
.card{background:var(--paper2);border:1px solid #E6DAC5;border-radius:var(--r-lg);padding:26px 28px;margin:18px 0;box-shadow:0 10px 26px -22px rgba(62,14,22,.4)}
.pc{list-style:none;margin:8px 0 14px}
.pc li{padding:6px 0 6px 28px;position:relative}
.pc.good li::before{content:"✓";position:absolute;left:0;color:var(--olive-deep);font-weight:700}
.pc.bad li::before{content:"–";position:absolute;left:0;color:var(--terra);font-weight:700}
ul.pc:not(.good):not(.bad){list-style:disc;margin-left:20px}
ul.pc:not(.good):not(.bad) li{padding:3px 0}
.shops a{display:inline-block;background:var(--terra);color:#fff;text-decoration:none;padding:11px 20px;border-radius:99px;font-family:var(--f-sans);font-weight:500;font-size:.88rem;margin:4px 8px 4px 0;transition:.15s;box-shadow:var(--shadow-sm)}
.shops a:hover{background:var(--terra-deep);transform:translateY(-1px)}
.disclosure{font-size:.8rem;color:var(--muted);font-family:-apple-system,sans-serif;border-left:3px solid var(--line);padding-left:12px;margin:16px 0}
.meta{font-size:.8rem;color:var(--muted);font-family:-apple-system,sans-serif}
.crumb{font-size:.8rem;color:var(--muted);font-family:-apple-system,sans-serif;margin-bottom:16px}
.crumb a{color:var(--muted);text-decoration:none}
.crumb a:hover{color:var(--terra)}
footer{background:var(--maroon);padding:34px 0;font-size:.85rem;color:#D8BFA9;font-family:var(--f-sans);text-align:center}
footer a{color:var(--gold)}
.rankrow{display:grid;grid-template-columns:40px 1fr 120px 185px;gap:16px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:18px 22px;margin:12px 0;text-decoration:none;color:var(--ink);box-shadow:var(--shadow-sm);transition:transform .15s,box-shadow .15s,border-color .15s}
.rankrow.food{grid-template-columns:30px 46px 1fr 120px 175px}
.rankrow:hover{border-color:var(--terra);transform:translateY(-2px);box-shadow:var(--shadow)}
.rankrow .num{font-size:1.3rem;color:var(--line);font-weight:700}
.rankrow:not(.food)>span:nth-child(3){justify-self:start}
.rankrow.food>span:nth-child(4){justify-self:start}
.pkgcell{display:flex;align-items:center;justify-content:center}
.pkg{width:42px;height:48px;display:block}
.rankrow .gobtn{font-family:-apple-system,sans-serif;font-size:.82rem;font-weight:600;color:var(--terra);white-space:nowrap;justify-self:end;text-align:right}
@media(max-width:760px){
.rankrow:not(.food){grid-template-columns:30px 1fr;gap:8px 12px}
.rankrow:not(.food)>span:nth-child(3),.rankrow:not(.food) .gobtn{grid-column:2;justify-self:start;text-align:left}
.rankrow.food{grid-template-columns:26px 40px 1fr;gap:8px 12px}
.rankrow.food>span:nth-child(3){grid-column:3}
.rankrow.food>span:nth-child(4),.rankrow.food .gobtn{grid-column:3;justify-self:start;text-align:left}
.pkg{width:36px;height:42px}
}
.phead{display:flex;gap:18px;align-items:flex-start;margin:0 0 6px}
.phead-main{min-width:0}
.pkgbig{width:104px;height:auto;flex:0 0 auto;filter:drop-shadow(0 8px 16px rgba(34,29,21,.12))}
@media(max-width:560px){.phead{gap:12px}.pkgbig{width:74px}}
@media(max-width:430px){.phead{flex-direction:column;gap:10px}.pkgbig{width:64px}}
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
.protocol,.legalbox,.pending{background:none;border:0;border-left:3px solid var(--line);border-radius:0;padding:3px 0 3px 16px;font-size:.92rem;font-family:var(--f-sans);color:var(--muted);margin:18px 0}
.protocol strong,.legalbox strong,.pending strong{color:var(--ink)}
.protocol a,.legalbox a,.pending a{color:var(--terra)}
.catgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px;margin:24px 0}
.catcard{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);padding:26px;text-decoration:none;color:var(--ink);display:flex;flex-direction:column;gap:9px;transition:transform .15s,box-shadow .15s,border-color .15s;box-shadow:var(--shadow-sm)}
.catcard:hover{border-color:var(--terra);transform:translateY(-3px);box-shadow:var(--shadow)}
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
.warnline{background:none;border:0;border-left:3px solid var(--terra);color:var(--terra-deep);border-radius:0;padding:2px 0 2px 10px;font-size:.8rem;font-family:var(--f-sans);margin-top:8px}
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
/* ===== opinie gości (UGC) ===== */
.crating{display:inline-flex;align-items:center;gap:5px;font-family:var(--f-sans);font-size:.95rem;color:var(--muted)}
.crating .st{color:var(--gold);letter-spacing:1px}
.dualrate{display:flex;gap:14px;flex-wrap:wrap;margin:6px 0 4px}
.dualrate .rt{flex:1;min-width:210px;background:var(--paper2);border:1px solid #E6DAC5;border-radius:var(--r);padding:14px 18px}
.dualrate .rt .lbl{font-family:var(--f-sans);font-size:.74rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.dualrate .rt .big{font-family:var(--f-serif);font-weight:700;font-size:1.8rem;color:var(--terra);line-height:1.1;margin-top:2px}
.dualrate .rt.exp .big{color:var(--maroon2)}
.dualrate .rt .sub{font-family:var(--f-sans);font-size:.82rem;color:var(--muted)}
.stars{--s:#D9A441;display:inline-block;font-size:1.05rem;letter-spacing:2px;color:#DCD2BD}
.stars b{color:var(--s)}
.rvlist{display:flex;flex-direction:column;gap:14px;margin:18px 0}
.rvcard{background:var(--card);border:1px solid #E6DAC5;border-radius:var(--r);padding:16px 18px;box-shadow:0 8px 22px -18px rgba(62,14,22,.5)}
.rvhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.rvhead .who{font-family:var(--f-serif);font-weight:600}
.rvhead .when{font-family:var(--f-sans);font-size:.78rem;color:var(--muted);margin-left:auto}
.rvmeta{font-family:var(--f-sans);font-size:.8rem;color:var(--muted);margin:4px 0 0;display:flex;gap:8px 14px;flex-wrap:wrap}
.rvmeta .rec{color:var(--olive-deep);font-weight:600}
.rvbody{margin:8px 0 0;font-size:.98rem}
.rvphoto{margin-top:10px}
.rvphoto img{max-width:160px;border-radius:12px;cursor:zoom-in;border:1px solid #E6DAC5;display:block}
.rvempty{font-family:var(--f-sans);color:var(--muted);font-size:.92rem;padding:6px 0}
.rvform{background:var(--paper2);border:1px solid #E6DAC5;border-radius:var(--r-lg);padding:22px 24px;margin:18px 0}
.rvform h3{margin:0 0 4px}
.rvform .hint{font-family:var(--f-sans);font-size:.86rem;color:var(--muted);margin-bottom:14px}
.rvform label{display:block;font-family:var(--f-sans);font-size:.78rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin:12px 0 5px}
.rvform input[type=text],.rvform input[type=email],.rvform textarea,.rvform select{width:100%;padding:11px 13px;border:1px solid #E0D0B4;border-radius:12px;background:var(--card);font:inherit;font-size:.95rem;color:var(--ink)}
.rvform textarea{min-height:96px;resize:vertical}
.rvform .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:540px){.rvform .grid2{grid-template-columns:1fr}}
.starpick{display:inline-flex;flex-direction:row-reverse;gap:4px;font-size:2rem;line-height:1}
.starpick input{position:absolute;opacity:0;width:0;height:0}
.starpick label{margin:0;color:#DCD2BD;cursor:pointer;transition:.1s;font-size:2rem;padding:0}
.starpick label:hover,.starpick label:hover ~ label,.starpick input:checked ~ label{color:var(--gold)}
.rvform .filehint{font-family:var(--f-sans);font-size:.78rem;color:var(--muted);margin-top:4px}
.rvform .consent{display:flex;gap:9px;align-items:flex-start;margin-top:14px;font-family:var(--f-sans);font-size:.82rem;color:var(--muted);text-transform:none;letter-spacing:0;font-weight:400}
.rvform .consent input{margin-top:3px;flex:0 0 auto}
.rvsubmit{margin-top:16px;background:var(--terra);color:#fff;border:0;font-family:var(--f-sans);font-weight:600;font-size:1rem;padding:13px 28px;border-radius:99px;cursor:pointer;box-shadow:0 12px 26px -14px rgba(199,91,56,.6);transition:.15s}
.rvsubmit:hover{background:var(--terra-deep);transform:translateY(-2px)}
.rvsubmit:disabled{opacity:.55;cursor:default;transform:none}
.rvmsg{font-family:var(--f-sans);font-size:.92rem;margin-top:12px;padding:11px 14px;border-radius:12px;display:none}
.rvmsg.ok{display:block;background:#EAF0E6;border:1px solid #C9D6BF;color:#3F5934}
.rvmsg.err{display:block;background:#F8EEE9;border:1px solid #E5CDC2;color:#7A4633}
/* ===== ranking: siatka kafelków (styl nomad list) ===== */
.rgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px;margin:18px 0}
.rcard{position:relative;display:flex;flex-direction:column;border-radius:var(--r-lg);overflow:hidden;background:linear-gradient(165deg,var(--maroon2),var(--maroon));border:1px solid #4a121c;box-shadow:0 14px 30px -20px rgba(62,14,22,.7);text-decoration:none;color:#F2E8D5;transition:transform .16s,box-shadow .16s,border-color .16s}
.rcard:hover{transform:translateY(-4px);box-shadow:0 28px 48px -24px rgba(62,14,22,.7);border-color:var(--gold)}
.rc-img{position:relative;aspect-ratio:4/3;background:linear-gradient(150deg,#5a1620,#3E0E16);display:flex;align-items:center;justify-content:center;overflow:hidden}
.rc-img.has-photo{background-size:cover;background-position:center}
.rc-img .pkg,.rc-img svg{width:auto;height:64%}
.rc-rank{position:absolute;top:9px;left:13px;font-family:var(--f-serif);font-weight:700;font-size:1.55rem;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.6);z-index:3;line-height:1}
.rc-badge{position:absolute;top:11px;right:12px;z-index:3;font-family:var(--f-sans);font-size:.64rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:rgba(0,0,0,.34);color:#F2E8D5;padding:3px 9px;border-radius:99px}
.rc-body{padding:13px 15px 15px;display:flex;flex-direction:column;gap:5px;flex:1}
.rc-name{font-family:var(--f-serif);font-weight:600;font-size:1.05rem;line-height:1.18;color:#F8EFDD}
.rc-paws{line-height:0}
.rc-stats{font-family:var(--f-sans);font-size:.82rem;color:#D8BFA9;display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:auto;padding-top:4px}
.rc-stats b{color:#F2E8D5;font-weight:600}
.rc-go{font-family:var(--f-sans);font-size:.8rem;font-weight:600;color:var(--gold);margin-top:7px}
.rc-hover{position:absolute;left:0;right:0;top:0;bottom:0;background:linear-gradient(180deg,rgba(62,14,22,.93),rgba(40,5,10,.96));color:#F2E8D5;padding:15px 16px;display:flex;flex-direction:column;justify-content:center;gap:8px;opacity:0;transition:opacity .18s;pointer-events:none;z-index:4}
.rcard:hover .rc-hover{opacity:1}
.rc-hover .h{font-family:var(--f-sans);font-size:.66rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#D9A441;margin-bottom:1px}
.rc-bar{display:grid;grid-template-columns:90px 1fr;align-items:center;gap:8px;font-family:var(--f-sans);font-size:.74rem}
.rc-bar .t{color:#E7D2C0;white-space:nowrap}
.rc-bar .track{height:7px;background:rgba(255,255,255,.16);border-radius:4px;overflow:hidden}
.rc-bar .track i{display:block;height:100%;background:var(--gold);border-radius:4px}
.rc-bar .v{display:none}
.rc-people .track i{background:var(--terra)}
.rc-pnote{font-family:var(--f-sans);font-size:.64rem;color:#C9A98C;margin:-3px 0 1px}
.rc-match{margin-top:5px;font-family:var(--f-sans);font-size:.8rem;color:#fff}
.rc-match .mbar{height:7px;background:rgba(255,255,255,.18);border-radius:4px;margin-top:4px;overflow:hidden}
.rc-match .mbar i{display:block;height:100%;background:var(--gold)}
.rc-match.bad b{color:#F0B8A6}
.rcard.blocked{opacity:.62}
.rcard.blocked .rc-img{filter:grayscale(.6)}
.rc-warn{font-family:var(--f-sans);font-size:.74rem;color:#F0B8A6;margin-top:2px}
@media(hover:none){.rc-hover{display:none}}
/* ===== ciemny motyw strony rankingu (kategorie) ===== */
body.rank-dark{background:#340b12}
.rank-dark main{color:#EBD9C2}
.rank-dark h1,.rank-dark h2,.rank-dark h3{color:#F8EFDD}
.rank-dark p,.rank-dark .answer,.rank-dark td{color:#E7D2C0}
.rank-dark .lead,.rank-dark .meta,.rank-dark .crumb,.rank-dark .crumb a{color:#C9A98C}
.rank-dark .crumb a:hover,.rank-dark a:hover{color:var(--gold)}
.rank-dark .eyebrow{color:var(--gold)}
.rank-dark .badge.live{background:rgba(255,255,255,.08);border-color:rgba(242,232,213,.25);color:#CFE0C4}
.rank-dark .profile{background:rgba(255,255,255,.05);border-color:rgba(242,232,213,.18)}
.rank-dark .profile h3{color:#F8EFDD}
.rank-dark .pf-g label{color:#C9A98C}
.rank-dark .pf-g select{background:#4a121c;border-color:rgba(242,232,213,.28);color:#F2E8D5}
.rank-dark .pf-reset{color:var(--gold)}
.rank-dark .matchlegend{background:rgba(255,255,255,.05);border-color:rgba(242,232,213,.22);color:#C9A98C}
.rank-dark table{background:rgba(255,255,255,.04);border-color:rgba(242,232,213,.16);box-shadow:none}
.rank-dark th{background:rgba(0,0,0,.28);color:#E7D2C0}
.rank-dark td{border-top-color:rgba(242,232,213,.12)}
.rank-dark .catcard{background:rgba(255,255,255,.05);border-color:rgba(242,232,213,.18);color:#EBD9C2}
.rank-dark .catcard:hover{border-color:var(--gold);background:rgba(255,255,255,.09)}
.rank-dark .catcard h3{color:#F8EFDD}.rank-dark .catcard p{color:#C9A98C}
.rank-dark .rcard{border-color:rgba(242,232,213,.16)}
.rank-dark .protocol,.rank-dark .legalbox,.rank-dark .pending{border-left-color:var(--gold);color:#C9A98C}
.rank-dark .protocol strong,.rank-dark .legalbox strong{color:#F8EFDD}
`;

/* ---------- CSS strony głównej (landing, wg zaakceptowanego prototypu bordo) ---------- */
const LP_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--maroon:#3E0E16;--maroon2:#671C26;--cream:#F2E8D5;--cream2:#FAF3E4;--terra:#C75B38;--caramel:#C9824C;--gold:#D9A441;--ink:#2A1A18;--paper:#EFE2CC;--sage:#7E7A45}
html{scroll-behavior:smooth}
body{font-family:'Inter',system-ui,sans-serif;color:var(--ink);background:var(--cream);line-height:1.7;overflow-x:hidden}
.serif{font-family:'Fraunces',Georgia,serif}.hand{font-family:'Caveat',cursive}
.wrap{max-width:1180px;margin:0 auto;padding:0 28px}
h1,h2,h3{font-family:'Fraunces',Georgia,serif;font-weight:600;line-height:1.04;letter-spacing:-.015em}
.kick{font-family:'Caveat',cursive;font-weight:700;font-size:1.8rem;color:var(--terra);line-height:1}
.btn{display:inline-flex;align-items:center;gap:9px;font-weight:600;font-size:1rem;text-decoration:none;padding:15px 30px;border-radius:99px;transition:.18s;cursor:pointer;border:0}
.btn-pri{background:var(--terra);color:#fff;box-shadow:0 14px 30px -12px rgba(199,91,56,.7)}
.btn-pri:hover{background:#A8472A;transform:translateY(-2px)}
.btn-ghost{background:rgba(255,255,255,.08);border:1.5px solid rgba(242,232,213,.6);color:var(--cream)}
.btn-ghost:hover{background:rgba(255,255,255,.18)}
nav.lpnav{position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:18px 28px;transition:.25s}
nav.lpnav.solid{background:rgba(62,14,22,.94);backdrop-filter:blur(8px);padding:12px 28px;box-shadow:0 6px 20px -10px rgba(0,0,0,.5)}
nav.lpnav .logo{display:flex;align-items:center;text-decoration:none}
nav.lpnav .links{display:flex;gap:26px;align-items:center}
nav.lpnav .links a{color:var(--cream);text-decoration:none;font-size:.95rem;font-weight:500;opacity:.92}
nav.lpnav .links a:hover{color:var(--gold)}
nav.lpnav .mkt{display:flex;gap:9px;align-items:center}
nav.lpnav .mkt a,nav.lpnav .mkt strong{font-size:1.2rem;text-decoration:none;opacity:.6;line-height:1}
nav.lpnav .mkt strong{opacity:1}
@media(max-width:880px){nav.lpnav .links a:not(.flag){display:none}}
.hero{position:relative;min-height:100svh;display:flex;align-items:flex-start;color:var(--cream);overflow:hidden;background:#3a0c12}
.hero .bg{position:absolute;inset:0;background-position:center 62%;background-size:cover;background-repeat:no-repeat;z-index:0}
.hero .ov{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(40,5,10,.86),rgba(40,5,10,.34) 32%,rgba(40,5,10,0) 50%,rgba(40,5,10,.12) 74%,rgba(40,5,10,.78))}
.hero .wrap{position:relative;z-index:2;width:100%;padding-top:128px;padding-bottom:120px}
.hero .htext{max-width:780px}
.hero h1{font-size:clamp(2.6rem,6.2vw,5.2rem);color:#F8EFDD}
.hero h1 em{font-style:normal;color:var(--gold)}
.hero p.sub{font-size:1.18rem;max-width:520px;margin:24px 0 30px;color:#EBDDC4}
.hero .cta{display:flex;gap:14px;flex-wrap:wrap}
.hero .trust{position:absolute;left:28px;right:28px;bottom:30px;z-index:2;max-width:1180px;margin:0 auto;display:flex;gap:8px 24px;flex-wrap:wrap;font-size:.92rem;color:#E7D7Bd}
.hero .trust b{color:var(--gold)}
.scrollcue{position:absolute;bottom:84px;left:50%;transform:translateX(-50%);font-size:.74rem;letter-spacing:.2em;text-transform:uppercase;color:#E7D7Bd;opacity:.7;z-index:2}
.sec{padding:58px 0}.center{text-align:center}
.manifesto{background:var(--cream)}
.manifesto h2{font-size:clamp(2rem,4.6vw,3.4rem);max-width:18ch;margin:14px auto 0}
.manifesto h2 .u{background:linear-gradient(transparent 62%,rgba(199,91,56,.30) 0);padding:0 .08em}
.manifesto p{max-width:600px;margin:22px auto 0;color:#7a6b56;font-size:1.1rem}
.pillars{background:var(--cream2)}
.pillgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:46px}
.pill{background:var(--cream);border:1px solid #E7D8Bd;border-radius:26px;padding:30px 26px;position:relative;transition:.2s;box-shadow:0 10px 26px -20px rgba(62,14,22,.5)}
.pill:hover{transform:translateY(-5px);box-shadow:0 26px 44px -24px rgba(62,14,22,.45);border-color:var(--terra)}
.pill .no{font-family:'Caveat',cursive;font-weight:700;font-size:2.2rem;color:var(--terra);line-height:1}
.pill .ic{margin:6px 0 12px}.pill h3{font-size:1.28rem;margin-bottom:8px}
.pill .w{position:absolute;top:26px;right:26px;font-family:'Caveat',cursive;font-weight:700;color:var(--maroon2);font-size:1.5rem}
.pill p{font-size:.95rem;color:#7a6b56}
@media(max-width:880px){.pillgrid{grid-template-columns:1fr 1fr}}@media(max-width:520px){.pillgrid{grid-template-columns:1fr}}
.cats{background:var(--cream2)}
.lcats{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px;margin-top:42px;text-align:left}
.lcat{background:var(--cream);border:1px solid #E7D8Bd;border-radius:22px;padding:24px 22px;text-decoration:none;color:var(--ink);display:flex;flex-direction:column;gap:8px;transition:.18s;box-shadow:0 10px 26px -20px rgba(62,14,22,.5)}
.lcat:hover{transform:translateY(-4px);border-color:var(--terra);box-shadow:0 24px 40px -24px rgba(62,14,22,.45)}
.lcat .ic{font-size:1.7rem;line-height:1}
.lcat h3{font-family:'Fraunces',serif;font-weight:600;font-size:1.15rem;margin:0}
.lcat p{font-size:.9rem;color:#7a6b56;margin:0;flex:1}
.lcat .st{font-family:'Inter',sans-serif;font-size:.74rem;font-weight:600;color:var(--terra)}
.process{background:linear-gradient(160deg,var(--maroon2),var(--maroon));color:var(--cream)}
.process h2{color:var(--cream);font-size:clamp(1.9rem,4vw,3rem)}
.process p.lead2{max-width:52ch;margin:14px auto 0;color:#E7D2C0}
.procgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:30px 18px;margin:48px auto 0;max-width:1060px}
.procitem{display:flex;flex-direction:column;align-items:center;gap:9px;text-align:center}
.procitem img{height:100px;width:auto;display:block;filter:drop-shadow(0 6px 14px rgba(0,0,0,.25))}
.procitem b{font-family:'Fraunces',serif;font-weight:500;font-size:.96rem;color:var(--cream)}
@media(max-width:880px){.procgrid{grid-template-columns:repeat(3,1fr);gap:28px 14px}}
@media(max-width:520px){.procgrid{grid-template-columns:repeat(2,1fr)}}
.rank{background:var(--paper)}
.rrow{display:grid;grid-template-columns:54px 70px 1fr auto auto;gap:22px;align-items:center;background:var(--cream);border:1px solid #E7D8Bd;border-radius:22px;padding:18px 26px;margin:14px 0;text-decoration:none;color:inherit;transition:.16s;box-shadow:0 8px 22px -18px rgba(62,14,22,.5)}
.rrow:hover{transform:translateY(-3px);box-shadow:0 22px 40px -24px rgba(62,14,22,.45);border-color:var(--terra)}
.rrow .rno{font-family:'Fraunces',serif;font-weight:700;font-size:2rem;color:#D8C3A2}
.rrow .nm{font-family:'Fraunces',serif;font-weight:600;font-size:1.2rem}
.rrow .mt{font-size:.85rem;color:#8a7c64}
.rrow .sc{font-family:'Fraunces',serif;font-weight:700;font-size:1.5rem;color:var(--terra)}
.rrow .go{color:var(--terra);font-weight:600;white-space:nowrap}
.rrow .bag{width:54px;height:60px}
@media(max-width:740px){.rrow{grid-template-columns:40px 56px 1fr auto;gap:14px}.rrow .go{display:none}}
.countries{background:linear-gradient(160deg,var(--maroon2),var(--maroon));color:var(--cream)}
.crow{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:44px}
.ccard{display:flex;flex-direction:column;align-items:center;gap:11px;width:186px;padding:30px 22px 26px;background:rgba(250,243,228,.05);border:1px solid rgba(242,232,213,.20);border-radius:22px;text-decoration:none;color:var(--cream);transition:.2s}
.ccard:hover{background:rgba(250,243,228,.11);transform:translateY(-5px);border-color:var(--gold)}
.ccard .fl{width:60px;height:60px;border-radius:50%;background:var(--cream);display:flex;align-items:center;justify-content:center;font-size:1.9rem;box-shadow:0 10px 22px -10px rgba(0,0,0,.55)}
.ccard b{font-family:'Fraunces',serif;font-size:1.12rem;color:var(--cream)}
.ccard .n{font-size:.82rem;color:#E7D2C0}
.ccard .go{font-size:.8rem;color:var(--gold);font-weight:600}
.ccard.soon{opacity:.82}.ccard.soon .n{color:var(--gold)}
.iginvite{background:#F9E2CA;overflow:hidden}
.iginvite .ph{position:relative;max-width:1500px;margin:0 auto}
.igphoto{display:block;width:100%}
.igtext{position:absolute;top:0;bottom:0;right:0;width:50%;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;text-align:left;padding:0 max(30px,4.5vw) 0 10px}
.iginvite h2{font-size:clamp(1.7rem,3.3vw,3rem);margin:10px 0 0;max-width:14ch}
.iginvite p{max-width:42ch;margin:16px 0 0;color:#7a6b56;font-size:1.05rem}
.follow-lbl{font-family:'Caveat',cursive;font-weight:700;font-size:1.6rem;color:var(--terra);margin-top:26px;line-height:1}
.sclinks{display:flex;gap:20px;margin-top:12px}
.scitem{display:flex;flex-direction:column;align-items:center;gap:8px;text-decoration:none}
.sclbl{font-family:'Inter';font-size:.85rem;font-weight:600;color:var(--maroon)}
.scbtn{display:block;width:72px;height:72px;border-radius:20px;overflow:hidden;box-shadow:0 12px 26px -12px rgba(62,14,22,.55);transition:.18s}
.scitem:hover .scbtn{transform:translateY(-3px) rotate(-2deg)}
.scbtn img{width:100%;height:100%;display:block;object-fit:cover}
@media(max-width:860px){.igtext{position:static;width:auto;align-items:center;text-align:center;padding:60px 24px 6px}.iginvite h2,.iginvite p{max-width:34ch;margin-left:auto;margin-right:auto}}
.ctaband{background:linear-gradient(120deg,var(--terra),#9e3f24);color:#fff;text-align:center}
.ctaband h2{font-size:clamp(1.9rem,4vw,3rem);color:#fff;max-width:20ch;margin:0 auto 10px}
.ctaband p{opacity:.92;max-width:46ch;margin:0 auto 24px}
footer.lpfoot{background:var(--maroon);color:#D8BFA9;padding:62px 0 32px}
footer.lpfoot .fg{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:30px}
footer.lpfoot .flogo{display:flex;align-items:center}
footer.lpfoot h4{color:var(--cream);font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;margin-bottom:14px;font-weight:600}
footer.lpfoot a{display:block;color:#D8BFA9;text-decoration:none;font-size:.95rem;padding:4px 0}footer.lpfoot a:hover{color:var(--gold)}
footer.lpfoot .legal{margin-top:44px;padding-top:22px;border-top:1px solid rgba(255,255,255,.12);font-size:.82rem;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}
@media(max-width:760px){footer.lpfoot .fg{grid-template-columns:1fr 1fr}}
.rev{opacity:0;transform:translateY(28px);transition:opacity .7s,transform .7s}.rev.in{opacity:1;transform:none}
.eyebrowc{color:var(--terra)}
@media(max-width:820px){.hero .bg{background-position:center 70%}}
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

/* ---------- miniaturki opakowań (stylizowane SVG, paleta strony) ---------- */
/* Worek dla suchej karmy, puszka dla mokrej; kolor pasma = deterministyczny z marki,
   monogram = 2 pierwsze litery nazwy. Renderowane inline (SSR, bez plików, bez praw autorskich). */
const PKG_PALETTE = ['#B5613B', '#6E7544', '#3F6F6A', '#C28A2C', '#6E4357', '#4A5C77', '#9C4A38', '#5E7259', '#2F3E5C', '#8A5A3C'];
const PKG_PAW = '<circle cx="5" cy="10.2" r="2.2"/><circle cx="9.4" cy="6.9" r="2.4"/><circle cx="14.6" cy="6.9" r="2.4"/><circle cx="19" cy="10.2" r="2.2"/><path d="M12 11.4c3.1 0 5.7 2.3 5.7 5 0 1.8-1.4 3.2-3.3 3.2-.9 0-1.5-.3-2.4-.3s-1.5.3-2.4.3c-1.9 0-3.3-1.4-3.3-3.2 0-2.7 2.6-5 5.7-5z"/>';
const pkgHash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const pkgColor = p => PKG_PALETTE[pkgHash((p.brand || p.name || '').toLowerCase()) % PKG_PALETTE.length];
const pkgMono = p => ((p.name || p.brand || '?').trim().split(/\s+/)[0] || '?').slice(0, 2).toUpperCase();
function pkgThumb(p, cls = 'pkg') {
  const c = pkgColor(p), mono = pkgMono(p), wet = /mokr|wet|puszk|pouch|can/i.test(p.type || '');
  const al = (p.name || '').replace(/&/g, '&amp;').replace(/"/g, '');
  if (wet) {
    return `<svg class="${cls}" viewBox="0 0 56 64" role="img" aria-label="${al}">`
      + `<ellipse cx="28" cy="60" rx="15" ry="2.4" fill="#221d15" opacity=".10"/>`
      + `<rect x="12" y="15" width="32" height="43" rx="2.5" fill="#FBF6EC" stroke="#D9CDB6" stroke-width="1.1"/>`
      + `<ellipse cx="28" cy="15" rx="16" ry="4.4" fill="#EFE5CE" stroke="#D9CDB6" stroke-width="1.1"/>`
      + `<g transform="translate(22.1,15.6) scale(.5)" fill="${c}" opacity=".30">${PKG_PAW}</g>`
      + `<rect x="12" y="29" width="32" height="20" fill="${c}"/>`
      + `<text x="28" y="43" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="700" letter-spacing=".5" fill="#fff">${mono}</text>`
      + `</svg>`;
  }
  return `<svg class="${cls}" viewBox="0 0 56 64" role="img" aria-label="${al}">`
    + `<ellipse cx="28" cy="61" rx="17" ry="2.4" fill="#221d15" opacity=".10"/>`
    + `<rect x="10" y="5" width="36" height="55" rx="4" fill="#FBF6EC" stroke="#D9CDB6" stroke-width="1.1"/>`
    + `<rect x="10" y="5" width="36" height="6.5" rx="3.2" fill="#EFE5CE"/>`
    + `<g transform="translate(20.7,10) scale(.62)" fill="${c}" opacity=".30">${PKG_PAW}</g>`
    + `<rect x="13" y="25" width="30" height="21" fill="${c}"/>`
    + `<text x="28" y="39.6" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="700" letter-spacing=".5" fill="#fff">${mono}</text>`
    + `</svg>`;
}

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

/* ---------- social (Instagram + TikTok) ---------- */
const SOCIAL_LINKS = { instagram: 'https://www.instagram.com/bekon.dogranking', tiktok: 'https://www.tiktok.com/@bekon.dogranking' };
const SOCIAL = `<a href="${SOCIAL_LINKS.instagram}" target="_blank" rel="noopener noreferrer" aria-label="DogRanking na Instagramie"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none"/></svg></a><a href="${SOCIAL_LINKS.tiktok}" target="_blank" rel="noopener noreferrer" aria-label="DogRanking na TikToku"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.7 3c.32 2.16 1.53 3.46 3.62 3.6v2.41c-1.21.12-2.27-.28-3.5-1.02v6.67c0 3.39-2.5 5.62-5.45 5.62-2.84 0-5.07-2.18-5.07-5.06 0-3.01 2.39-5.16 5.62-4.96v2.62c-.43-.12-.86-.18-1.27-.18-1.39 0-2.45 1.06-2.45 2.45 0 1.46 1.07 2.51 2.55 2.51 1.5 0 2.62-1.09 2.62-2.96V3h2.8z"/></svg></a>`;

/* ---------- szkielet ---------- */
function page({ title, desc, canonical, body, jsonld, mkt = 'pl', alts = null, bodyClass = '' }) {
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
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
${STAGING ? `<div style="background:#8A5A1E;color:#FAF0E2;text-align:center;padding:8px 16px;font-family:-apple-system,sans-serif;font-size:.85rem">${S.staging}</div>` : ''}
<header><div class="bar">
  <a class="mark" href="${H('index.html')}" aria-label="DogRanking - wybierz kraj"><img src="${href(canonical, 'logo-dr.webp')}" alt="DogRanking" height="42"></a>
  <input type="checkbox" id="navtoggle" class="navt" aria-label="Menu">
  <label for="navtoggle" class="burger" title="Menu"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg></label>
  <nav>
    <a href="${H(mkt + '/')}">${S.nav[0]}</a><a href="${H(mkt + '/' + cSlug(food, mkt) + '/')}">${cName(food, mkt)}</a><a href="${H(mkt + '/') + '#kategorie'}">${S.nav[1]}</a>${mkt === 'pl' ? `<a href="${H('pl/wiedza/')}">Wiedza</a>` : ''}<a href="${H(mkt + '/' + (m.lang === 'pl' ? 'metodologia' : 'methodology') + '/')}">${S.nav[2]}</a>
  </nav>
  <div class="social">${SOCIAL}</div>
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
  { file: '01-opakowanie', label: 'Opakowanie - egzemplarz testowy u nas w domu' },
  { file: '02-etykieta', label: 'Etykieta z bliska: skład i analiza gwarantowana' },
  { file: '03-granulat', label: 'Zawartość z miarką - pomiar wielkości/konsystencji' },
  { file: '04-bekon', label: 'Werdykt Bekona - degustacja w formie przysmaku' }
] : [
  { file: '01-produkt', label: 'Produkt - egzemplarz testowy (kupiony, nie od producenta)' },
  { file: '02-detal', label: 'Detal wykonania z bliska' },
  { file: '03-pomiar', label: 'Pomiar / test wytrzymałości' },
  { file: '04-bekon', label: 'Bekon w akcji - test użytkowy' }
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
function reviewsSection(p, cat, mkt) {
  const m = MARKETS[mkt]; const pl = m.lang === 'pl';
  const [pf, ph] = pawParts(p.score); const ourPaws = pf + ph * 0.5;
  const cfg = { api: REVIEWS.api, sk: REVIEWS.turnstileSiteKey, market: mkt, category: cat.slug, slug: p.slug };
  const T = pl ? {
    h: 'Opinie psich rodziców', expLbl: 'Ocena DogRanking', expSub: 'wg metodologii · 4 filary, 100 pkt',
    comLbl: 'Ocena społeczności', comNone: 'Brak opinii - bądź pierwszy', loading: 'Ładuję opinie…',
    countSuf: 'opinii', recSuf: 'poleca', empty: 'Nie ma jeszcze opinii o tym produkcie. Podziel się swoją!',
    formH: 'Masz tę karmę? Dodaj opinię', formHint: 'Pomóż innym psim rodzicom - najbardziej liczy się zdjęcie miski lub psa przy posiłku.',
    name: 'Imię lub nick', email: 'E-mail (opcjonalnie, nie publikujemy)', rate: 'Twoja ocena',
    rec: 'Polecasz?', recYes: 'Tak', recNo: 'Nie', dog: 'Wielkość psa', any: '-', dS: 'mały', dM: 'średni', dL: 'duży',
    title: 'Tytuł (opcjonalnie)', body: 'Twoja opinia', photo: 'Zdjęcie produktu (opcjonalnie)',
    fileHint: 'JPG/PNG/WEBP, do 5 MB. Każde zdjęcie sprawdzamy przed publikacją.',
    consent: 'Zgadzam się na publikację mojej opinii i zdjęcia. Opinia trafia najpierw do moderacji.',
    submit: 'Wyślij opinię 🐾', sending: 'Wysyłam…',
    ok: 'Dziękujemy! Twoja opinia czeka na moderację i pojawi się po sprawdzeniu.',
    err: 'Nie udało się wysłać. Sprawdź pola i spróbuj ponownie.', need: 'Zaznacz ocenę, wpisz opinię i zaznacz zgodę.'
  } : {
    h: 'What dog parents say', expLbl: 'DogRanking score', expSub: 'by our methodology · 4 pillars, 100 pts',
    comLbl: 'Community rating', comNone: 'No reviews yet - be the first', loading: 'Loading reviews…',
    countSuf: 'reviews', recSuf: 'recommend', empty: 'No reviews of this product yet. Share yours!',
    formH: 'Got this food? Add your review', formHint: 'Help other dog parents - a photo of the bowl or your dog at mealtime helps most.',
    name: 'Name or nickname', email: 'Email (optional, never published)', rate: 'Your rating',
    rec: 'Recommend?', recYes: 'Yes', recNo: 'No', dog: 'Dog size', any: '-', dS: 'small', dM: 'medium', dL: 'large',
    title: 'Title (optional)', body: 'Your review', photo: 'Product photo (optional)',
    fileHint: 'JPG/PNG/WEBP, up to 5 MB. Every photo is reviewed before publishing.',
    consent: 'I agree to publish my review and photo. Reviews are moderated before going live.',
    submit: 'Send review 🐾', sending: 'Sending…',
    ok: 'Thank you! Your review is awaiting moderation and will appear once approved.',
    err: 'Could not send. Check the fields and try again.', need: 'Pick a rating, write a review and tick consent.'
  };
  const starpick = [5, 4, 3, 2, 1].map(n => `<input type="radio" name="rating" id="rv-st${n}" value="${n}"><label for="rv-st${n}" title="${n}">★</label>`).join('');
  return `
<h2 id="opinie">${T.h}</h2>
<div class="dualrate">
  <div class="rt exp"><div class="lbl">${T.expLbl}</div><div class="big">${ourPaws} / 5 🐾</div><div class="sub">${T.expSub}</div></div>
  <div class="rt"><div class="lbl">${T.comLbl}</div><div class="big" data-cbig>–</div><div class="sub" data-csub>${T.comNone}</div></div>
</div>
<div class="rvlist" data-rvlist><p class="rvempty">${T.loading}</p></div>
<form class="rvform" data-rvform autocomplete="off">
  <h3>${T.formH}</h3>
  <p class="hint">${T.formHint}</p>
  <div class="grid2">
    <div><label for="rv-name">${T.name}</label><input type="text" id="rv-name" name="author" maxlength="40" required></div>
    <div><label for="rv-email">${T.email}</label><input type="email" id="rv-email" name="email" maxlength="120"></div>
  </div>
  <label>${T.rate}</label><div class="starpick">${starpick}</div>
  <div class="grid2">
    <div><label for="rv-rec">${T.rec}</label><select id="rv-rec" name="recommend"><option value="">${T.any}</option><option value="1">${T.recYes}</option><option value="0">${T.recNo}</option></select></div>
    <div><label for="rv-dog">${T.dog}</label><select id="rv-dog" name="dog_size"><option value="">${T.any}</option><option value="maly">${T.dS}</option><option value="sredni">${T.dM}</option><option value="duzy">${T.dL}</option></select></div>
  </div>
  <label for="rv-title">${T.title}</label><input type="text" id="rv-title" name="title" maxlength="80">
  <label for="rv-body">${T.body}</label><textarea id="rv-body" name="body" maxlength="1500" required></textarea>
  <label for="rv-photo">${T.photo}</label><input type="file" id="rv-photo" name="photo" accept="image/jpeg,image/png,image/webp"><div class="filehint">${T.fileHint}</div>
  <div class="cf-turnstile" data-sitekey="${cfg.sk}"></div>
  <label class="consent"><input type="checkbox" name="consent" required> ${T.consent}</label>
  <button type="submit" class="rvsubmit">${T.submit}</button>
  <div class="rvmsg" data-rvmsg></div>
</form>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script>
(function(){
  var CFG=${JSON.stringify(cfg)}, T=${JSON.stringify({ countSuf: T.countSuf, recSuf: T.recSuf, empty: T.empty, ok: T.ok, err: T.err, need: T.need, submit: T.submit, sending: T.sending, comNone: T.comNone })};
  var sec=document.currentScript.closest ? document.currentScript : null;
  var root=document.querySelector('[data-rvform]').closest('main')||document;
  var listEl=root.querySelector('[data-rvlist]'), bigEl=root.querySelector('[data-cbig]'), subEl=root.querySelector('[data-csub]');
  var form=root.querySelector('[data-rvform]'), msg=root.querySelector('[data-rvmsg]'), crat=root.querySelector('[data-crating]');
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function stars(n){n=Math.round(n);var o='';for(var i=1;i<=5;i++)o+=i<=n?'<b>★</b>':'★';return o;}
  function fmtDate(s){try{return new Date(s).toLocaleDateString();}catch(e){return '';}}
  function q(o){return Object.keys(o).map(function(k){return k+'='+encodeURIComponent(o[k]);}).join('&');}
  function load(){
    fetch(CFG.api+'/reviews?'+q({market:CFG.market,category:CFG.category,slug:CFG.slug})).then(function(r){return r.json();}).then(function(d){
      var n=d.count||0;
      if(n>0){
        bigEl.innerHTML=(d.avg.toFixed(1))+' <span class="stars">'+stars(d.avg)+'</span>';
        var rec=(d.recommendPct!=null)?(' · '+d.recommendPct+'% '+T.recSuf):'';
        subEl.textContent=n+' '+T.countSuf+rec;
        if(crat){crat.querySelector('.cval').textContent=d.avg.toFixed(1);crat.querySelector('.ccount').textContent='('+n+')';}
      } else { bigEl.textContent='–'; subEl.textContent=T.comNone; }
      if(!d.reviews||!d.reviews.length){listEl.innerHTML='<p class="rvempty">'+T.empty+'</p>';return;}
      listEl.innerHTML=d.reviews.map(function(r){
        var ph=r.hasPhoto?('<div class="rvphoto"><img loading="lazy" src="'+CFG.api+'/photo?id='+encodeURIComponent(r.id)+'" alt="zdjęcie od '+esc(r.author)+'" onclick="window.open(this.src)"></div>'):'';
        var meta=[]; if(r.recommend===1)meta.push('<span class="rec">✓ '+T.recSuf+'</span>'); if(r.recommend===0)meta.push('-');
        if(r.dog_size)meta.push(esc(r.dog_size));
        return '<div class="rvcard"><div class="rvhead"><span class="stars">'+stars(r.rating)+'</span> <span class="who">'+esc(r.author)+'</span><span class="when">'+fmtDate(r.created_at)+'</span></div>'+
          (meta.length?'<div class="rvmeta">'+meta.join('')+'</div>':'')+
          (r.title?'<div class="rvbody"><strong>'+esc(r.title)+'</strong></div>':'')+
          (r.body?'<div class="rvbody">'+esc(r.body)+'</div>':'')+ph+'</div>';
      }).join('');
    }).catch(function(){listEl.innerHTML='<p class="rvempty">'+T.empty+'</p>';});
  }
  function show(cls,txt){msg.className='rvmsg '+cls;msg.textContent=txt;}
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var fd=new FormData(form);
    if(!fd.get('rating')||!(''+fd.get('body')).trim()||!fd.get('consent')){show('err',T.need);return;}
    fd.append('market',CFG.market);fd.append('category',CFG.category);fd.append('slug',CFG.slug);
    var btn=form.querySelector('.rvsubmit');btn.disabled=true;var old=btn.textContent;btn.textContent=T.sending;
    fetch(CFG.api+'/submit',{method:'POST',body:fd}).then(function(r){return r.json().catch(function(){return {ok:r.ok};});}).then(function(d){
      if(d&&d.ok){show('ok',T.ok);form.reset();if(window.turnstile)try{turnstile.reset();}catch(e){}}
      else{show('err',(d&&d.error)||T.err);}
      btn.disabled=false;btn.textContent=old;
    }).catch(function(){show('err',T.err);btn.disabled=false;btn.textContent=old;});
  });
  load();
})();
</script>`;
}

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
${p.flavor ? `<tr><td>${S.flavorRow}</td><td><strong>${p.flavor}</strong></td><td>-</td></tr>` : ''}
<tr><td>${S.protein}</td><td><strong>${p.proteinDM}% DM</strong></td><td>FEDIAF/AAFCO ${S.min} ${p.life === 'dorosły' || p.life === 'adult' ? '18–21' : '22,5–25'}%</td></tr>
<tr><td>${S.fat}</td><td>${p.fatDM}% DM</td><td>${S.min} ${p.life === 'dorosły' || p.life === 'adult' ? '5,5' : '8,5'}%</td></tr>
<tr><td>${S.energy}</td><td>${p.kcal} kcal ME/100 g</td><td>-</td></tr>
${k1000 ? `<tr><td><strong>${S.cost1000}</strong></td><td><strong>~${m.money(k1000)}</strong></td><td>${S.cost1000note}</td></tr>` : ''}
</table>
<p class="meta">${S.dmNote} <a href="${href(url, methodPath)}">${S.howCalc}</a></p>
<div class="protocol">ℹ️ ${S.variantBox}</div>` : `
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
${slots.map(s => `<figure><img src="${href(url, `assets/${mkt}/${cat.slug}/${p.slug}/${s.file}.svg`)}" alt="${p.name} - ${s.label}" loading="lazy" width="800" height="600"><figcaption>${s.label}</figcaption></figure>`).join('\n')}
</div>
<table>
<tr><th>${S.measure}</th><th>${S.value}</th></tr>${rows}
<tr><td>${isFood ? S.bekonRowFood : S.bekonRowOther}</td><td><span class="paws">${bekonIcon.repeat(t.bekon)}${'·'.repeat(3 - t.bekon)}</span> ${t.bekon}/3 - ${t.bekonNote}</td></tr>
</table>
<div class="protocol"><strong>${S.protocolHead}</strong> ${isFood ? S.protocolFood : S.protocolOther} ${S.protocolTail} <a href="${href(url, methodPath) + '#testy'}" style="color:inherit">${S.protocolLink}</a></div>`;
  } else {
    testSection = `<div class="pending">📋 ${S.testPending}</div>`;
  }

  const headInner = `<div class="phead-main">
<div class="eyebrow">${S.review} · ${cName(cat, mkt)} · ${p.type}</div>
<h1>${p.name} - ${S.reviewTitle}</h1>
<p class="meta">${S.rated}: ${pawsTxt(p.score, m.lang)} <strong>${p.score}/100 · ${scoreLbl(p.score, m.lang)}</strong> · ${S.updated}: ${TODAY}${p.verified ? '' : ` · <span class="badge">${S.demo}</span>`}${REVIEWS.enabled ? ` · <a class="crating" data-crating href="#opinie">★ <span class="cval">–</span> <span class="ccount"></span></a>` : ''}</p>
</div>`;
  const body = `
<p class="crumb"><a href="${href(url, mkt + '/')}">DogRanking ${mkt.toUpperCase()}</a> › <a href="${href(url, `${mkt}/${cSlug(cat, mkt)}/`)}">${cName(cat, mkt)}</a> › ${p.name}</p>
${isFood ? `<div class="phead">${pkgThumb(p, 'pkgbig')}${headInner}</div>` : headInner}

<h2>${S.goodChoice(p.name)}</h2>
<div class="answer">${p.verdict}</div>
${dataTable}

<h2>${S.pillarsH}</h2>
<table>
<tr><th>${S.pillar}</th><th>${S.result}</th><th>${S.max}</th></tr>
${p.pillars.map((v, i) => `<tr><td>${labels[i]}</td><td><strong>${v}</strong></td><td>${maxes[i]}</td></tr>`).join('\n')}
</table>

<div class="card"><strong>${S.pros}</strong><ul class="pc good">${p.pros.map(x => `<li>${x}</li>`).join('')}</ul>
<strong>${S.cons}</strong><ul class="pc bad">${p.cons.map(x => `<li>${x}</li>`).join('')}</ul></div>
${testSection}
${REVIEWS.enabled ? reviewsSection(p, cat, mkt) : ''}
<h2>${S.faqH}</h2>
${p.faq.map(x => `<h3>${x.q}</h3><p>${x.a}</p>`).join('')}
${relatedKnowledge(p, cat, mkt, url)}
<h2>${S.buyH}</h2>
<p class="shops">${p.shops.map(s => `<a href="${s.u}" rel="sponsored nofollow" target="_blank">${s.n} →</a>`).join('')}</p>
<p class="disclosure">${S.disclosure}</p>`;

  return { url, html: page({ title: `${p.name} - ${S.reviewTitle} (${TODAY.slice(0, 4)}) | DogRanking`, desc: p.verdict.slice(0, 155), canonical: url, body, jsonld, mkt }) };
}

/* ---------- ranking rows ---------- */
function rankRows(products, cat, mkt, fromUrl) {
  const m = MARKETS[mkt]; const S = STR[m.lang];
  const sorted = [...products].sort((a, b) => b.score - a.score);
  const isFood = cat.slug === 'karmy';
  return sorted.map((p, i) => `<a class="rankrow${isFood ? ' food' : ''}" href="${href(fromUrl, `${mkt}/${cSlug(cat, mkt)}/${p.slug}/`)}">
  <span class="num">${String(i + 1).padStart(2, '0')}</span>
  ${isFood ? `<span class="pkgcell">${pkgThumb(p)}</span>` : ''}
  <span><strong>${p.name}</strong><br><span class="meta">${p.type}${p.proteinDM ? ` · ${S.protein.toLowerCase()} ${p.proteinDM}% DM` : ''}${per1000(p) ? ` · ~${m.money(per1000(p))} / 1000 kcal` : ''} · ${p.test ? S.testedByUs : S.labelBased}</span></span>
  <span>${pawsTxt(p.score, m.lang)}</span>
  <span class="gobtn">${p.test ? S.seeReview : S.seeReviewLabel}</span>
</a>`).join('');
}

/* ---------- zdjęcia produktów (własne/licencjonowane) → static/produkty/<slug>.webp ---------- */
const PROD_IMG_DIR = path.join(__dirname, 'static', 'produkty');
function prodVariant(slug, v) { // v: '1' jasne, '2' bordo
  if (!fs.existsSync(PROD_IMG_DIR)) return '';
  for (const ext of ['webp', 'jpg', 'jpeg', 'png']) {
    if (fs.existsSync(path.join(PROD_IMG_DIR, slug + '-' + v + '.' + ext))) return 'produkty/' + slug + '-' + v + '.' + ext;
  }
  return '';
}
function prodVariants(slug) {
  let a = prodVariant(slug, '1'), b = prodVariant(slug, '2');
  if (!a && !b) { // fallback: pojedyncze <slug>.<ext>
    for (const ext of ['webp', 'jpg', 'jpeg', 'png']) {
      if (fs.existsSync(path.join(PROD_IMG_DIR, slug + '.' + ext))) { a = 'produkty/' + slug + '.' + ext; break; }
    }
  }
  return { i1: a, i2: b };
}
// naprzemiennie: parzysta pozycja → jasne (1), nieparzysta → bordo (2); fallback na dostępne
function pickProdImg(slug, i) {
  const { i1, i2 } = prodVariants(slug);
  return (i % 2 === 0) ? (i1 || i2) : (i2 || i1);
}
const PILL_LBL = { pl: ['Skład', 'Normy', 'Producent', 'Dodatki'], en: ['Composition', 'Standards', 'Maker', 'Extras'] };
const PILL_MAX = [35, 25, 25, 15];

/* ---------- ranking: kafelki (styl nomad list) ---------- */
function rankCards(products, cat, mkt, fromUrl) {
  const m = MARKETS[mkt]; const S = STR[m.lang]; const isFood = cat.slug === 'karmy';
  const sorted = [...products].sort((a, b) => b.score - a.score);
  return sorted.map((p, i) => {
    const link = href(fromUrl, `${mkt}/${cSlug(cat, mkt)}/${p.slug}/`);
    const img = pickProdImg(p.slug, i); const imgUrl = img ? href(fromUrl, img) : '';
    const imgAttr = imgUrl ? ` class="rc-img has-photo" style="background-image:url('${imgUrl}')"` : ' class="rc-img"';
    const fallback = imgUrl ? '' : pkgThumb(p, 'pkg');
    const stats = [`<span>${p.type}</span>`];
    if (p.proteinDM) stats.push(`<span><b>${p.proteinDM}%</b> ${S.protein.toLowerCase()} DM</span>`);
    if (per1000(p)) stats.push(`<span><b>~${m.money(per1000(p))}</b> / 1000 kcal</span>`);
    const pVals = (p.pillars || []).map((v, k) => Math.round(v / PILL_MAX[k] * 100));
    const paAvg = pVals.length ? Math.round(pVals.reduce((a, b) => a + b, 0) / pVals.length) : 0;
    const pills = (p.pillars || []).map((v, k) => `<div class="rc-bar"><span class="t">${PILL_LBL[m.lang][k]}</span><span class="track"><i style="width:${pVals[k]}%"></i></span><span class="v">${v}</span></div>`).join('');
    const peopleLbl = m.lang === 'pl' ? 'Ocena ludzi' : "People's";
    const peopleNote = m.lang === 'pl' ? 'wg pozostałych kryteriów' : 'from other criteria';
    const peopleBar = `<div class="rc-bar rc-people" data-pa="${paAvg}"><span class="t">${peopleLbl}</span><span class="track"><i style="width:${paAvg}%"></i></span><span class="v">–</span></div><div class="rc-pnote">${peopleNote}</div>`;
    return `<a class="rcard${isFood ? ' food' : ''}" href="${link}" data-slug="${p.slug}">
  <div${imgAttr}><span class="rc-rank">${String(i + 1).padStart(2, '0')}</span><span class="rc-badge">${p.test ? S.testedByUs : S.labelBased}</span>${fallback}
    <div class="rc-hover"><div class="h">${S.pillarsH}</div>${pills}${peopleBar}</div>
  </div>
  <div class="rc-body"><div class="rc-name">${p.name}</div><div class="rc-paws">${pawsTxt(p.score, m.lang)}</div><div class="rc-stats">${stats.join('')}</div><div class="rc-go">${p.test ? S.seeReview : S.seeReviewLabel} →</div></div>
</a>`;
  }).join('');
}

/* ---------- powiązane artykuły z Wiedzy (tylko PL, karmy) ---------- */
function relatedKnowledge(p, cat, mkt, url) {
  if (mkt !== 'pl' || cat.slug !== 'karmy') return '';
  const txt = (p.verdict + ' ' + (p.cons || []).join(' ') + ' ' + (p.pros || []).join(' ') + ' ' + (p.flavor || '')).toLowerCase();
  const ids = [];
  if (/strączkow|grain|groch/i.test(txt)) ids.push('dcm');
  if (/epa|dha|staw/i.test(txt)) ids.push('stawy');
  if (/surow|barf/i.test(txt + p.type)) ids.push('barf');
  if (/senior/i.test(txt)) ids.push('senior');
  ids.push('etykieta', 'bialko'); // zawsze przydatne
  const seen = {}, picks = [];
  for (const id of ids) { if (seen[id]) continue; seen[id] = 1; const a = ARTS.find(x => x.id === id); if (a) picks.push(a); if (picks.length === 3) break; }
  if (!picks.length) return '';
  return `
<h2>Z naszej Wiedzy</h2>
<div class="catgrid">
${picks.map(a => `<a class="catcard" href="${href(url, `pl/wiedza/${a.id}/`)}"><span class="meta">${a.cat} · ${a.mins} min · ${gradeBadge(a.grade)}</span><h3>${a.title}</h3><p>${a.teaser}</p></a>`).join('\n')}
</div>`;
}

/* ---------- atrybuty do dopasowania (wyliczane z pól rekordu) ---------- */
function matchAttrs(p) {
  const txt = (p.name + ' ' + (p.flavor || '') + ' ' + (p.verdict || '') + ' ' + (p.pros || []).join(' ') + ' ' + (p.cons || []).join(' ')).toLowerCase();
  // KURCZAK (konkretnie) vs DRÓB (dowolny: indyk, kaczka, gęś...) - dwa różne alergeny
  const noChicken = /bez kurczaka|chicken-free|no chicken/.test(txt);
  const noPoultry = /bez drobiu|poultry-free/.test(txt);
  const chicken = !noChicken && /(kurcz|chicken)/.test(txt);
  const poultry = !noPoultry && /(kurcz|chicken|dr[oó]b|poultry|indyk|turkey|kacz|duck|g[eę]ś|goose)/.test(txt);
  const legumesHigh = (p.cons || []).some(x => /strączkow|legume/i.test(x));
  const grainFree = /bez zbóż|grain-free|bezzboż/.test(txt);
  const epaDha = (p.pros || []).some(x => /epa|dha/i.test(x));
  const life = /wszystkie etapy|all life stages/i.test(p.life || '') ? 'all' : (/szczen|puppy/i.test(p.life || '') ? 'puppy' : 'adult');
  return { s: p.slug, n: p.name, fl: p.flavor || '', t: p.type, sc: p.score, pd: p.proteinDM, fd: p.fatDM, pr: per1000(p) || 0, test: p.test ? 1 : 0, ch: chicken ? 1 : 0, po: poultry ? 1 : 0, lg: legumesHigh ? 1 : 0, ed: epaDha ? 1 : 0, life, th: pkgThumb(p, 'pkg'), pl: p.pillars || [] };
}
function foodMatchPanel(products, cat, mkt) {
  const m = MARKETS[mkt]; const S = STR[m.lang]; const P = S.prof;
  const url = `/${mkt}/${cSlug(cat, mkt)}/`;
  const data = products.map(p => { const a = matchAttrs(p); const v = prodVariants(p.slug); a.i1 = v.i1 ? href(url, v.i1) : ''; a.i2 = v.i2 ? href(url, v.i2) : ''; return a; });
  const sel = (id, opts) => `<div class="pf-g"><label>${P[id]}</label><select id="pf-${id}">${opts.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select></div>`;
  const jsTexts = JSON.stringify({ matchLbl: P.matchLbl, blocked: P.blocked, money: mkt === 'pl' ? 'zł' : (mkt === 'uk' ? '£' : '$'), prot: S.protein.toLowerCase(), tested: S.testedByUs, label: S.labelBased, see: S.seeReview, seeL: S.seeReviewLabel, pill: PILL_LBL[m.lang], pmax: PILL_MAX, pillarsH: S.pillarsH, people: m.lang === 'pl' ? 'Ocena ludzi' : "People's", pnote: m.lang === 'pl' ? 'wg pozostałych kryteriów' : 'from other criteria', wAllergy: P.wAllergy, wAllergyP: P.wAllergyP, wPanc: P.wPanc, wPup: P.wPup, wKidney: P.wKidney, wLegume: P.wLegume });
  // funkcja rysująca łapki w JS (te same kształty co serwerowe)
  return `
<div class="profile">
  <h3>${P.h}</h3>
  <p class="meta" style="margin:0 0 12px">${P.sub}</p>
  <div class="pf-row">${sel('form', P.formOpts)}${sel('age', P.ageOpts)}${sel('size', P.sizeOpts)}${sel('health', P.healthOpts)}</div>
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
    if(!b&&P.health==='alergia_kurczak'&&f.ch) b=T.wAllergy;
    if(!b&&P.health==='alergia_drob'&&f.po) b=T.wAllergyP;
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
    var pool = (P.form&&P.form!=='all') ? FOODS.filter(function(f){return f.t===P.form;}) : FOODS;
    var list=pool.map(function(f){return {f:f,m:calc(f,P)};});
    list.sort(function(a,b){if(!!a.m.b!==!!b.m.b)return a.m.b?1:-1; if(a.m.b)return b.f.sc-a.f.sc; return (b.m.pct-a.m.pct)||(b.f.sc-a.f.sc);});
    var html=list.map(function(it,i){var f=it.f,mm=it.m;
      var stats='<span>'+f.t+'</span>'+(f.pd?'<span><b>'+f.pd+'%</b> '+T.prot+' DM</span>':'')+(f.pr?'<span><b>~'+f.pr+'</b> '+T.money+' / 1000 kcal</span>':'');
      var pv=(f.pl||[]).map(function(v,k){return Math.round(v/T.pmax[k]*100);});
      var paAvg=pv.length?Math.round(pv.reduce(function(a,b){return a+b;},0)/pv.length):0;
      var pills=(f.pl||[]).map(function(v,k){return '<div class="rc-bar"><span class="t">'+T.pill[k]+'</span><span class="track"><i style="width:'+pv[k]+'%"></i></span><span class="v">'+v+'</span></div>';}).join('');
      var people='<div class="rc-bar rc-people" data-pa="'+paAvg+'"><span class="t">'+T.people+'</span><span class="track"><i style="width:'+paAvg+'%"></i></span><span class="v">–</span></div><div class="rc-pnote">'+T.pnote+'</div>';
      var match = mm.b
        ? '<div class="rc-match bad"><b>✕ '+T.blocked+'</b></div>'
        : '<div class="rc-match"><b>'+T.matchLbl+': '+mm.pct+'%</b><div class="mbar"><i style="width:'+mm.pct+'%"></i></div></div>';
      var warn=(mm.b?[mm.b]:mm.w).map(function(x){return '<div class="rc-warn">⚠ '+x+'</div>';}).join('');
      var im=(i%2===0)?(f.i1||f.i2):(f.i2||f.i1);
      var imgDiv=im?'<div class="rc-img has-photo" style="background-image:url(\''+im+'\')">':'<div class="rc-img">';
      var fb=im?'':f.th;
      return '<a class="rcard food'+(mm.b?' blocked':'')+'" href="'+f.s+'/" data-slug="'+f.s+'">'
        +imgDiv+'<span class="rc-rank">'+String(i+1).padStart(2,'0')+'</span><span class="rc-badge">'+(f.test?T.tested:T.label)+'</span>'+fb
        +'<div class="rc-hover"><div class="h">'+T.pillarsH+'</div>'+pills+people+match+warn+'</div></div>'
        +'<div class="rc-body"><div class="rc-name">'+f.n+'</div><div class="rc-paws">'+paws(f.sc)+'</div><div class="rc-stats">'+stats+'</div><div class="rc-go">'+(f.test?T.see:T.seeL)+' →</div></div></a>';
    }).join('');
    document.getElementById('ranklist').innerHTML=html;
    if(window.__applyPeople)window.__applyPeople();
    document.getElementById('pf-legend').style.display='block';
    document.getElementById('pf-reset').style.display='inline-block';
  }
  function readP(){return {form:document.getElementById('pf-form').value,age:document.getElementById('pf-age').value,size:document.getElementById('pf-size').value,health:document.getElementById('pf-health').value};}
  ['pf-form','pf-age','pf-size','pf-health'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('change',function(){
    var p=readP();render(p);try{localStorage.setItem('dr_dog',JSON.stringify(p));}catch(e){}
  });});
  var rst=document.getElementById('pf-reset');if(rst)rst.addEventListener('click',function(){
    document.getElementById('pf-form').value='all';document.getElementById('pf-age').value='dorosly';document.getElementById('pf-size').value='sredni';document.getElementById('pf-health').value='ok';
    try{localStorage.removeItem('dr_dog');}catch(e){} location.reload();
  });
  try{var saved=JSON.parse(localStorage.getItem('dr_dog')||'null');if(saved){if(saved.form)document.getElementById('pf-form').value=saved.form;document.getElementById('pf-age').value=saved.age;document.getElementById('pf-size').value=saved.size;document.getElementById('pf-health').value=saved.health;render(saved);}}catch(e){}
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
    '@context': 'https://schema.org', '@type': 'ItemList', name: `${cName(cat, mkt)} - DogRanking ${mkt.toUpperCase()}`,
    itemListElement: [...products].sort((a, b) => b.score - a.score).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + `/${mkt}/${cSlug(cat, mkt)}/${p.slug}/`, name: p.name }))
  });
  const methodPath = `${mkt}/${m.lang === 'pl' ? 'metodologia' : 'methodology'}/`;

  const peopleJs = `<script>
(function(){
  var MAP={};
  window.__applyPeople=function(){
    document.querySelectorAll('.rcard[data-slug]').forEach(function(card){
      var bar=card.querySelector('.rc-people'); if(!bar)return;
      var fill=bar.querySelector('i'), val=bar.querySelector('.v'), note=card.querySelector('.rc-pnote');
      var pa=+bar.getAttribute('data-pa')||0, d=MAP[card.getAttribute('data-slug')];
      if(d&&d.c>=10){var pct=Math.round(d.m/5*100);fill.style.width=pct+'%';val.textContent=(''+d.m)+'/5';if(note)note.textContent='mediana z '+d.c+' ocen';}
      else{fill.style.width=pa+'%';val.textContent='–';if(note)note.textContent=(d&&d.c)?(d.c+'/10 ocen · wg pozostałych kryteriów'):'wg pozostałych kryteriów';}
    });
  };
  fetch('/api/reviews-summary?market=${mkt}&category=${cat.slug}').then(function(r){return r.json();}).then(function(d){MAP=d||{};window.__applyPeople();}).catch(function(){});
  window.__applyPeople();
})();
</script>`;
  let content = '';
  if (cat.slug === 'karmy' && products.length) {
    content = `
<h2 id="ranking">${S.rankingH}</h2>
<p class="meta">${S.updated}: ${TODAY} · ${S.metaRank(products.length)}</p>
${foodMatchPanel(products, cat, mkt)}
<div id="ranklist" class="rgrid">${rankCards(products, cat, mkt, url)}</div>
${peopleJs}
<h2>${S.formsH}</h2>
<div class="answer">${S.formsTxt}</div>
<table><tr><th>${S.formCol}</th><th>${S.formNoteCol}</th></tr>${FOOD_FORMS[m.lang].map(f => `<tr><td><strong>${f[0]}</strong></td><td>${f[1]}</td></tr>`).join('')}</table>
<a class="catcard" style="margin-top:8px" href="${href(url, `${mkt}/${S.calc.slug}/`)}"><span class="ic">🧮</span><h3>${S.calc.cardTitle}</h3><p>${S.calc.lead}</p><span style="color:var(--terra);font-weight:600;font-family:-apple-system,sans-serif">${S.calc.cardCta}</span></a>`;
  } else if (products.length) {
    content = `
<h2 id="ranking">${S.betaH}</h2>
<p class="meta">${S.updated}: ${TODAY}</p>
<div class="rgrid">${rankCards(products, cat, mkt, url)}</div>
${peopleJs}`;
  } else if (cat.status === 'edu' && cat.slug === 'zdrowie') {
    content = m.lang === 'pl' ? `
<div class="legalbox"><strong>Dlaczego nie rankingujemy leków?</strong> Tabletki przeciwkleszczowe (Bravecto, NexGard, Simparica) to w Polsce leki na receptę, a reklama publiczna leków Rp. jest zakazana (Prawo farmaceutyczne, rozp. UE 2019/6). W tej strefie znajdziesz wyłącznie materiały edukacyjne o substancjach czynnych - bez ocen, bez łapek i bez linków zakupowych do leków. Decyzję zawsze podejmuj z lekarzem weterynarii.</div>
<h2>Przewodnik po substancjach czynnych (w przygotowaniu)</h2>
<table>
<tr><th>Substancja</th><th>Forma</th><th>Dostępność w PL</th><th>Co warto wiedzieć</th></tr>
<tr><td>Fipronil</td><td>krople spot-on</td><td>bez recepty</td><td>działa kontaktowo; najdłużej na rynku</td></tr>
<tr><td>Imidaklopryd + permetryna</td><td>krople spot-on</td><td>bez recepty</td><td>permetryna silnie toksyczna dla kotów w domu!</td></tr>
<tr><td>Imidaklopryd + flumetryna</td><td>obroża</td><td>bez recepty</td><td>działanie do 8 mies.; dobierz rozmiar</td></tr>
<tr><td>Izoksazoliny (fluralaner, afoksolaner, sarolaner)</td><td>tabletki</td><td><strong>na receptę</strong></td><td>FDA ostrzega o możliwych objawach neurologicznych - omów z lekarzem, zwłaszcza przy padaczce</td></tr>
</table>
<p class="meta">Treść edukacyjna konsultowana z lekarzem weterynarii (w przygotowaniu). Nie zastępuje wizyty w gabinecie.</p>` : `
<div class="legalbox"><strong>Why we don't rank medicines.</strong> Oral tick & flea products (isoxazolines: Bravecto, NexGard, Simparica) are prescription medicines (POM-V in the UK; Rx via FDA in the US), and advertising prescription veterinary medicines to the public is restricted. This zone is educational only - active-substance guides, no ratings, no shopping links for medicines. Always decide with your veterinarian.</div>
<h2>Active-substance guide (in preparation)</h2>
<table>
<tr><th>Substance</th><th>Form</th><th>Availability</th><th>Worth knowing</th></tr>
<tr><td>Fipronil</td><td>spot-on</td><td>OTC</td><td>contact action; longest market record</td></tr>
<tr><td>Imidacloprid + flumethrin</td><td>collar</td><td>OTC / NFA-VPS (UK)</td><td>up to 8 months; size matters; see EPA incident discussions (Seresto)</td></tr>
<tr><td>Isoxazolines (fluralaner, afoxolaner, sarolaner)</td><td>chewable tablets</td><td><strong>prescription</strong></td><td>FDA fact sheet: potential neurologic adverse events (seizures) - discuss with your vet, especially with epilepsy history</td></tr>
</table>
<p class="meta">Educational content, veterinary review in progress. Not a substitute for a vet visit.</p>`;
  } else if (cat.status === 'edu') {
    content = m.lang === 'pl' ? `
<h2>Ubezpieczenia dla psów - najpierw edukacyjnie</h2>
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
<h2>Pet insurance - rankings coming to this market first</h2>
<div class="answer">${mkt === 'uk' ? 'Around 25% of UK dogs are insured - the most mature pet-insurance market in the world (Petplan, ManyPets, Animal Friends, Agria).' : 'The US market (Lemonade, Healthy Paws, Trupanion, Embrace) is growing fast.'} Before we compare offers, learn to read a policy.</div>
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

  return { url, html: page({ title: `${cName(cat, mkt)} - DogRanking ${MARKETS[mkt].name}`, desc: cDesc(cat, mkt).slice(0, 155), canonical: url, body, jsonld, mkt, alts, bodyClass: 'rank-dark' }) };
}

/* ---------- strona główna rynku ---------- */
// łapki (statyczne, samodzielne - dla landing page bez współdzielonego CSS)
function lpPaws(sc) {
  const PAW = f => `<svg width="17" height="17" viewBox="0 0 24 24" style="vertical-align:middle" fill="${f}"><circle cx="5" cy="10.2" r="2.2"/><circle cx="9.4" cy="6.9" r="2.4"/><circle cx="14.6" cy="6.9" r="2.4"/><circle cx="19" cy="10.2" r="2.2"/><path d="M12 11.4c3.1 0 5.7 2.3 5.7 5 0 1.8-1.4 3.2-3.3 3.2-.9 0-1.5-.3-2.4-.3s-1.5.3-2.4.3c-1.9 0-3.3-1.4-3.3-3.2 0-2.7 2.6-5 5.7-5z"/></svg>`;
  const g = Math.max(1, Math.min(5, Math.round(sc / 20)));
  return Array.from({ length: 5 }, (_, i) => PAW(i < g ? '#D9A441' : '#DDCDB2')).join('');
}
const countProd = mk => Object.values(PRODUCTS[mk] || {}).reduce((a, v) => a + v.length, 0);

function homeMkt(mkt) {
  const m = MARKETS[mkt]; const S = STR[m.lang]; const pl = m.lang === 'pl';
  const url = `/${mkt}/`;
  const H = t => href(url, t);
  const A = t => href(url, t); // asset / page (oba z roota)
  const foods = (PRODUCTS[mkt] || {}).karmy || [];
  const top = [...foods].sort((a, b) => b.score - a.score).slice(0, 5);
  const methodSlug = pl ? 'metodologia' : 'methodology';
  const karmyUrl = H(`${mkt}/${cSlug(CATS[0], mkt)}/`);
  const bekonUrl = H(`${mkt}/bekon/`);
  const wiedzaUrl = pl ? H('pl/wiedza/') : H(`${mkt}/${methodSlug}/`);
  const ig = SOCIAL_LINKS.instagram, tt = SOCIAL_LINKS.tiktok;
  const n = foods.length;

  const L = pl ? {
    nav: ['Karmy', 'Jak oceniamy', 'Wiedza', 'Bekon', 'Kraje'],
    heroKick: 'cześć, tu Bekon 🐾',
    heroH1: 'Najlepsza miska zaczyna się od <em>uczciwej oceny.</em>',
    heroSub: 'Niezależny ranking karm i produktów dla psów - w suchej masie, wg norm FEDIAF i kryteriów WSAVA. Bez ściemy. Bez płatnych miejsc na podium.',
    ctaSee: 'Zobacz ranking →', ctaHow: 'Jak oceniamy',
    trust: [`<b>${n}</b> karm ocenionych`, '<b>3</b> rynki · PL · UK · US', '<b>0</b> płatnych pozycji'],
    scroll: 'przewiń ↓',
    mKick: 'to nie tylko jedzenie',
    mH2: 'Twój pies to rodzina. Jego miska <span class="u">zasługuje na to samo serce.</span>',
    mP: 'Producentów są setki, etykiety mówią półprawdy, a „rankingi" w sieci to często płatne listy. My liczymy skład w suchej masie, sprawdzamy normy i wiarygodność marki - i mówimy wprost, co jest warte miski Twojego psa.',
    pKick: 'cztery filary', pH2: 'Jak powstaje ocena w łapkach',
    pills: [
      ['Skład', '35', 'Białko i tłuszcz w suchej masie, nazwane mięso, bez zbędnych wypełniaczy.'],
      ['Normy i testy', '25', 'Zgodność z FEDIAF/AAFCO oraz realne próby żywieniowe, nie tylko deklaracje.'],
      ['Producent', '25', 'Wiarygodność marki wg kryteriów WSAVA - kto i jak naprawdę robi tę karmę.'],
      ['Dodatki', '15', 'EPA/DHA, jakość konserwacji, brak sztucznych barwników i zbędnej chemii.']
    ],
    prKick: 'jak to robimy', prH2: 'Dziesięć prób, zanim coś trafi do rankingu',
    prLead: 'Od testu karmy i zabawek, przez rozpakowanie i pielęgnację, aż po komfort i finalną rekomendację - każdy produkt przechodzi przez łapy (i podniebienie) Bekona.',
    rKick: `ranking · ${m.name}`, rH2: 'Top karmy na polskim rynku',
    rFull: `Zobacz pełny ranking ${n} karm →`,
    cKick: 'wybierz swój kraj', cH2: 'Pokazujemy tylko to, co kupisz u siebie',
    cP: 'Produkty, ceny i sklepy różnią się między krajami - pokazujemy ranking dla Twojego rynku.',
    igKick: 'życie Bekona', igH2: 'Bekon testuje. Ty obserwujesz.',
    igP: 'Codzienne życie, próby miski i szczere recenzje produktów - wszystko na jego profilach. Dołącz do psiej ekipy i bądź na bieżąco.',
    follow: 'Obserwuj mnie',
    nKick: 'co tydzień, prosto do miski', nH2: 'Nowe oceny karm - zanim trafią do sklepu',
    nP: 'Bez spamu. Tylko świeże rankingi, ostrzeżenia o składach i okazje cenowe.',
    nPlace: 'Twój e-mail', nBtn: 'Zapisz się 🐾',
    fDesc: 'Niezależne oceny karm i produktów dla psów. Liczymy uczciwie, w suchej masie - dla psów i ich ludzi.',
    fCol: ['Karmy', 'Portal', 'Rynki'],
    fKarmy: [['Ranking', karmyUrl], ['Kalkulator', H(`${mkt}/${S.calc.slug}/`)]],
    fPortal: [['Jak oceniamy', H(`${mkt}/${methodSlug}/`)], ['Wiedza', wiedzaUrl], ['O nas', H(`${mkt}/o-nas/`)], ['Bekon', bekonUrl]],
    legal: '© 2026 DogRanking · zrobione z 🐾 dla psów i ich ludzi'
  } : {
    nav: ['Dog food', 'How we rate', 'Knowledge', 'Bekon', 'Countries'],
    heroKick: "hi, it's Bekon 🐾",
    heroH1: 'A better bowl starts with an <em>honest review.</em>',
    heroSub: `Independent dog food and product rankings - on a dry-matter basis, against ${mkt === 'us' ? 'AAFCO' : 'FEDIAF'} thresholds and WSAVA criteria. No fluff. No paid podium spots.`,
    ctaSee: 'See the ranking →', ctaHow: 'How we rate',
    trust: [`<b>${n}</b> foods rated`, '<b>3</b> markets · PL · UK · US', '<b>0</b> paid placements'],
    scroll: 'scroll ↓',
    mKick: 'more than just food',
    mH2: 'Your dog is family. Their bowl <span class="u">deserves the same heart.</span>',
    mP: 'There are hundreds of makers, labels tell half-truths, and online "rankings" are often paid lists. We calculate composition on a dry-matter basis, check standards and brand credibility - and say plainly what is worth your dog\'s bowl.',
    pKick: 'four pillars', pH2: 'How a paw rating is built',
    pills: [
      ['Composition', '35', 'Protein and fat on a dry-matter basis, named meat, no needless fillers.'],
      ['Standards & trials', '25', `Compliance with ${mkt === 'us' ? 'AAFCO' : 'FEDIAF'} plus real feeding trials, not just label claims.`],
      ['Manufacturer', '25', 'Brand credibility against WSAVA criteria - who really makes this food, and how.'],
      ['Extras', '15', 'EPA/DHA, preservation quality, no artificial colours or needless chemistry.']
    ],
    prKick: 'how we do it', prH2: 'Ten trials before anything makes the ranking',
    prLead: 'From food and toy tests, through unboxing and grooming, to comfort and the final recommendation - every product passes through Bekon\'s paws (and palate).',
    rKick: `ranking · ${m.name}`, rH2: `Top dog foods in ${m.name}`,
    rFull: `See the full ranking of ${n} foods →`,
    cKick: 'choose your country', cH2: 'We show only what you can buy at home',
    cP: 'Products, prices and shops differ between countries - we show the ranking for your market.',
    igKick: "Bekon's life", igH2: 'Bekon tests. You watch.',
    igP: 'Everyday life, bowl trials and honest product reviews - all on his profiles. Join the dog crew and stay in the loop.',
    follow: 'Follow me',
    nKick: 'weekly, straight to the bowl', nH2: 'New food ratings - before they hit the shelf',
    nP: 'No spam. Just fresh rankings, ingredient warnings and price deals.',
    nPlace: 'Your email', nBtn: 'Sign up 🐾',
    fDesc: 'Independent ratings of dog food and products. We count honestly, on a dry-matter basis - for dogs and their people.',
    fCol: ['Dog food', 'Portal', 'Markets'],
    fKarmy: [['Ranking', karmyUrl], ['Calculator', H(`${mkt}/${S.calc.slug}/`)]],
    fPortal: [['How we rate', H(`${mkt}/${methodSlug}/`)], ['Knowledge', wiedzaUrl], ['About', H(`${mkt}/about/`)], ['Bekon', bekonUrl]],
    legal: '© 2026 DogRanking · made with 🐾 for dogs and their people'
  };

  const PILL_IC = [
    `<svg class="ic" width="34" height="34" viewBox="0 0 32 32" fill="none" stroke="#C75B38" stroke-width="2" stroke-linecap="round"><path d="M9 6h14l-2 20H11z"/><path d="M9 12h14"/></svg>`,
    `<svg class="ic" width="34" height="34" viewBox="0 0 32 32" fill="none" stroke="#C75B38" stroke-width="2" stroke-linecap="round"><path d="M6 16l6 6 14-14"/></svg>`,
    `<svg class="ic" width="34" height="34" viewBox="0 0 32 32" fill="none" stroke="#C75B38" stroke-width="2" stroke-linecap="round"><path d="M16 4l3 7 8 .6-6 5 2 8-7-4-7 4 2-8-6-5 8-.6z"/></svg>`,
    `<svg class="ic" width="34" height="34" viewBox="0 0 32 32" fill="none" stroke="#C75B38" stroke-width="2" stroke-linecap="round"><path d="M16 27s-11-7-11-15a6 6 0 0111-3 6 6 0 0111 3c0 8-11 15-11 15z"/></svg>`
  ];
  const PROC = [
    ['test-karmy', pl ? 'Test karmy' : 'Food test'],
    ['test-zabawek', pl ? 'Test zabawek' : 'Toy test'],
    ['ranking', 'Ranking'],
    ['rozpakowanie', pl ? 'Rozpakowanie' : 'Unboxing'],
    ['rekomendacja', pl ? 'Rekomendacja' : 'Recommendation'],
    ['dog-approved', 'Dog approved'],
    ['smaczki', pl ? 'Smaczki' : 'Treats'],
    ['podroze', pl ? 'Podróże' : 'Travel'],
    ['pielegnacja', pl ? 'Pielęgnacja' : 'Grooming'],
    ['test-komfortu', pl ? 'Test komfortu' : 'Comfort test']
  ];
  const COUNTRIES = ['pl', 'uk', 'us'].map(k => {
    const mm = MARKETS[k]; const c = countProd(k);
    const lbl = k === 'pl' ? (pl ? `${c} produkty` : `${c} products`) : `${c} products`;
    const go = k === 'pl' && pl ? 'Wejdź →' : 'Enter →';
    return `<a class="ccard" href="${H(`${k}/`)}"><span class="fl">${mm.flag}</span><b>${mm.name}</b><span class="n">${lbl}</span><span class="go">${go}</span></a>`;
  }).join('');
  const SOON = [['🇫🇷', 'France', pl ? 'Wkrótce' : 'Soon'], ['🇩🇪', 'Deutschland', pl ? 'Wkrótce' : 'Bald']]
    .map(([fl, nm, t]) => `<a class="ccard soon" href="#"><span class="fl">${fl}</span><b>${nm}</b><span class="n">${t}</span></a>`).join('');

  const rows = top.map((p, i) => `<a class="rrow" href="${H(`${mkt}/${cSlug(CATS[0], mkt)}/${p.slug}/`)}">
    <span class="rno">${String(i + 1).padStart(2, '0')}</span>
    <span>${pkgThumb(p, 'bag')}</span>
    <span><span class="nm">${p.name}</span><br><span class="mt">${p.type}${p.proteinDM ? ` · ${S.protein.toLowerCase()} ${p.proteinDM}% DM` : ''}${per1000(p) ? ` · ~${m.money(per1000(p))} / 1000 kcal` : ''}</span></span>
    <span class="paws">${lpPaws(p.score)}</span>
    <span class="sc">${p.score}</span>
  </a>`).join('');

  const navLinks = `<a href="${karmyUrl}">${L.nav[0]}</a><a href="#pillars">${L.nav[1]}</a><a href="${wiedzaUrl}">${L.nav[2]}</a><a href="#countries">${L.nav[4]}</a>`;
  const mktNav = Object.entries(MARKETS).map(([k, v]) => k === mkt ? `<strong>${v.flag}</strong>` : `<a class="flag" href="${H(`${k}/`)}" title="${v.name}">${v.flag}</a>`).join('');

  const alts = { pl: '/pl/', uk: '/uk/', us: '/us/' };
  const titles = {
    pl: 'DogRanking - niezależne oceny produktów dla psów (karmy, akcesoria, tech)',
    uk: 'DogRanking UK - independent dog food & product ratings',
    us: 'DogRanking US - independent dog food & product ratings'
  };
  const descs = {
    pl: 'Karmy, gryzaki, szelki, GPS - jawny 100-punktowy algorytm, prawdziwe testy, oceny w łapkach. Normy FEDIAF, kryteria WSAVA, badania zamiast marketingu.',
    uk: 'Dog food rated on FEDIAF thresholds and WSAVA criteria, accessories on safety research. Transparent 100-point algorithm, paw ratings, UK availability and prices.',
    us: 'Dog food rated on AAFCO thresholds and WSAVA criteria, accessories on safety research. Transparent 100-point algorithm, paw ratings, US availability and prices.'
  };
  const altTags = `
  <link rel="alternate" hreflang="pl-PL" href="${SITE}${alts.pl}">
  <link rel="alternate" hreflang="en-GB" href="${SITE}${alts.uk}">
  <link rel="alternate" hreflang="en-US" href="${SITE}${alts.us}">
  <link rel="alternate" hreflang="x-default" href="${SITE}/">`;

  const html = `<!DOCTYPE html>
<html lang="${m.lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="${A('logo.svg')}">
<title>${titles[mkt]}</title>
<meta name="description" content="${descs[mkt]}">
${STAGING ? '<meta name="robots" content="noindex,nofollow">' : ''}<link rel="canonical" href="${SITE}${url}">${altTags}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>${LP_CSS}</style>
<script type="application/ld+json">${JSON.stringify(ORG)}</script>
</head>
<body>
<nav class="lpnav" id="nav"><a class="logo" href="${A('index.html')}"><img src="${A('logo-dr.webp')}" alt="DogRanking" style="height:42px;display:block"></a>
<div class="links">${navLinks}<span class="mkt">${mktNav}</span></div></nav>

<header class="hero">
<div class="bg" style="background-image:url('${A('hero-bekon.webp')}')"></div><div class="ov"></div>
<div class="wrap"><div class="htext">
  <div class="kick" style="color:var(--gold)">${L.heroKick}</div>
  <h1 class="serif">${L.heroH1}</h1>
  <p class="sub">${L.heroSub}</p>
  <div class="cta"><a class="btn btn-pri" href="#ranking">${L.ctaSee}</a><a class="btn btn-ghost" href="#pillars">${L.ctaHow}</a></div>
</div></div>
<div class="trust">${L.trust.map(t => `<span>${t}</span>`).join('')}</div>
<div class="scrollcue">${L.scroll}</div>
</header>

<section class="sec manifesto center"><div class="wrap rev">
  <div class="kick">${L.mKick}</div>
  <h2 class="serif">${L.mH2}</h2>
  <p>${L.mP}</p>
</div></section>

<section class="sec pillars" id="pillars"><div class="wrap">
  <div class="center rev"><div class="kick eyebrowc">${L.pKick}</div><h2 class="serif" style="font-size:clamp(1.9rem,4vw,3rem)">${L.pH2}</h2></div>
  <div class="pillgrid">
${L.pills.map((p, i) => `    <div class="pill rev"><div class="no">0${i + 1}</div>${PILL_IC[i]}<span class="w">${p[1]}</span><h3 class="serif">${p[0]}</h3><p>${p[2]}</p></div>`).join('\n')}
  </div>
</div></section>

<section class="sec process center" id="proces"><div class="wrap">
  <div class="kick" style="color:var(--gold)">${L.prKick}</div>
  <h2 class="serif">${L.prH2}</h2>
  <p class="lead2">${L.prLead}</p>
  <div class="procgrid">${PROC.map(([f, lbl], i) => `<div class="procitem rev"><img src="${A(`proces/${f}.webp`)}" alt="${lbl}" loading="lazy"><b>${i + 1}. ${lbl}</b></div>`).join('')}</div>
</div></section>

<section class="sec cats center" id="kategorie"><div class="wrap">
  <div class="kick eyebrowc">${pl ? 'co oceniamy' : 'what we rate'}</div>
  <h2 class="serif" style="font-size:clamp(1.9rem,4vw,3rem)">${pl ? 'Nie tylko karmy' : 'Not only dog food'}</h2>
  <div class="lcats">${CATS.map(c => { const prods = (PRODUCTS[mkt] || {})[c.slug] || []; const st = prods.length ? c.status : (c.status === 'edu' ? 'edu' : 'soon'); return `<a class="lcat" href="${A(`${mkt}/${cSlug(c, mkt)}/`)}"><span class="ic">${c.icon}</span><h3>${cName(c, mkt)}</h3><p>${cDesc(c, mkt)}</p><span class="st">${S.badges[st]}</span></a>`; }).join('')}</div>
</div></section>

<section class="sec rank" id="ranking"><div class="wrap">
  <div class="center rev"><div class="kick eyebrowc">${L.rKick}</div><h2 class="serif" style="font-size:clamp(1.9rem,4vw,3rem)">${L.rH2}</h2></div>
  <div style="max-width:860px;margin:30px auto 0">${rows}</div>
  <div class="center" style="margin-top:34px"><a class="btn btn-pri" href="${karmyUrl}">${L.rFull}</a></div>
</div></section>

<section class="sec countries" id="countries"><div class="wrap center">
  <div class="kick" style="color:var(--gold)">${L.cKick}</div>
  <h2 class="serif" style="color:var(--cream);font-size:clamp(1.9rem,4vw,3rem)">${L.cH2}</h2>
  <p style="max-width:48ch;margin:14px auto 0;color:#E7D2C0">${L.cP}</p>
  <div class="crow">${COUNTRIES}${SOON}</div>
</div></section>

<section class="sec iginvite" id="bekon"><div class="ph"><div class="igtext rev">
  <div class="kick">${L.igKick}</div>
  <h2 class="serif">${L.igH2}</h2>
  <p>${L.igP}</p>
  <div class="follow-lbl">${L.follow}</div><div class="sclinks"><a class="scitem" href="${ig}" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><span class="scbtn"><img src="${A('social/ig.webp')}" alt="Instagram"></span><span class="sclbl">Instagram</span></a><a class="scitem" href="${tt}" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><span class="scbtn"><img src="${A('social/tt.webp')}" alt="TikTok"></span><span class="sclbl">TikTok</span></a></div>
</div><img class="igphoto" src="${A('bekon1.webp')}" alt="Bekon" loading="lazy"></div></section>

<section class="sec ctaband center"><div class="wrap rev">
  <div class="kick" style="color:#FBE9C8">${L.nKick}</div>
  <h2 class="serif">${L.nH2}</h2>
  <p>${L.nP}</p>
  <form class="signup" style="display:flex;gap:10px;max-width:440px;margin:0 auto;flex-wrap:wrap;justify-content:center" onsubmit="return false"><input type="email" placeholder="${L.nPlace}" style="flex:1;min-width:200px;padding:15px 20px;border-radius:99px;border:0;font:inherit;font-size:1rem"><button class="btn" style="background:var(--maroon);color:#fff">${L.nBtn}</button></form>
</div></section>

<footer class="lpfoot"><div class="wrap">
  <div class="fg">
    <div><a class="flogo" href="${A('index.html')}"><img src="${A('logo-dr.webp')}" alt="DogRanking" style="height:38px"></a><p style="margin-top:12px;max-width:34ch;font-size:.92rem">${L.fDesc}</p></div>
    <div><h4>${L.fCol[0]}</h4>${L.fKarmy.map(([t, u]) => `<a href="${u}">${t}</a>`).join('')}</div>
    <div><h4>${L.fCol[1]}</h4>${L.fPortal.map(([t, u]) => `<a href="${u}">${t}</a>`).join('')}</div>
    <div><h4>${L.fCol[2]}</h4>${['pl', 'uk', 'us'].map(k => `<a href="${H(`${k}/`)}">${MARKETS[k].flag} ${MARKETS[k].name}</a>`).join('')}</div>
  </div>
  <div class="legal"><span>${L.legal}</span><span><a href="${ig}" target="_blank" rel="noopener noreferrer" style="color:var(--gold);text-decoration:none">Instagram</a> · <a href="${tt}" target="_blank" rel="noopener noreferrer" style="color:var(--gold);text-decoration:none">TikTok</a></span></div>
</div></footer>
<script>
var nav=document.getElementById('nav');addEventListener('scroll',function(){nav.classList.toggle('solid',scrollY>40);},{passive:true});
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)e.target.classList.add('in');});},{threshold:.12});
document.querySelectorAll('.rev').forEach(function(el){io.observe(el);});
</script>
</body></html>`;
  return { url, html };
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
<div class="answer">Maksymalnie 100 punktów w czterech filarach. Szkielet jest wspólny dla wszystkich kategorii, kryteria - dopasowane do każdej z nich. 90+ punktów to ocena Wybitna (5 łapek 🐾), poniżej 30 - Unikaj (1 łapka).</div>
<table>
<tr><th>Filar</th><th>Karmy</th><th>Akcesoria / zabawki</th><th>Tech</th></tr>
<tr><td><strong>A (35)</strong></td><td>Skład i jakość białka (sucha masa vs FEDIAF)</td><td>Materiały i wykonanie</td><td>Parametry mierzalne</td></tr>
<tr><td><strong>B (25)</strong></td><td>Normy: feeding trial > formulacja</td><td>Bezpieczeństwo: certyfikaty (CPS, VOHC), badania</td><td>Deklaracje vs nasze pomiary</td></tr>
<tr><td><strong>C (25)</strong></td><td>Producent wg kryteriów WSAVA</td><td>Transparentność, historia wycofań</td><td>Wsparcie, prywatność danych</td></tr>
<tr><td><strong>D (15)</strong></td><td>Dodatki i przetwarzanie</td><td>Ergonomia i trwałość</td><td>Aplikacja, koszty abonamentu</td></tr>
</table>
<h2>Dlaczego karmy liczymy na suchej masie i w zł za 1000 kcal?</h2>
<div class="answer">Analiza gwarantowana podaje wartości razem z wodą: mokra karma z 8% białka ma w suchej masie 40%. A ceny za kilogram nie da się porównać między formą suchą (375 kcal/100 g) i mokrą (110 kcal/100 g) - dlatego liczymy koszt 1000 kcal.</div>
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
<li><strong>Łapki 🐾 (1–5)</strong> - jakość produktu. Zawsze i wszędzie.</li>
<li><strong>Miski 🥣 (0–3)</strong> - smakowitość rzeczy jadalnych w degustacji Bekona. Nie wpływa na łapki.</li>
<li><strong>Piłki 🎾 (0–3)</strong> - akceptacja rzeczy niejadalnych w teście użytkowym. Nie wpływa na łapki.</li>
</ul>
<p>Diety weterynaryjne oceniamy w osobnej kategorii. Karmy surowe bez dowodu kompletności i kontroli patogenów mają sufit 2 łapek. Recenzje bez sekcji testu są jawnie oznaczone „ocena z etykiety" - test dodaje zdjęcia i pomiary, nigdy nie zmienia punktacji.</p>
<h2 id="testy">Jak testujemy - i dlaczego Bekon nie je wszystkiego</h2>
<div class="answer">Każdy testowany produkt fizycznie kupujemy i dokumentujemy zdjęciami. Karmy: pomiar granuli, zapach, tekstura, a degustacja to kilka granulek jako przysmak - nigdy zmiana diety. Akcesoria: test w codziennym użytkowaniu. Werdykty Bekona nie wpływają na punktację.</div>
<p><strong>Dlaczego tak?</strong> Częsta zmiana karmy może powodować problemy żołądkowo-jelitowe - bezpieczne przejście to 7–10 dni. Nasz pies-tester ma stałą dietę, a karmy testowe poznaje jako pojedyncze smaczki. <strong>Produkty po teście</strong> przekazujemy lokalnemu schronisku.</p>
<h2>Strefa Zdrowie - zasady specjalne</h2>
<div class="legalbox">Leki weterynaryjne na receptę nie podlegają rankingowaniu ani linkowaniu zakupowemu - reklama publiczna leków Rp. jest w Polsce zakazana. Publikujemy wyłącznie materiały edukacyjne, konsultowane z lekarzem weterynarii.</div>` : `
<p class="crumb"><a href="${href(url, mkt + '/')}">DogRanking ${mkt.toUpperCase()}</a> › Methodology</p>
<div class="eyebrow">Methodology</div>
<h1>How a rating is made</h1>
<h2>How many points can a product earn?</h2>
<div class="answer">Up to 100 points across four pillars. The skeleton is shared by all categories; criteria adapt to each. 90+ points means Outstanding (5 paws 🐾), below 30 - Avoid (1 paw).</div>
<table>
<tr><th>Pillar</th><th>Dog food</th><th>Accessories / toys</th><th>Tech</th></tr>
<tr><td><strong>A (35)</strong></td><td>Recipe & protein quality (dry matter vs FEDIAF/AAFCO)</td><td>Materials & build</td><td>Measurable performance</td></tr>
<tr><td><strong>B (25)</strong></td><td>Standards: feeding trial > formulation</td><td>Safety: certificates (CPS, VOHC), research</td><td>Claims vs our measurements</td></tr>
<tr><td><strong>C (25)</strong></td><td>Manufacturer per WSAVA criteria</td><td>Transparency, recall history</td><td>Support, data privacy</td></tr>
<tr><td><strong>D (15)</strong></td><td>Additives & processing</td><td>Ergonomics & durability</td><td>App, subscription costs</td></tr>
</table>
<h2>Why dry matter and cost per 1,000 kcal?</h2>
<div class="answer">Guaranteed analysis includes water: a wet food with 8% protein has 40% on a dry-matter basis. And price per kilo cannot compare dry (375 kcal/100 g) with wet (110 kcal/100 g) - so we cost every food per 1,000 kcal.</div>
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
<li><strong>Paws 🐾 (1–5)</strong> - product quality. Always.</li>
<li><strong>Bowls 🥣 (0–3)</strong> - palatability of edibles in Bekon's tasting. Never affects paws.</li>
<li><strong>Balls 🎾 (0–3)</strong> - acceptance of non-edibles in usage tests. Never affects paws.</li>
</ul>
<p>Veterinary diets are rated in their own category. Raw foods without completeness proof and pathogen control are capped at 2 paws. Reviews without a hands-on section are clearly marked "label-based" - testing adds photos and measurements, it never changes the score.</p>
<h2 id="testy">How we test - and why Bekon doesn't eat everything</h2>
<div class="answer">Every tested product is bought by us and photo-documented. Foods: kibble measurement, smell, texture; tasting means a few kibbles as a treat - never a diet change (a safe transition takes 7–10 days). Bekon's verdicts never affect the 0–100 score. Opened test bags go to a local shelter.</div>
<h2>Health zone - special rules</h2>
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
    ['Doberman', 'Elegancki atleta - potrzebował paliwa zupełnie innego niż kanapowy leniuch.'],
    ['Biały owczarek szwajcarski', 'Wrażliwy żołądek. To przy nim pierwszy raz naprawdę przeczytałem skład karmy - i nie zrozumiałem z niego nic.'],
    ['Dwa mieszańce', 'Przygarnięte przez rodzinę. Psy „z niespodzianką” - bez rodowodu i bez instrukcji obsługi.'],
    ['Bekon · pudel miniaturowy · 2,5 roku', 'Obecny szef. Apetyt godny imienia. Testuje wszystko, o czym tu piszemy.']
  ] : [
    ['American Pit Bull', 'Taught me that the scariest label can hide the softest heart.'],
    ['Dobermann', 'A sleek athlete - he needed completely different fuel than a couch potato.'],
    ['White Swiss Shepherd', 'A sensitive stomach. He made me read a dog food label properly for the first time - and understand none of it.'],
    ['Two rescue mutts', 'Taken in by my family. Dogs with no pedigree and no manual.'],
    ['Bekon · miniature poodle · 2.5 yrs', 'Current boss. An appetite worthy of his name ("Bekon" = Bacon). Taste-tests everything reviewed here.']
  ];
  const body = m.lang === 'pl' ? `
<p class="crumb"><a href="${href(url, 'pl/')}">DogRanking PL</a> › O nas</p>
<div class="eyebrow">O nas</div>
<h1>Sześć psów, <em style="color:var(--terra)">jedna lekcja</em></h1>
<p class="lead" style="font-style:italic">Nazywam się Filip i przez całe życie towarzyszyły mi psy - bardzo różne psy.</p>
<table>${dogs.map(d => `<tr><td><strong>${d[0]}</strong></td><td>${d[1]}</td></tr>`).join('')}</table>
<div class="answer"><strong>Sześć psów, sześć różnych żołądków, sześć różnych potrzeb. I jedna wspólna lekcja: na opakowaniu karmy najważniejsze jest to, co napisano najdrobniejszym drukiem. Ten portal czyta to za Ciebie.</strong></div>
<p>Nie sprzedajemy karmy. Sprawdzamy ją. A Bekon degustuje. Wszystkie oceny powstają wg jawnej <a href="${href(url, 'pl/metodologia/')}">metodologii</a>, a o tym, jak zarabiamy, piszemy wprost na stronie <a href="${href(url, 'pl/zasady/')}">Zasady i finansowanie</a>.</p>
<p class="meta">Konsultacja weterynaryjna treści zdrowotnych: w trakcie nawiązywania współpracy - do tego czasu treści zdrowotne mają charakter wyłącznie edukacyjny.</p>` : `
<p class="crumb"><a href="${href(url, mkt + '/')}">DogRanking ${mkt.toUpperCase()}</a> › About</p>
<div class="eyebrow">About</div>
<h1>Six dogs, <em style="color:var(--terra)">one lesson</em></h1>
<p class="lead" style="font-style:italic">My name is Filip, and dogs have been part of my life for as long as I can remember - very different dogs.</p>
<table>${dogs.map(d => `<tr><td><strong>${d[0]}</strong></td><td>${d[1]}</td></tr>`).join('')}</table>
<div class="answer"><strong>Six dogs, six different stomachs, six different needs. One lesson: the most important thing on a bag of dog food is written in the smallest print. This site reads it for you.</strong></div>
<p>We don't sell dog food. We check it. Bekon does the tasting. Every rating follows our transparent <a href="${href(url, mkt + '/methodology/')}">methodology</a>, and we explain exactly how we earn on the <a href="${href(url, mkt + '/principles/')}">Principles & funding</a> page.</p>
<p class="meta">Hands-on tests are currently performed on the Polish market (where Bekon lives); UK/US reviews are label-based and clearly marked as such until local testing begins.</p>`;
  return { url, html: page({ title: m.lang === 'pl' ? 'O nas - sześć psów, jedna lekcja | DogRanking' : 'About us - six dogs, one lesson | DogRanking', desc: m.lang === 'pl' ? 'Kim jesteśmy i dlaczego czytamy etykiety karm. Historia sześciu psów i pudla Bekona - głównego testera DogRanking.' : 'Who we are and why we read dog food labels. The story of six dogs and Bekon the miniature poodle - DogRanking’s chief taste-tester.', canonical: url, body, jsonld, mkt, alts }) };
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
<div class="answer">DogRanking utrzymuje się z linków afiliacyjnych: gdy kupisz produkt przez link „Gdzie kupić”, sklep płaci nam prowizję - Twoja cena się nie zmienia. Każdy taki link jest oznaczony (rel="sponsored"), a przy każdej liście produktów znajdziesz jawną informację o afiliacji.</div>
<h2>Dlaczego prowizje nie wpływają na oceny?</h2>
<ul class="pc">
<li><strong>Kolejność prac:</strong> punktacja 0–100 powstaje z analizy składu, norm i danych producenta - zanim sprawdzimy, gdzie produkt można kupić i czy sklep ma program partnerski.</li>
<li><strong>Brak płatnych miejsc:</strong> producent nie może kupić pozycji w rankingu, recenzji ani „łapek”. Nie publikujemy treści sponsorowanych w rankingach.</li>
<li><strong>Wiele sklepów:</strong> przy produktach linkujemy do co najmniej dwóch sprzedawców, gdy to możliwe - także tych bez prowizji.</li>
<li><strong>Egzemplarze testowe kupujemy sami</strong> - nie przyjmujemy darmowych produktów od producentów do recenzji punktowanych.</li>
</ul>
<h2>Polityka korekt</h2>
<p>Mylimy się? Popraw nas. Każda merytoryczna korekta jest nanoszona z adnotacją i datą w changelogu strony, której dotyczy. Zgłoszenia: przez formularz kontaktowy (w przygotowaniu) lub profil w social mediach.</p>
<h2>Treści zdrowotne</h2>
<div class="legalbox">Nie rankingujemy leków weterynaryjnych na receptę i nie linkujemy do nich zakupowo (Prawo farmaceutyczne). Treści o zdrowiu mają charakter edukacyjny i nie zastępują porady lekarza weterynarii.</div>
<h2>Skala wiarygodności źródeł A/B/C/D</h2>
<p>Artykuły w zakładce Wiedza oznaczamy siłą dowodów: <span class="grade gA">A</span> mocne (zaślepione RCT/metaanalizy, pomiary kliniczne), <span class="grade gB">B</span> umiarkowane (dobre badania kontrolowane/kohortowe), <span class="grade gC">C</span> słabe/wschodzące (ankiety, przekroje, finansowanie kierunkowe), <span class="grade gD">D</span> niewystarczające/marketingowe. Ankieta właścicieli to maksymalnie C - niezależnie od wielkości próby.</p>` : `
<p class="crumb"><a href="${href(url, mkt + '/')}">DogRanking ${mkt.toUpperCase()}</a> › Principles & funding</p>
<div class="eyebrow">Transparency</div>
<h1>Principles & funding</h1>
<h2>How do we earn?</h2>
<div class="answer">DogRanking is funded by affiliate links: when you buy through a "Where to buy" link, the shop pays us a commission - your price does not change. Every such link is marked (rel="sponsored"), and every product list carries a clear affiliate disclosure.</div>
<h2>Why commissions cannot influence ratings</h2>
<ul class="pc">
<li><strong>Order of work:</strong> the 0–100 score is finalised from recipe analysis, standards and manufacturer data - before we check where a product is sold or whether the shop runs an affiliate programme.</li>
<li><strong>No paid placements:</strong> manufacturers cannot buy a ranking position, a review or paws. We do not publish sponsored content inside rankings.</li>
<li><strong>Multiple sellers:</strong> we link to at least two retailers where possible - including ones that pay us nothing.</li>
<li><strong>We buy test samples ourselves</strong> - we do not accept free products from manufacturers for scored reviews.</li>
</ul>
<h2>Corrections policy</h2>
<p>Got something wrong? Tell us. Every substantive correction is applied with a note and date in the page's changelog.</p>
<h2>Health content</h2>
<div class="legalbox">We never rank prescription veterinary medicines or affiliate-link to them. Health content is educational and does not replace veterinary advice.</div>
<h2>Evidence grades A/B/C/D</h2>
<p>Knowledge articles carry an evidence grade: <span class="grade gA">A</span> strong (blinded RCTs/meta-analyses, clinical measures), <span class="grade gB">B</span> moderate (good controlled/cohort studies), <span class="grade gC">C</span> weak/emerging (surveys, cross-sectional, directional funding), <span class="grade gD">D</span> insufficient/marketing. Owner surveys cap at C - regardless of sample size.</p>`;
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
<p class="lead">Czytamy normy FEDIAF, śledztwa FDA i metaanalizy - i przekładamy je na decyzje przy półce sklepowej. Każdy artykuł kończy się źródłami i ma ocenę siły dowodów.</p>
<div class="card"><strong>Skala wiarygodności:</strong> <span class="grade gA">A</span> mocne dowody (RCT/metaanalizy) · <span class="grade gB">B</span> umiarkowane (badania kontrolowane/kohortowe) · <span class="grade gC">C</span> słabe/wschodzące (ankiety, przekroje) · <span class="grade gD">D</span> marketing bez badań. Tego nie robi żaden inny portal o karmach.</div>
<div class="catgrid">
${ARTS.map(a => artCard(a, url)).join('\n')}
</div>`;
  return { url, html: page({ title: 'Wiedza: badania o karmieniu psów (z oceną dowodów) | DogRanking', desc: 'Normy FEDIAF, śledztwo FDA ws. DCM, metaanalizy omega-3 - przełożone na decyzje przy półce. Każdy artykuł z oceną siły dowodów A/B/C/D.', canonical: url, body, jsonld, mkt: 'pl' }) };
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
<div class="protocol" style="margin-top:24px"><strong>Wykorzystaj to w praktyce:</strong> sprawdź <a href="${href(url, 'pl/karmy/')}" style="color:inherit;font-weight:700">ranking karm dostępnych w Polsce →</a> ${/strączkow|dcm|grain|groch/i.test(a.title + a.teaser) ? 'i odfiltruj receptury ze strączkowymi w panelu „Dopasuj do swojego psa".' : 'i dopasuj karmę do wieku, rozmiaru i zdrowia swojego psa.'} Jak liczymy oceny - zob. <a href="${href(url, 'pl/metodologia/')}" style="color:inherit;font-weight:700">metodologia</a>.</div>
</div>`;
  return { url, html: page({ title: `${a.title} | DogRanking Wiedza`, desc: a.teaser.slice(0, 155), canonical: url, body, jsonld, mkt: 'pl' }) };
}

/* ---------- Bekon: oś czasu życia (wszystkie rynki) ---------- */
/* polska odmiana liczebników: [mianownik l.poj., 2–4, 5+] */
function plForm(n, forms) {
  const a = n % 10, b = n % 100;
  if (n === 1) return forms[0];
  if (a >= 2 && a <= 4 && !(b >= 12 && b <= 14)) return forms[1];
  return forms[2];
}
const BEKON_STR = {
  pl: {
    crumbHome: 'DogRanking PL', crumb: 'Bekon',
    eyebrow: 'Bekon · pudel miniaturowy', h1pre: 'Całe życie Bekona,', h1em: 'chwila po chwili',
    lead: 'Bekon to nie tylko maskotka i główny degustator DogRanking - to ważna część mojego życia. Tu zbieram najważniejsze momenty od pierwszego dnia, ze zdjęciami i historiami.',
    title: 'Bekon - oś czasu życia | DogRanking', desc: 'Historia Bekona, pudla miniaturowego i głównego testera DogRanking - najważniejsze chwile od szczeniaka, ze zdjęciami.',
    avatarAlt: 'Bekon - pudel miniaturowy', videoBadge: 'WIDEO',
    facts: [['🎂', 'ur. 16 grudnia 2023'], ['🐩', 'pudel miniaturowy'], ['🥣', 'szef testów DogRanking']],
    endNote: 'Ciąg dalszy nastąpi - kolejne chwile dopiszę tutaj.'
  },
  en: {
    crumbHome: 'DogRanking', crumb: 'Bekon',
    eyebrow: 'Bekon · miniature poodle', h1pre: "Bekon's whole life,", h1em: 'moment by moment',
    lead: "Bekon is more than the mascot and chief taster of DogRanking - he's an important part of my life. Here I collect the milestones from day one, with photos and stories.",
    title: 'Bekon - life timeline | DogRanking', desc: "The story of Bekon, a miniature poodle and DogRanking's chief tester - milestones from puppyhood, with photos.",
    avatarAlt: 'Bekon - miniature poodle', videoBadge: 'VIDEO',
    facts: [['🎂', 'born 16 Dec 2023'], ['🐩', 'miniature poodle'], ['🥣', "DogRanking's chief taster"]],
    endNote: 'To be continued - more moments will be added right here.'
  }
};
function bekonPage(mkt) {
  const m = MARKETS[mkt]; const S = BEKON_STR[m.lang];
  const url = `/${mkt}/bekon/`;
  const alts = { pl: '/pl/bekon/', uk: '/uk/bekon/', us: '/us/bekon/' };
  const fig = (it, b) => {
    const cap = it.caption ? `<figcaption>${it.caption[m.lang]}</figcaption>` : '';
    if (it.type === 'video') {
      return `<figure class="tlfig tlfig--video"><span class="tlframe"><video class="tlmedia" controls preload="none" playsinline poster="${href(url, it.poster)}"><source src="${href(url, it.src)}" type="video/mp4"></video><span class="tlbadge">▶ ${S.videoBadge}</span></span>${cap}</figure>`;
    }
    return `<figure class="tlfig"><span class="tlframe"><img class="tlmedia" src="${href(url, it.src)}" alt="${(it.caption ? it.caption[m.lang] : b.title[m.lang])}" loading="lazy"></span>${cap}</figure>`;
  };
  let lastYear = null;
  const items = BEKON.map((b, idx) => {
    const list = b.media || [];
    const year = b.date.slice(0, 4);
    const yearSep = year !== lastYear ? `<div class="tlyear">${year}</div>` : '';
    lastYear = year;
    const media = list.length ? `<div class="tlgrid${list.length === 1 ? ' one' : ''}">${list.map(it => fig(it, b)).join('')}</div>` : '';
    const cls = `${idx === 0 ? ' is-first' : ''}${b.id === 'dzis' ? ' is-now' : ''}`;
    return `${yearSep}<div class="tlitem">
  <div class="tldate">${b.displayDate[m.lang]}<span class="tlage">· ${b.age[m.lang]}</span></div>
  <div class="tlcard${cls}"><h3>${b.title[m.lang]}</h3><p>${b.text[m.lang]}</p>${media}</div>
</div>`;
  }).join('\n');
  const films = BEKON.reduce((n, b) => n + (b.media || []).filter(x => x.type === 'video').length, 0);
  const photos = BEKON.reduce((n, b) => n + (b.media || []).filter(x => x.type === 'image').length, 0);
  const moments = BEKON.length;
  const enP = (n, s) => n === 1 ? s : s + 's';
  const stat = m.lang === 'pl'
    ? [[moments, plForm(moments, ['chwila', 'chwile', 'chwil'])], [films, plForm(films, ['film', 'filmy', 'filmów'])], [photos, plForm(photos, ['zdjęcie', 'zdjęcia', 'zdjęć'])]]
    : [[moments, enP(moments, 'moment')], [films, enP(films, 'film')], [photos, enP(photos, 'photo')]];
  const icons = ['🐾', '🎬', '📷'];
  const stats = `<div class="bekstats">${stat.map((s, i) => `<span>${icons[i]} <b>${s[0]}</b> ${s[1]}</span>`).join('')}</div>`;
  const lb = m.lang === 'pl' ? { close: 'Zamknij', prev: 'Poprzednie zdjęcie', next: 'Następne zdjęcie' } : { close: 'Close', prev: 'Previous photo', next: 'Next photo' };
  const jsonld = [ORG, {
    '@context': 'https://schema.org', '@type': 'ItemList', name: S.title,
    itemListElement: BEKON.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.title[m.lang] }))
  }];
  const avatar = href(url, 'bekon/2024-06-26.jpg');
  const body = `
<p class="crumb"><a href="${href(url, mkt + '/')}">${S.crumbHome}</a> › ${S.crumb}</p>
<div class="bekpanel"><div class="bekhero">
  <div class="bekhero-txt">
    <div class="eyebrow">${S.eyebrow}</div>
    <h1>${S.h1pre} <em style="color:var(--terra)">${S.h1em}</em></h1>
    <p class="lead">${S.lead}</p>
    <div class="bekfacts">${S.facts.map(f => `<span class="bekfact"><b>${f[0]}</b> ${f[1]}</span>`).join('')}</div>
    ${stats}
  </div>
  <figure class="bekavatar"><img src="${avatar}" alt="${S.avatarAlt}" loading="lazy"></figure>
</div></div>
<div class="tl">
${items}
<p class="tlend">${S.endNote}</p>
</div>
<script>
(function(){
var imgs=[].slice.call(document.querySelectorAll('.tl .tlfig:not(.tlfig--video) .tlframe img'));
if(!imgs.length)return;
var ov=document.createElement('div');ov.className='lbx';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');
ov.innerHTML='<button class="lbx-prev" type="button" aria-label="${lb.prev}">‹</button><img class="lbx-img" alt=""><figcaption class="lbx-cap"></figcaption><button class="lbx-next" type="button" aria-label="${lb.next}">›</button><button class="lbx-x" type="button" aria-label="${lb.close}">×</button>';
document.body.appendChild(ov);
var im=ov.querySelector('.lbx-img'),cap=ov.querySelector('.lbx-cap'),cur=-1;
function show(i){cur=(i+imgs.length)%imgs.length;var s=imgs[cur];im.src=s.currentSrc||s.src;var f=s.closest('figure'),c=f&&f.querySelector('figcaption');cap.textContent=c?c.textContent:'';ov.classList.add('on');document.body.style.overflow='hidden';}
function hide(){ov.classList.remove('on');document.body.style.overflow='';im.src='';}
imgs.forEach(function(s,i){s.addEventListener('click',function(){show(i);});});
ov.addEventListener('click',function(e){if(e.target===ov||e.target.classList.contains('lbx-x'))hide();});
ov.querySelector('.lbx-prev').addEventListener('click',function(e){e.stopPropagation();show(cur-1);});
ov.querySelector('.lbx-next').addEventListener('click',function(e){e.stopPropagation();show(cur+1);});
document.addEventListener('keydown',function(e){if(!ov.classList.contains('on'))return;if(e.key==='Escape')hide();else if(e.key==='ArrowLeft')show(cur-1);else if(e.key==='ArrowRight')show(cur+1);});
})();
</script>`;
  return { url, html: page({ title: S.title, desc: S.desc, canonical: url, body, jsonld, mkt, alts }) };
}

/* ---------- kalkulator kosztu żywienia ---------- */
function calcPage(mkt) {
  const m = MARKETS[mkt]; const S = STR[m.lang]; const C = S.calc;
  const url = `/${mkt}/${C.slug}/`;
  const foods = ((PRODUCTS[mkt] || {}).karmy || []).filter(f => f.kcal && (f.priceKg || f.priceZlKg))
    .map(f => ({ n: f.name + (f.flavor ? ' - ' + f.flavor : ''), kcal: f.kcal, price: f.priceKg || f.priceZlKg }))
    .sort((a, b) => a.n.localeCompare(b.n));
  const moneySym = mkt === 'pl' ? 'zł' : (mkt === 'uk' ? '£' : '$');
  const methodPath = `${mkt}/${m.lang === 'pl' ? 'metodologia' : 'methodology'}/`;
  const foodCat = m.lang === 'pl' ? 'karmy' : 'dog-food';
  const dayWord = m.lang === 'pl' ? '/dzień' : '/day';
  const body = `
<p class="crumb"><a href="${href(url, mkt + '/')}">DogRanking ${mkt.toUpperCase()}</a> › ${C.h}</p>
<div class="eyebrow">${m.lang === 'pl' ? 'Narzędzie' : 'Tool'}</div>
<h1>${C.h}</h1>
<p class="lead">${C.lead}</p>
<div class="answer">${C.answer}</div>
<div class="profile">
  <div class="pf-row">
    <div class="pf-g"><label>${C.weight}</label><input id="cw" type="number" min="1" max="90" step="0.5" value="15" style="width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:var(--paper);font:inherit;font-size:.9rem;color:var(--ink)"></div>
    <div class="pf-g"><label>${C.activity}</label><select id="ca">${C.actOpts.map(o => `<option value="${o[0]}"${o[0] === '1.6' ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></div>
    <div class="pf-g" style="flex:2"><label>${C.food}</label><select id="cf"><option value="">${C.pickFood}</option>${foods.map(f => `<option value="${f.kcal}|${f.price}">${f.n}</option>`).join('')}</select></div>
  </div>
</div>
<table id="cres" style="display:none">
<tr><th>${C.result}</th><th></th></tr>
<tr><td>${C.kcalDay}</td><td><strong id="r-kcal"></strong></td></tr>
<tr><td>${C.gramsDay}</td><td id="r-g"></td></tr>
<tr><td><strong>${C.perDay}</strong></td><td><strong id="r-day"></strong></td></tr>
<tr><td>${C.perMonth}</td><td id="r-month"></td></tr>
<tr><td>${C.perYear}</td><td id="r-year"></td></tr>
</table>
<p class="meta" id="cnote" style="display:none">${C.note} <a href="${href(url, methodPath)}">${S.howCalc}</a></p>
<p class="meta" style="margin-top:14px"><a href="${href(url, `${mkt}/${foodCat}/`)}" style="color:var(--terra);font-weight:600;text-decoration:none">${m.lang === 'pl' ? 'Pełny ranking karm →' : 'Full food ranking →'}</a></p>
<script>
(function(){
  var sym='${moneySym}', dayW='${dayWord}';
  function fmt(v){return (Math.round(v*100)/100).toLocaleString('${m.lang === 'pl' ? 'pl-PL' : 'en-GB'}',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+sym;}
  function calc(){
    var w=parseFloat(document.getElementById('cw').value), act=parseFloat(document.getElementById('ca').value), fv=document.getElementById('cf').value;
    if(!w||!fv){document.getElementById('cres').style.display='none';document.getElementById('cnote').style.display='none';return;}
    var parts=fv.split('|'), kcal100=parseFloat(parts[0]), priceKg=parseFloat(parts[1]);
    var mer=Math.round(70*Math.pow(w,0.75)*act);
    var grams=mer/(kcal100/100);
    var costDay=(grams/1000)*priceKg;
    document.getElementById('r-kcal').textContent=mer+' kcal'+dayW;
    document.getElementById('r-g').textContent=Math.round(grams)+' g'+dayW;
    document.getElementById('r-day').textContent=fmt(costDay);
    document.getElementById('r-month').textContent=fmt(costDay*30.4);
    document.getElementById('r-year').textContent=fmt(costDay*365);
    document.getElementById('cres').style.display='';document.getElementById('cnote').style.display='';
  }
  ['cw','ca','cf'].forEach(function(id){var e=document.getElementById(id);if(e){e.addEventListener('input',calc);e.addEventListener('change',calc);}});
})();
</script>`;
  const titles = { pl: 'Kalkulator kosztu karmienia psa (zł/dzień) | DogRanking', uk: 'Dog feeding cost calculator (£/day) | DogRanking', us: 'Dog feeding cost calculator ($/day) | DogRanking' };
  return { url, html: page({ title: titles[mkt], desc: C.lead.slice(0, 155), canonical: url, body, jsonld: [ORG], mkt }) };
}

/* ---------- intro: wybór rynku ---------- */
/* STRONA STARTOWA = czysta BRAMKA wyboru kraju.
   Samodzielny dokument BEZ nagłówka/nawigacji/stopki - jedyne wyjście dalej to wybór rynku. */
function rootPage() {
  const P = { pl: href('/', 'pl/'), uk: href('/', 'uk/'), us: href('/', 'us/') };
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/svg+xml" href="logo.svg">
<title>DogRanking - niezależne oceny produktów dla psów · dog product ratings</title>
<meta name="description" content="Niezależne oceny karm i produktów dla psów. Rozpoznajemy Twój kraj i pokazujemy rynek lokalny. Independent dog product ratings - PL · UK · US.">
${STAGING ? '<meta name="robots" content="noindex,nofollow">' : ''}<link rel="canonical" href="${SITE}/">
<link rel="alternate" hreflang="pl-PL" href="${SITE}/pl/">
<link rel="alternate" hreflang="en-GB" href="${SITE}/uk/">
<link rel="alternate" hreflang="en-US" href="${SITE}/us/">
<link rel="alternate" hreflang="x-default" href="${SITE}/">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,sans-serif;min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px;background:radial-gradient(120% 80% at 50% 16%,#671C26 0%,#3E0E16 62%,#2a0a10 100%);color:#F2E8D5}
.logo{height:52px;margin-bottom:22px}
.kick{font-family:'Caveat',cursive;font-weight:700;font-size:1.7rem;color:#D9A441;line-height:1}
h1{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:clamp(1.5rem,4vw,2.2rem);margin:4px 0 8px;color:#F8EFDD}
p{color:#E7D2C0;font-size:.98rem;max-width:44ch;margin:0 auto}
.spin{width:34px;height:34px;border:3px solid rgba(242,232,213,.25);border-top-color:#D9A441;border-radius:50%;margin:26px auto 4px;animation:sp 1s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.picker{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:24px}
.picker a{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.07);border:1.5px solid rgba(242,232,213,.42);color:#F2E8D5;text-decoration:none;font-weight:600;font-size:.95rem;padding:11px 20px;border-radius:99px;transition:.15s}
.picker a:hover{background:rgba(255,255,255,.16);border-color:#D9A441;transform:translateY(-2px)}
.pickhint{font-family:-apple-system,sans-serif;font-size:.74rem;color:#B79C8A;margin-top:16px}
</style>
<script type="application/ld+json">${JSON.stringify(ORG)}</script>
<script>
(function(){
  var M={pl:${JSON.stringify(P.pl)},uk:${JSON.stringify(P.uk)},us:${JSON.stringify(P.us)}};
  function pick(loc){loc=(loc||'').toUpperCase();if(loc==='PL')return 'pl';if(loc==='US'||loc==='CA'||loc==='MX')return 'us';return 'uk';}
  function byLang(){var l=(navigator.language||'').toLowerCase();if(l.indexOf('pl')===0)return 'pl';if(l==='en-us'||l==='en-ca')return 'us';return 'uk';}
  var done=false;function go(k){if(done)return;done=true;location.replace(M[k]||M.uk);}
  var t=setTimeout(function(){go(byLang());},1500);
  try{
    fetch('/cdn-cgi/trace',{cache:'no-store'}).then(function(r){return r.text();}).then(function(tx){
      clearTimeout(t);var m=/loc=([A-Za-z]{2})/.exec(tx);go(pick(m&&m[1]));
    }).catch(function(){clearTimeout(t);go(byLang());});
  }catch(e){clearTimeout(t);go(byLang());}
})();
</script>
</head>
<body>
<img class="logo" src="logo-dr.webp" alt="DogRanking">
<div class="kick">cześć, tu Bekon 🐾</div>
<h1>Szukamy Twojego rynku…</h1>
<p>Rozpoznajemy Twój kraj, żeby pokazać karmy i ceny dostępne u Ciebie. · Detecting your country to show your local market.</p>
<div class="spin" aria-hidden="true"></div>
<div class="picker">
  <a href="${P.pl}">🇵🇱 Polska</a><a href="${P.uk}">🇬🇧 United Kingdom</a><a href="${P.us}">🇺🇸 United States</a>
</div>
<div class="pickhint">Nie ten kraj? Wybierz ręcznie. · Wrong country? Pick manually.</div>
</body></html>`;
  return { url: '/', html };
}

/* ---------- intro animowane jako strona startowa (/) ----------
   Czyta gotowy static/intro.html (animacja cut-out z Bekonem) i wstrzykuje SEO:
   hreflang, JSON-LD, baner + noindex w trybie staging. Crawlowalne linki krajów
   (/pl/ /uk/ /us/) są już w pliku intro (nav.sr-links). */
function rootPageAnim() {
  let html = fs.readFileSync(path.join(__dirname, 'static', 'intro.html'), 'utf8');
  const head = `<link rel="alternate" hreflang="pl-PL" href="${SITE}/pl/">
<link rel="alternate" hreflang="en-GB" href="${SITE}/uk/">
<link rel="alternate" hreflang="en-US" href="${SITE}/us/">
<link rel="alternate" hreflang="x-default" href="${SITE}/">
${STAGING ? '<meta name="robots" content="noindex,nofollow">' : ''}
<script type="application/ld+json">${JSON.stringify(ORG)}</script>`;
  html = html.replace('</head>', head + '\n</head>');
  if (STAGING) html = html.replace('<body>', `<body>\n<div style="background:#8A5A1E;color:#FAF0E2;text-align:center;padding:8px 16px;font-family:-apple-system,sans-serif;font-size:.85rem;position:relative;z-index:50">${STR.pl.staging}</div>`);
  return { url: '/', html };
}

/* ---------- robots / llms / sitemap ---------- */
const ROBOTS = `# Strategia: CHCEMY być cytowani przez AI - allow dla wszystkich botów
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
const LLMS = `# DogRanking - independent dog product ratings (PL / UK / US)

> Transparent 100-point algorithm, paw ratings 1–5. Dog food scored on dry-matter
> composition vs FEDIAF/AAFCO thresholds, manufacturer credibility per WSAVA criteria,
> and cost per 1,000 kcal (the only fair measure across dry/wet/fresh formats).
> Separate product databases per market - availability, prices and shops are local.
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
  pages.push(homeMkt(mkt), methodPage(mkt), aboutPage(mkt), principlesPage(mkt), bekonPage(mkt));
  if (((PRODUCTS[mkt] || {}).karmy || []).some(f => f.kcal && (f.priceKg || f.priceZlKg))) pages.push(calcPage(mkt));
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
      for (const s of PHOTO_SLOTS(catSlug === 'karmy')) fs.writeFileSync(path.join(dir, `${s.file}.svg`), placeholderSVG(s.label.split(' - ')[0]));
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
function copyStatic(src, dst) {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyStatic(s, d); }
    else try { fs.writeFileSync(d, fs.readFileSync(s)); } catch (err) { console.warn(`pominięto static: ${e.name} (${err.code})`); }
  }
}
if (fs.existsSync(STATIC)) copyStatic(STATIC, OUT);
fs.writeFileSync(path.join(OUT, 'robots.txt'), ROBOTS);
fs.writeFileSync(path.join(OUT, 'llms.txt'), LLMS);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap(pages.map(p => p.url)));
const total = Object.values(PRODUCTS).reduce((a, m) => a + Object.values(m).reduce((b, v) => b + v.length, 0), 0);
console.log(`OK: ${pages.length} stron · 3 rynki · ${CATS.length} kategorii/rynek · ${total} produktów → dist/`);

// redesign v1 (terakota+oliwka, fale, Fraunces/Caveat) - 1733Z
