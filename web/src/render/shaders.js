/* CAEK — GLSL voor de olieverf-pipeline.
 *
 * Alle post-shaders draaien als GLSL ES 3.00 (three.js GLSL3), zodat de
 * Kuwahara-lus dynamische grenzen mag hebben. three definieert daarbij zelf
 * `varying -> in` en `texture2D -> texture`; `gl_FragColor` niet, dus elke
 * fragmentshader declareert zijn eigen `out vec4 fragKleur`.
 *
 * De keten:
 *   scene -> tensor (halve res) -> blur H -> blur V -> anisotrope Kuwahara -> finale
 */

// Fullscreen driehoek/quad: positie ligt al in klipruimte.
export const quadVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/* ------------------------------------------------------------------ *
 * Ruisgereedschap, gedeeld door lucht en finale
 * ------------------------------------------------------------------ */
const ruis = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float ruis2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float som = 0.0, amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    som += amp * ruis2(p);
    p = rot * p * 2.03;
    amp *= 0.5;
  }
  return som;
}
`;

/* Tint verschuiven per streek vraagt om HSV; in RGB wordt elke verschuiving
 * ook een helderheidsverschuiving en dan verkleurt het naar modder. */
const kleurChunk = /* glsl */ `
vec3 naarHsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}
vec3 naarRgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
`;

/* ------------------------------------------------------------------ *
 * De Sterrennacht-lucht: domain-warped fbm met wervels rond drie sterren
 * ------------------------------------------------------------------ */
export const luchtFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTijd;
uniform vec2 uPan;        // camerapositie, voor parallax
uniform float uAspect;
uniform float uSuper;
out vec4 fragKleur;

${ruis}

vec2 wervel(vec2 p, vec2 centrum, float kracht) {
  vec2 d = p - centrum;
  float r2 = dot(d, d);
  float hoek = kracht / (r2 + 0.06);
  float s = sin(hoek), c = cos(hoek);
  return centrum + mat2(c, -s, s, c) * d;
}

void main() {
  vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y - 0.5);
  p += uPan;

  // drie vaste sterren waar het hele doek omheen draait
  vec2 sterA = vec2(-0.62, 0.26) + vec2(uPan.x * 0.05, 0.0);
  vec2 sterB = vec2(0.48, 0.34) + vec2(uPan.x * 0.05, 0.0);
  vec2 sterC = vec2(-0.05, 0.44) + vec2(uPan.x * 0.05, 0.0);

  vec2 q = p;
  q = wervel(q, sterA, 0.16 + 0.02 * sin(uTijd * 0.21));
  q = wervel(q, sterB, -0.13 + 0.02 * cos(uTijd * 0.17));
  q = wervel(q, sterC, 0.10);

  // domain warping: fbm gevoed met fbm
  vec2 w = vec2(fbm(q * 3.1 + uTijd * 0.035), fbm(q * 3.1 + 7.3 - uTijd * 0.028));
  float veld = fbm(q * 4.6 + w * 1.9);
  float veld2 = fbm(q * 9.0 - w * 1.2 + 4.0);

  vec3 diep = vec3(0.022, 0.038, 0.205);
  vec3 blauw = vec3(0.045, 0.140, 0.560);
  vec3 helder = vec3(0.130, 0.310, 0.900);
  vec3 kleur = mix(diep, blauw, smoothstep(0.28, 0.72, veld));
  kleur = mix(kleur, helder, smoothstep(0.52, 0.92, veld) * 0.75);

  // gouden strepen in de wervels
  float goud = smoothstep(0.60, 0.86, veld2) * smoothstep(0.35, 0.75, veld);
  kleur += vec3(1.00, 0.66, 0.16) * goud * 0.55;

  // De sterren zelf: een strakke kern met een zachte halo. Een 1/r²-gloed
  // waste het hele doek grijs, vandaar exponentiële afval.
  float sterren = 0.0;
  for (int i = 0; i < 3; i++) {
    vec2 c = i == 0 ? sterA : (i == 1 ? sterB : sterC);
    float d2 = dot(p - c, p - c);
    sterren += 0.85 * exp(-d2 * 240.0) + 0.34 * exp(-d2 * 34.0);
  }
  kleur += vec3(1.0, 0.80, 0.38) * sterren * (0.85 + 0.15 * sin(uTijd * 1.7));

  // horizonzweem, zodat de grond niet los in het niets hangt
  kleur = mix(kleur, vec3(0.06, 0.10, 0.26), smoothstep(0.42, 0.02, vUv.y));

  // in SuperCaek-modus verhardt de lucht naar comicvlakken
  vec3 hard = floor(kleur * 4.0 + 0.5) / 4.0;
  kleur = mix(kleur, hard * vec3(1.05, 0.98, 1.15), uSuper * 0.85);

  fragKleur = vec4(kleur, 1.0);
}
`;

