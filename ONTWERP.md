# CAEK — PI in de Mix · ontwerp v2

Werkdocument. Hier staat wat we gaan bouwen voordat het gebouwd is, zodat
"die grap klopt niet" een zin kost in plaats van een middag.

Wat er nu draait is v1: één level, zeven concepten achter elkaar. Dit document
beschrijft v2, waarin het spel de vorm krijgt van een echt kwartaal.

> Markeringen: **[JIJ]** = ik heb input van Woo Jung nodig ·
> **[?]** = open vraag · **[UIT]** = staat achter een schakelaar in `config.js`

---

## 1. Wat het is

Een digitale goodie: een korte 2.5D sidescroller waarin je één PI-kwartaal van
cluster CAEK meemaakt. Afscheidscadeau. Speelduur 10 à 12 minuten. Doelgroep:
collega's die normaal nooit games spelen — dus de besturing blijft links,
rechts, springen, E.

Twee boodschappen, in deze volgorde:

1. **In het midden:** druk bezig zijn levert geen punten op, waarde leveren wel.
2. **Aan het eind:** dit lukte omdat jullie het samen deden.

De eerste is de les uit het oorspronkelijke doc. De tweede is wat Woo Jung
eraan toevoegde en het is de reden dat het spel bestaat.

---

## 2. De grote verandering: van rondleiding naar cadans

**v1** was een lijn: PI Planning → Sprint → Metrics → Afhankelijkheden →
Cluster Review → Demo → Value Oven. Eén keer langs elk concept.

**v2** is een kwartaal: **vier sprints, met de Cluster Review als terugkerende
hub.** Je begint bij de PI Planning met vastgezette doelen en je eindigt als de
volgende PI alweer in zicht komt.

```
PI PLANNING ─┬─→ sprint 1 ─→ REVIEW 1 ─┐
             │                          │
             ├─→ sprint 2 ─→ REVIEW 2 ──┤
             │                          │
             ├─→ sprint 3 ─→ REVIEW 3 ──┤
             │                          │
             └─→ sprint 4 ─→ INSPECT & ADAPT
                                        │
                              volgende PI komt in zicht
```

Het terugkerende deel is geen herhaling om de herhaling. **Het podium van de
Cluster Review loopt vol.** Review 1 is bijna leeg — alleen jij. Bij Inspect &
Adapt staat iedereen er. Dat is "afstand tussen teams" en "saamhorigheid" als
mechaniek in plaats van als tekstballon, en niemand hoeft het uit te leggen.

Sprint 1 is de langste (daar leer je de bewegingen). Sprint 2 tot 4 worden
korter omdat je ze al kent. Loopt het uit de hand qua tijd, dan snijden we in
sprint 2 en 3 — nooit in de reviews.

---

## 3. Wat er per level gebeurt

### PI PLANNING — het begin

De grote bakkerij. Het **Doelenwiel** hangt er, groot en compleet. Teams komen
met hun doelen aanzetten en koppelen ze aan een segment; er lopen gouden lijnen
van de doelen naar het wiel. Risico's worden bekeken, afhankelijkheden worden
zichtbaar gemaakt (letterlijk: draden tussen teams).

Jij doet één ding: **je neemt het PI-doel mee.** En je ziet welk getal de teams
eraan hangen — dat is de business value die aan het eind naast de werkelijkheid
komt te staan.

*Checkpoint. Vanaf hier telt de klok.*

### SPRINT 1 — het beslag

Nieuw: **sprintdoel halen** en **Scope Creep**. Werkt zoals nu. Ingrediënten
verzamelen die aan het sprintdoel bijdragen, Scope Creep vreet alles wat je
onnodig oppakt en groeit, bij het sorteerbord gooi je eruit wat er niet in
hoort en dan krimpt hij.

Langste level. Hier leer je springen, oppakken, en dat niet alles wat er ligt
van jou is.

**→ CLUSTER REVIEW 1.** Bijna leeg podium. Eén demotafel: die van jou. Cupcaek
staat op het pad, want doorlopen is geen optie. Je laat zien wat je gebakken
hebt. Eén segment van het wiel licht op.

### SPRINT 2 — de knoop

Nieuw: **afhankelijkheden**. De Dependency Pretzel zoals nu — drie schakelaars
die samen de brug openen, en de knoop wordt een baguette.

Wat verandert: de schakelaars horen bij *teams*, niet bij abstracties. Je moet
bij drie teams langs. Dat is dezelfde puzzel maar het gaat ineens ergens over.

**→ CLUSTER REVIEW 2.** Er staan nu drie tafels. De teams waar je langs bent
geweest, staan er. Je ziet wat zíj gemaakt hebben. Meer wiel licht op.