/* ------------------------------------------------------------------ *
 * Pass 2 — structuurtensor (Sobel). Uitvoer: (E, F, G)
 * ------------------------------------------------------------------ */
export const tensorFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uBron;
uniform vec2 uPixel;
out vec4 fragKleur;

void main() {
  vec2 p = uPixel;
  vec3 u = (
    -1.0 * texture2D(uBron, vUv + vec2(-p.x, -p.y)).rgb +
    -2.0 * texture2D(uBron, vUv + vec2(-p.x,  0.0)).rgb +
    -1.0 * texture2D(uBron, vUv + vec2(-p.x,  p.y)).rgb +
     1.0 * texture2D(uBron, vUv + vec2( p.x, -p.y)).rgb +
     2.0 * texture2D(uBron, vUv + vec2( p.x,  0.0)).rgb +
     1.0 * texture2D(uBron, vUv + vec2( p.x,  p.y)).rgb) / 4.0;

  vec3 v = (
    -1.0 * texture2D(uBron, vUv + vec2(-p.x, -p.y)).rgb +
    -2.0 * texture2D(uBron, vUv + vec2( 0.0, -p.y)).rgb +
    -1.0 * texture2D(uBron, vUv + vec2( p.x, -p.y)).rgb +
     1.0 * texture2D(uBron, vUv + vec2(-p.x,  p.y)).rgb +
     2.0 * texture2D(uBron, vUv + vec2( 0.0,  p.y)).rgb +
     1.0 * texture2D(uBron, vUv + vec2( p.x,  p.y)).rgb) / 4.0;

  fragKleur = vec4(dot(u, u), dot(u, v), dot(v, v), 1.0);
}
`;

/* ------------------------------------------------------------------ *
 * Pass 3 + 4 — separabele gaussian over de tensor
 * ------------------------------------------------------------------ */
export const blurFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uBron;
uniform vec2 uRichting;   // stap in uv-ruimte (horizontaal of verticaal)
out vec4 fragKleur;

void main() {
  const int R = 5;
  const float sigma = 2.4;
  vec3 som = vec3(0.0);
  float gewicht = 0.0;
  for (int i = -R; i <= R; i++) {
    float f = float(i);
    float w = exp(-(f * f) / (2.0 * sigma * sigma));
    som += texture2D(uBron, vUv + uRichting * f).rgb * w;
    gewicht += w;
  }
  fragKleur = vec4(som / gewicht, 1.0);
}
`;

/* ------------------------------------------------------------------ *
 * Gedeeld: tensor -> streekrichting + anisotropie
 * ------------------------------------------------------------------ *
 * J = [[E, F], [F, G]]. De hoofdeigenvector wijst lángs de gradiënt
 * (dwars op de rand); een penseelstreek volgt juist de rand, dus we nemen
 * de loodrechte: t = (l1 - E, -F). Staan de streken dwars op de randen in
 * plaats van erlangs, dan is dit de regel die 90 graden gedraaid moet.
 */