### SPRINT 3 — meten en de bus

Nieuw twee dingen:

**Metrics.** Drie meetinstrumenten, dan drie deuren, en alleen de deur waar de
data naar wijst gaat open. Zoals nu, want dat werkt.

**De bus van links.** Midden in de sprint komt er een bus. Van links. Met
knipperlicht. Er stapt spoedwerk uit. Je moet iets laten vallen om het op te
kunnen pakken — en je mag zelf kiezen wát je laat vallen.

**→ CLUSTER REVIEW 3.** Vol podium. Feedback sprinkles liggen overal, en de
running gag: alles tegelijk verwerken laat de taart instorten.

### SPRINT 4 — laten zien, en wachten

Nieuw: **de demo** (PowerPoint of laten zien — de knop met 83 slides blijft) en
**de wachttunnel**.

De wachttunnel: je staat voor een gesloten deur en er gebeurt even niets.
Ernaast staat een grote knop met **"KAN HET SNELLER?"**. Die doet niks. Je mag
erop rammen. Cupcaek kijkt toe. Na een paar seconden gaat de deur open.

Geen namen, geen venijn — alleen het gevoel dat iedereen kent. Kort, één keer,
en **[UIT]** met één regel in `config.js` als hij toch niet leuk blijkt.

**→ INSPECT & ADAPT.** Alle teams op het podium. Alle taarten op tafel. Wat je
in de PI Planning beloofde naast wat er werkelijk uitkwam. Het volle Doelenwiel.

---

## 4. Het Doelenwiel

De ruggengraat. Alles wat je doet is eraan gekoppeld, en steeds meer.

De acht echte UWV-doelen, met "DOELEN UWV" in het naafje — *Wet en Regelgeving*
staat immers al als segment, dus in het midden is het dubbel.

| segment | kleur |
|---|---|
| Wet en regelgeving | rood |
| Vereenvoudigen en digitaliseren | geel |
| Bedrijfsvoering in control | geel |
| Medewerkers gezien, gehoord en gewaardeerd | groen |
| Eén UWV, één overheid | groen |
| Dienstverlening passend en toegankelijk | groen |
| Cliënten inzicht in eigen situatie | oranje |
| Beslissingen tijdig, juist en begrijpelijk | oranje |

**[?]** In je twee visuals staan *Vereenvoudigen en digitaliseren* en
*Bedrijfsvoering in control* verwisseld. Ik houd de volgorde van de losse
wielposter aan.

**Hoe het werkt:** elk teamdoel dat je binnenhaalt laat een segment oplichten.
Klein in de HUD tijdens het spelen, groot bij Inspect & Adapt. Vier sprints
lang zie je het voller worden. Dat vervangt het losse Value-percentage als
hoofdmeter — Value blijft, maar als planned versus actual op het eindscherm.

---

## 5. Waarde: planned versus actual

In v1 verzon ik een Value Meter. Die bestaat al bij jullie: teams kennen
business value toe op de PI planning, en bij Inspect & Adapt kijk je naar
Actual Value.

- **PI Planning:** de teams zetten een getal neer. Dat is de belofte.
- **Tijdens het spel:** waarde komt alleen van acties die aan een PI-doel
  bijdragen. Rondrennen en spullen verzamelen levert niets op. Dat is het punt.
- **Inspect & Adapt:** twee balken naast elkaar. Beloofd en geleverd.

De meter capt nog steeds op 97%, en Cupcaek gooit er op het eindscherm één
laatste sprinkle op. 98. Er is altijd wel iets te verbeteren.

---

## 6. Wie er in zitten

### Caek

**Niet de werker — de mascotte en de guiding spirit van het cluster.** Hij
verzamelt geen ingrediënten omdat hij het werk doet; hij loopt er doorheen en
brengt de boel bij elkaar. Dat is de verschuiving ten opzichte van v1.

### Cupcaek

Zusje, sidekick, en het geweten. Ze levert commentaar, ze blokkeert het pad als
je een Cluster Review wilt overslaan, en ze zegt de zinnen die anders belerend
zouden worden.

*Nog een placeholder-model uit primitieven. Volggedrag en gezichtsuitdrukkingen
werken al; zodra de rigged GLB er is, is het een kwestie van inladen.*

### SuperCaek

Twintig seconden waarin de hele renderer van genre wisselt. Vlak voor het einde,
als de Value Energy vol is. Hij dendert door papierrommel, onduidelijkheid,
dubbel werk en onnodige complexiteit. Niet door mensen.

### De teams

**[JIJ]** Dit is het enige onderdeel waar dit ding pijn kan doen: iemand opent
het, zoekt zijn team, vindt het niet.

Daarom drie maatregelen:

1. **De roster is data, geen code.** Eén lijst in `config.js` die jij tot vijf
   minuten voor verzending kunt aanpassen. Het spel werkt met vier teams net zo
   goed als met twintig — het podium schaalt mee. Nergens staat een aantal
   hardcoded.
2. **Drie banden.** Sprintteams staan op het podium met hun eigen taartje.
   Andere teams staan er ook, als deel van de review. De mensen van
   UV/Uitvoering en de vakgroepen zitten zichtbaar in het publiek — dat de
   stakeholders ín het cluster zitten is de trots van dit cluster, dus die
   horen in beeld en niet achter een muur waar je naartoe demonstreert.
3. **Aftiteling.** Na afloop een rollende lijst: *DIT CLUSTER BESTOND UIT*.
   Daar mag het lang zijn, daar verwacht iedereen volledigheid, en die vul jij.

Zo verschuift het risico van "heeft Claude iemand vergeten" naar "is mijn eigen
lijst compleet" — en dat is een controle van tien minuten.

Wat ik uit je visuals heb gehaald als startlijst (corrigeer en vul aan):
Equinox · Polis LA · Casio · Team UPA/Freggels · Smurfen · Sterke Verhalen ·
Superheroes · Muppets · Tiem · Architectuur.

### Woo Jung FM

Geen figuurtje. **Een radio.** Een klein gedeukt radiootje op het Cluster
Review-terrein, met een bordje erboven. Je kunt erop drukken en dan zegt hij
iets nergens over. Aanwezig zonder spotlight; wie het weet die weet het.

---

## 7. De kleine chaos onderweg

Visuele grappen en woordspelingen, géén mechanieken. Wat je moet doen om verder
te komen moet je in tien seconden snappen; de rest is smaak.

| | wat het is |
|---|---|
| **BAU** | lopende band met broodjes die niet stopt. Je moet er tussendoor blijven bewegen. |
| **Technical debt** | dichtgekoekte broodrooster. Negeer je hem, dan spuugt hij later brandende toast. |
| **Impediment** | stokbrood dwars over de weg. Gaat pas weg als je het zichtbaar maakt. |
| **Bus van links** | spoedwerk arriveert per bus. Je moet iets laten vallen. |
| **Kort overleg** | deur met "15 MIN". De klok loopt door tot 1:15. Uitgang opent na BESLUIT. |
| **Vraagsturen** | een bord waar oud en nieuw werk tegen elkaar aan duwen. Decor. |
| **Obeya** | muur met kaartjes bij de review. Decor. |
| **Wachttunnel** | zie sprint 4. **[UIT]** |

---

## 8. Het einde

Twee beats, in deze volgorde. Niet door elkaar.

**Eerst sluit de PI.** Inspect & Adapt: alle teams op het podium, alle taarten
op tafel, planned naast actual, het volle Doelenwiel. De camera zoomt uit. En
dan zie je de volgende PI al in zicht komen — het wiel begint opnieuw te
draaien.

Dat is de goede noot voor een afscheid: geen "einde", maar *het gaat door*.

**Dan pas het woord.** Het frame blijft heel — geen zwart scherm met tekst,
maar de wereld die stil wordt. Alle teams die er nog staan. Caek die een stap
opzij doet.

**[JIJ] De woorden moeten van jou zijn.** Ik kan een mooie afscheidstekst
schrijven en die zal nergens naar smaken. Schrijf jij hem, zo lang of kort als
je wilt, geen vorm nodig — ik bouw het omhulsel. Laat ook even weten of je naam
eronder mag of dat je liever anoniem afscheid neemt.

Daarna de aftiteling met het hele cluster erin.

En helemaal onderaan, jullie eigen zin:

> **BETERE INGREDIËNTEN, BETER RESULTAAT!**

---

## 9. Wat er niet in komt

- Geen namen van externe partijen. Het moet grappig zijn, geen venijn.
- Geen jargon in mechanieken. Vraagsturen, Obeya, Tactisch Cluster Overleg:
  bordjes langs de weg, geen puzzels.
- Geen opslaan van voortgang. Het duurt tien minuten.
- Geen tweede speelbaar karakter deze ronde. Cupcaek speelbaar maken staat op
  de lijst, maar wacht op haar rigged model.

---

## 10. Wat ik van jou nodig heb

1. **De roster** — sprintteams, andere teams, en wie er in het publiek horen.
   Ruwe opsomming is prima.
2. **Je afscheidstekst**, plus of je naam eronder mag.
3. **Deze twee checks:** klopt de volgorde van het Doelenwiel, en wil je de
   wachttunnel überhaupt?

Dat laatste kan ook nadat ik gebouwd heb — de tekst en de namen zijn los in te
vullen zonder dat er code aan te pas komt.