const flowChunk = /* glsl */ `
vec4 flowInfo(vec3 g) {
  float E = g.x, F = g.y, G = g.z;
  float d = E - G;
  float disc = sqrt(max(d * d + 4.0 * F * F, 0.0));
  float l1 = 0.5 * (E + G + disc);
  float l2 = 0.5 * (E + G - disc);
  vec2 t = vec2(l1 - E, -F);
  float len = length(t);
  vec2 richting = len > 1e-7 ? t / len : vec2(1.0, 0.0);
  float anis = (l1 + l2) > 1e-7 ? (l1 - l2) / (l1 + l2) : 0.0;
  return vec4(richting, anis, l1);
}
`;

/* ------------------------------------------------------------------ *
 * Pass 5 — anisotrope Kuwahara (Kyprianidis), 8 sectoren met
 * polynoomweging, elliptische kernel langs het flowveld
 * ------------------------------------------------------------------ */
export const kuwaharaFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uBron;
uniform sampler2D uTensor;
uniform vec2 uPixel;
uniform float uStraal;
uniform float uAlfa;       // excentriciteit
uniform float uScherpte;   // q
out vec4 fragKleur;

${flowChunk}

void main() {
  vec4 stroom = flowInfo(texture2D(uTensor, vUv).xyz);
  float anis = stroom.z;

  float a = uStraal * clamp((uAlfa + anis) / uAlfa, 0.1, 2.0);
  float b = uStraal * clamp(uAlfa / (uAlfa + anis), 0.1, 2.0);
  float cs = stroom.x, sn = stroom.y;

  // S * R^-1: draai naar het streekframe en schaal de ellips naar de eenheidscirkel
  mat2 SR = mat2(cs / a, -sn / b, sn / a, cs / b);

  int maxX = int(sqrt(a * a * cs * cs + b * b * sn * sn) + 0.5);
  int maxY = int(sqrt(a * a * sn * sn + b * b * cs * cs) + 0.5);

  float zeta = 2.0 / max(uStraal, 1.0);
  const float nuldoorgang = 0.58;
  float sinZ = sin(nuldoorgang);
  float eta = (zeta + cos(nuldoorgang)) / (sinZ * sinZ);

  vec4 m[8];
  vec3 s2[8];
  for (int k = 0; k < 8; k++) { m[k] = vec4(0.0); s2[k] = vec3(0.0); }

  for (int j = -maxY; j <= maxY; j++) {
    for (int i = -maxX; i <= maxX; i++) {
      vec2 v = SR * vec2(float(i), float(j));
      if (dot(v, v) > 1.0) continue;

      vec3 c = clamp(texture2D(uBron, vUv + vec2(float(i), float(j)) * uPixel).rgb, 0.0, 8.0);

      float w[8];
      float som = 0.0, z, vxx, vyy;
      float r2 = dot(v, v);

      vxx = zeta - eta * v.x * v.x;
      vyy = zeta - eta * v.y * v.y;
      z = max(0.0,  v.y + vxx); w[0] = z * z; som += w[0];
      z = max(0.0, -v.x + vyy); w[2] = z * z; som += w[2];
      z = max(0.0, -v.y + vxx); w[4] = z * z; som += w[4];
      z = max(0.0,  v.x + vyy); w[6] = z * z; som += w[6];

      v = 0.707106781 * vec2(v.x - v.y, v.x + v.y);   // 45 graden verder
      vxx = zeta - eta * v.x * v.x;
      vyy = zeta - eta * v.y * v.y;
      z = max(0.0,  v.y + vxx); w[1] = z * z; som += w[1];
      z = max(0.0, -v.x + vyy); w[3] = z * z; som += w[3];
      z = max(0.0, -v.y + vxx); w[5] = z * z; som += w[5];
      z = max(0.0,  v.x + vyy); w[7] = z * z; som += w[7];

      float g = exp(-3.125 * r2) / max(som, 1e-5);
      for (int k = 0; k < 8; k++) {
        float wk = w[k] * g;
        m[k] += vec4(c * wk, wk);
        s2[k] += c * c * wk;
      }
    }
  }

  vec4 uit = vec4(0.0);
  for (int k = 0; k < 8; k++) {
    float wk = max(m[k].w, 1e-5);
    vec3 gemiddelde = m[k].rgb / wk;
    vec3 variantie = abs(s2[k] / wk - gemiddelde * gemiddelde);
    float sigma2 = variantie.r + variantie.g + variantie.b;
    float w = 1.0 / (1.0 + pow(max(sigma2 * 255.0, 0.0), 0.5 * uScherpte));
    uit += vec4(gemiddelde * w, w);
  }
  fragKleur = vec4(uit.rgb / max(uit.a, 1e-5), 1.0);
}
`;

/* ================================================================== *
 * STREKEN — penseelhalen als echte geometrie
 * ================================================================== *
 *
 * De Kuwahara-keten hierboven is een filter: hij smeert pixels uit. Deze
 * pass legt in plaats daarvan duizenden losse quads neer, elk gedraaid
 * langs het flowveld en gekleurd door het geschilderde beeld eronder. Dat
 * is het verschil tussen "gefilterde 3D" en iets dat eruitziet alsof er
 * daadwerkelijk halen op een doek staan: streken lopen over silhouetranden
 * heen, ze overlappen, en waar ze overlappen ligt de verf dikker.
 *
 * Twee uitgangen (MRT):
 *   0 — kleur, premultiplied
 *   1 — hoogte, waaruit de finale-pass echt reliëf belicht
 */

export const streekVertex = /* glsl */ `
precision highp float;

attribute vec2 aAnker;        // rasterpositie in uv, met jitter
attribute vec4 aWillekeur;    // per streek: lengte, breedte, hoek, borstel

uniform sampler2D uKleur;     // het geschilderde beeld (Kuwahara)
uniform sampler2D uTensor;    // het gladde flowveld
uniform vec2 uResolutie;
uniform vec2 uVerschuiving;   // camerapan, zodat streken aan de wereld plakken
uniform float uLengte;
uniform float uBreedte;
uniform float uHoekRuis;      // hoeveel streken van het flowveld af mogen wijken
uniform float uRandKrimp;     // kleiner worden bij sterke randen
uniform float uKrimpBodem;    // hoe klein een haal maximaal mag worden
uniform float uAnisotropie;   // lengte volgt de anisotropie van het veld
uniform float uDetail;        // 1 = deze laag verschijnt alleen waar detail zit
uniform float uTintRuis;      // tintverschil tussen naburige halen
uniform float uWaardeRuis;    // helderheidsverschil tussen naburige halen
uniform float uKleurSpreiding;// hoe ver een haal zijn kleur naast zichzelf ophaalt
uniform float uVonken;        // losse halen in de complementaire kleur
uniform float uWervel;        // procedurele wervels waar het veld niets zegt
uniform float uWervelSchaal;

varying vec3 vKleur;
varying vec2 vQuad;
varying float vBorstel;
varying float vWeging;

${flowChunk}
${ruis}
${kleurChunk}

/* Waar de scene vlak is (lucht) zegt de structuurtensor niets en krijgen alle
 * halen dezelfde saaie richting. Van Gogh vult zulke vlakken juist met
 * wervels. Dit is de curl van een fbm-veld: doorlopend, niet-herhalend, en
 * precies het soort krul dat je in de lucht wilt. */
vec2 wervelRichting(vec2 uv) {
  float e = 0.0035;
  vec2 p = uv * uWervelSchaal;
  float a = fbm(p);
  float dx = fbm(p + vec2(e * uWervelSchaal, 0.0)) - a;
  float dy = fbm(p + vec2(0.0, e * uWervelSchaal)) - a;
  vec2 c = vec2(dy, -dx);
  float l = length(c);
  return l > 1e-6 ? c / l : vec2(1.0, 0.0);
}

void main() {
  vec2 anker = fract(aAnker + uVerschuiving);

  vec3 tensor = texture2D(uTensor, anker).xyz;
  vec4 stroom = flowInfo(tensor);
  vec2 richting = stroom.xy;
  float anis = stroom.z;
  float randKracht = sqrt(max(stroom.w, 0.0));

  // In vlakke gebieden het flowveld vervangen door een wervel; op vormen
  // blijft de tensor de baas, want daar zegt hij wél iets.
  vec2 krul = wervelRichting(anker + uVerschuiving);
  float vlak = 1.0 - smoothstep(0.02, 0.30, anis);
  richting = normalize(mix(richting, krul, uWervel * vlak) + 1e-6);

  // Kleur niet exact onder de haal ophalen maar een stukje ernaast: naburige
  // halen pakken zo naburige kleuren op, en dat is precies wat een egaal vlak
  // levendig maakt.
  vec2 loodrecht = vec2(-richting.y, richting.x);
  vec2 monster = anker + loodrecht * (aWillekeur.y - 0.5) * uKleurSpreiding * 0.02;
  vec3 kleur = texture2D(uKleur, clamp(monster, 0.001, 0.999)).rgb;

  // Eén egale kleur per vlak leest als plastic. Verschuif tint en helderheid
  // per haal, en gooi er af en toe een complementaire vonk tussen — dat zijn
  // de oranje spikkels in de blauwe lucht.
  vec3 hsv = naarHsv(clamp(kleur, 0.0, 1.0));
  hsv.x = fract(hsv.x + (aWillekeur.x - 0.5) * uTintRuis);
  hsv.y = clamp(hsv.y * (1.0 + (aWillekeur.z - 0.5) * 0.5), 0.0, 1.0);
  // Deels vermenigvuldigen, deels optellen. Puur vermenigvuldigen laat
  // donkere vlakken egaal: 0 maal wat dan ook blijft 0, dus in de schaduw
  // waren er wel halen maar zag je ze niet.
  hsv.z = max(hsv.z * (1.0 + (aWillekeur.w - 0.5) * uWaardeRuis)
              + (aWillekeur.w - 0.5) * uWaardeRuis * 0.16, 0.0);
  float vonk = step(0.94, aWillekeur.z) * uVonken;
  hsv.x = fract(hsv.x + vonk * 0.46);
  hsv.y = clamp(hsv.y + vonk * 0.35, 0.0, 1.0);
  hsv.z *= 1.0 + vonk * 0.35;
  vKleur = naarRgb(hsv);

  // Een streek mag best een beetje eigenwijs zijn; perfect uitgelijnd leest
  // als een kam in plaats van als een hand.
  float hoek = (aWillekeur.z - 0.5) * uHoekRuis;
  float ch = cos(hoek), sh = sin(hoek);
  richting = mat2(ch, -sh, sh, ch) * richting;

  // Kleiner bij randen, zodat een klein karakter niet in twee halen verdwijnt.
  // Met een bodem eronder: zonder die bodem knijpt deze term ook in de lucht,
  // waar de procedurele wolken genoeg gradiënt hebben om hem te laten
  // afgaan — en dan wordt de ingestelde streeklengte betekenisloos en steekt
  // geen enkele haal ooit over een silhouet heen.
  float krimp = max(uKrimpBodem, 1.0 / (1.0 + randKracht * uRandKrimp));
  float lengte = uLengte * (0.55 + 0.9 * aWillekeur.x) * mix(1.0, 0.45 + anis, uAnisotropie) * krimp;
  float breedte = uBreedte * (0.65 + 0.7 * aWillekeur.y) * mix(1.0, krimp, 0.65);

  vec2 t = richting;
  vec2 n = vec2(-richting.y, richting.x);
  vec2 verplaatsing = position.x * t * lengte + position.y * n * breedte;

  vec2 uv = anker + verplaatsing / uResolutie;
  gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);

  vQuad = position.xy * 2.0;          // -1 .. 1
  vBorstel = aWillekeur.w;

  // Een schilder zet grove halen overal neer en pakt pas een fijn penseel
  // waar iets te zien is. Zonder dit dekt de detaillaag ook de lucht af en
  // verdwijnt precies de brede, zwierige streek die je wilt houden.
  vWeging = mix(1.0, smoothstep(0.04, 0.55, randKracht), uDetail);
}
`;

export const streekFragment = /* glsl */ `
precision highp float;

varying vec3 vKleur;
varying vec2 vQuad;
varying float vBorstel;
varying float vWeging;

uniform float uDekking;
uniform float uHaren;      // hoe sterk de borstelharen doorkomen
uniform float uHoogte;

layout(location = 0) out vec4 uitKleur;
layout(location = 1) out vec4 uitHoogte;

${ruis}

void main() {
  float x = vQuad.x;   // langs de streek
  float y = vQuad.y;   // dwars erop

  float langs = 1.0 - x * x;
  float dwars = 1.0 - y * y;
  if (langs <= 0.0 || dwars <= 0.0) discard;

  // losse haren: strepen evenwijdig aan de streek die minder verf dragen
  float haren = mix(1.0, 0.55 + 0.65 * ruis2(vec2(x * 2.4, y * 9.0 + vBorstel * 57.0)), uHaren);

  // uiteinden lopen uit, de aanzet is voller dan het einde
  float uiteinde = smoothstep(0.0, 0.42, langs) * (0.75 + 0.25 * smoothstep(-1.0, 0.4, -x));
  float alfa = uiteinde * smoothstep(0.0, 0.5, dwars) * haren * uDekking * vWeging;
  if (alfa < 0.004) discard;

  // De koepel van de haal: in het midden ligt de verf dikker dan aan de
  // randen. Waar streken elkaar overlappen wint de bovenste — precies zoals
  // natte verf zich gedraagt.
  float koepel = dwars * (0.45 + 0.55 * langs) * haren;

  uitKleur = vec4(vKleur * alfa, alfa);
  uitHoogte = vec4(koepel * uHoogte * alfa, alfa, 0.0, alfa);
}
`;

/** Grondlaag: het geschilderde beeld als onderschildering, zodat er nooit
 *  gaten tussen de streken vallen. */
export const grondlaagFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uKleur;
uniform float uBasisHoogte;
layout(location = 0) out vec4 uitKleur;
layout(location = 1) out vec4 uitHoogte;

void main() {
  uitKleur = vec4(texture2D(uKleur, vUv).rgb, 1.0);
  uitHoogte = vec4(uBasisHoogte, 1.0, 0.0, 1.0);
}
`;

/* ------------------------------------------------------------------ *
 * Pass 6 — finale: LIC-smeer, impasto-reliëf, korrel, split-toning,
 * vignet, en het comicpad voor SuperCaek (gecrossfade met uSuper)
 * ------------------------------------------------------------------ */
export const finaleFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVerf;
uniform sampler2D uTensor;
uniform sampler2D uHoogteKaart;   // echte streekhoogte (0 als er geen streken zijn)
uniform vec2 uPixel;
uniform float uTijd;
uniform float uStreken;           // 1 = hoogte komt uit de streken, 0 = uit de luminantie
uniform float uLic;
uniform float uImpasto;
uniform float uKorrel;
uniform float uWarmte;
uniform float uSchaduwKleur;
uniform float uVignet;
uniform float uBelichting;
uniform float uSuper;
uniform float uFlits;      // witte impactflits bij de transformatie
out vec4 fragKleur;

${ruis}
${flowChunk}

float luminantie(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec2 stroomRichting(vec2 uv) {
  return flowInfo(texture2D(uTensor, uv).xyz).xy;
}

/* Line integral convolution: middel de verf uit lángs het streekveld,
   zodat losse pixels tot doorlopende halen worden. */
vec3 lic(vec2 uv, float stappen) {
  vec3 som = texture2D(uVerf, uv).rgb;
  float gew = 1.0;
  vec2 basis = stroomRichting(uv);

  for (int teken = 0; teken < 2; teken++) {
    vec2 p = uv;
    vec2 richting = teken == 0 ? basis : -basis;
    for (int i = 1; i <= 8; i++) {
      if (float(i) > stappen) break;
      vec2 d = stroomRichting(p);
      if (dot(d, richting) < 0.0) d = -d;
      richting = d;
      p += richting * uPixel;
      float k = 1.0 - float(i) / (stappen + 1.0);
      som += texture2D(uVerf, p).rgb * k;
      gew += k;
    }
  }
  return som / gew;
}

/* Hoogteveld voor het impasto: helderheid van de verf plus borstelkorrel
   die dwars op de streek loopt. */
float hoogte(vec2 uv, vec2 f, vec2 n) {
  // korrel in pixelmaat, niet in uv: langgerekt lángs de streek (~20 px) en
  // fijn dwars erop (~3 px). In uv-ruimte werd dit ruis op pixelniveau en dat
  // leest als sneeuw in plaats van als borstelharen.
  vec2 pix = uv / uPixel;
  vec2 lokaal = vec2(dot(pix, f), dot(pix, n));  // pixels langs / dwars op de streek
  float korrel = ruis2(lokaal * vec2(0.05, 0.34)) - 0.5;
  korrel += (ruis2(lokaal * vec2(0.11, 0.72)) - 0.5) * 0.45;

  // Met streek-geometrie is de hoogte echt: waar halen elkaar overlappen
  // ligt de verf dikker. Zonder streken leiden we hem af uit de helderheid,
  // wat een aardige benadering is maar geen echte ribbels geeft.
  float h = uStreken > 0.5
    ? texture2D(uHoogteKaart, uv).r
    : luminantie(texture2D(uVerf, uv).rgb);

  return h + korrel * uKorrel;
}

/* --- comicpad --------------------------------------------------- */
float halftoon(vec2 uv, vec2 res, float schaal) {
  vec2 p = uv * res / schaal;
  float s = sin(0.7853981), c = cos(0.7853981);
  p = mat2(c, -s, s, c) * p;
  vec2 f = fract(p) - 0.5;
  return length(f) * 2.0;
}

float snelheidslijnen(vec2 uv, float t) {
  vec2 d = uv - vec2(0.5, 0.52);
  float r = length(d);
  float hoek = atan(d.y, d.x);
  float baan = floor(hoek * 3.2);
  float jitter = hash12(vec2(baan, floor(t * 7.0)));
  float lijn = smoothstep(0.90, 1.0, fract(hoek * 3.2 + jitter * 0.8));
  return lijn * smoothstep(0.26, 0.78, r);
}

void main() {
  vec2 f = stroomRichting(vUv);
  vec2 n = vec2(-f.y, f.x);

  vec3 verf = uLic > 0.5 ? lic(vUv, uLic) : texture2D(uVerf, vUv).rgb;

  // Doekmottel: grote, trage helderheidsvariatie. Zonder dit blijven vlakke
  // vlakken (lucht, grond) plastic — de Kuwahara heeft niets om op te kauwen.
  vec2 pixels = vUv / uPixel;
  verf *= 0.90 + 0.20 * ruis2(pixels * 0.016 + 3.0);

  // ---- impasto -------------------------------------------------
  if (uImpasto > 0.001) {
    float hL = hoogte(vUv - vec2(uPixel.x, 0.0), f, n);
    float hR = hoogte(vUv + vec2(uPixel.x, 0.0), f, n);
    float hD = hoogte(vUv - vec2(0.0, uPixel.y), f, n);
    float hU = hoogte(vUv + vec2(0.0, uPixel.y), f, n);

    float sterkte = uImpasto * (uStreken > 0.5 ? 62.0 : 26.0);
    vec3 N = normalize(vec3((hL - hR) * sterkte, (hD - hU) * sterkte, 1.0));
    vec3 L = normalize(vec3(-0.55, 0.64, 0.54));   // strijklicht linksboven
    float diffuus = clamp(dot(N, L), 0.0, 1.0);
    float glans = pow(clamp(dot(reflect(-L, N), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 28.0);

    verf *= 0.74 + 0.46 * diffuus;
    verf += glans * 0.26 * uImpasto;
  }

  // ---- grade: belichting, split-toning, vignet ------------------
  vec3 kleur = verf * uBelichting;
  kleur = kleur / (1.0 + kleur * 0.42);            // zachte filmcurve

  float l = luminantie(kleur);
  vec3 schaduwtint = vec3(0.10, 0.26, 0.72);       // UWV-blauw in het donker
  vec3 lichttint = vec3(1.00, 0.74, 0.34);         // goudgeel in het licht
  float donker = 1.0 - smoothstep(0.0, 0.55, l);
  kleur = mix(kleur, kleur * schaduwtint * 2.0, uWarmte * donker);
  // Puur vermenigvuldigen duwt de donkerste plekken naar bijna-zwart; een
  // violette bodem houdt er kleur in, zoals in de referenties.
  kleur += vec3(0.16, 0.09, 0.34) * donker * donker * uSchaduwKleur;
  kleur = mix(kleur, kleur * lichttint * 1.28, uWarmte * smoothstep(0.42, 1.0, l));
  kleur = mix(vec3(l), kleur, 1.18);               // net iets meer verzadiging

  // ---- comicpad (SuperCaek) ------------------------------------
  if (uSuper > 0.001) {
    vec3 basis = verf * uBelichting;
    basis = basis / (1.0 + basis * 0.42);
    float bl = luminantie(basis);
    vec3 verzadigd = clamp(mix(vec3(bl), basis, 1.45) * 1.12, 0.0, 1.0);
    vec3 vlak = floor(verzadigd * 5.0 + 0.5) / 5.0;

    // dikke inktlijnen op de verf
    float cx = luminantie(texture2D(uVerf, vUv + vec2(uPixel.x * 1.5, 0.0)).rgb) -
               luminantie(texture2D(uVerf, vUv - vec2(uPixel.x * 1.5, 0.0)).rgb);
    float cy = luminantie(texture2D(uVerf, vUv + vec2(0.0, uPixel.y * 1.5)).rgb) -
               luminantie(texture2D(uVerf, vUv - vec2(0.0, uPixel.y * 1.5)).rgb);
    float rand = smoothstep(0.18, 0.52, length(vec2(cx, cy)));
    vlak = mix(vlak, vec3(0.07, 0.06, 0.14), min(rand, 0.72));

    // halftoonraster in de schaduwen
    float ht = halftoon(vUv, 1.0 / uPixel, 6.0);
    float schaduw = 1.0 - smoothstep(0.10, 0.52, bl);
    vlak = mix(vlak, vlak * 0.62, step(ht, schaduw) * 0.85);

    // speedlines
    float sl = snelheidslijnen(vUv, uTijd);
    vlak = mix(vlak, vec3(1.0, 0.96, 0.86), sl * 0.32 * uSuper);
    vlak *= 1.0 + 0.05 * sin(vUv.y * 180.0 + uTijd * 40.0) * uSuper;

    kleur = mix(kleur, vlak, uSuper);
  }

  // ---- vignet + doekruis ---------------------------------------
  vec2 v = (vUv - 0.5) * vec2(1.0, 0.92);
  float vig = 1.0 - uVignet * dot(v, v) * 1.9;
  kleur *= clamp(vig, 0.0, 1.0);
  kleur += (hash12(floor(vUv / uPixel) + floor(uTijd * 12.0)) - 0.5) * 0.016;
  kleur = mix(kleur, vec3(1.0), clamp(uFlits, 0.0, 1.0));

  // ---- lineair -> sRGB -----------------------------------------
  kleur = clamp(kleur, 0.0, 1.0);
  vec3 srgb = mix(kleur * 12.92,
                  1.055 * pow(max(kleur, 1e-5), vec3(1.0 / 2.4)) - 0.055,
                  step(0.0031308, kleur));
  fragKleur = vec4(srgb, 1.0);
}
`;
