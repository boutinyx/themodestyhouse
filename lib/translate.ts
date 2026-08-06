/**
 * DETERMINISTIC product-title translation (FR/NL -> EN).
 *
 * No API, no LLM: a static word + phrase map applied at normalize time.
 * Derived by extracting the real vocabulary out of data/raw-products.json —
 * see the corpus notes at the bottom of this file.
 *
 * THE CENTRAL PROBLEM IS FALSE FRIENDS, and the architecture is built around it.
 * Applied blindly across the catalogue this map corrupts 447 English titles:
 *   rose->pink (209x)   "The Helena Top in Silver Rose"      Zora Designers
 *   robe->dress (49x)   "Luxury Satin Floral Robe - Kimono"  LumosModesty
 *   creme->cream (28x)  "FLOWER PRINT DRESS - CREME"         KIMODESTY
 *   plisse->pleated(25) "The Plisse Skirt Espresso Brown"    Diversity Modest
 *   vest->cardigan(17x) "PRINTED VEST - BROWN"               KIMODESTY
 *   gilet->cardigan(10) "ESSENTIAL LOOSE GILET DRESS"        Chador
 *   pull->sweater (8x)  "BREATHABLE PULL TIE HIJAB"          Chador
 *   chemise->shirt (3x) "Jaida Chemise Sleeves"              Jaida
 * Three gates below reduce that to ZERO. Do not remove them.
 */

/** Gate 1 — BRAND SCOPE. A title is only ever a translation candidate if its
 *  brand is declared here. 50 of the 57 brands publish in English and are
 *  never touched, which alone kills most of the collisions above.
 *
 *  Be conservative adding to this list. LES Atelier ("CLAIR PANTS", "RIKA
 *  PANTS", "EMI KIMONO") and Chador ("POPELINE BLOUSE", "GILET DRESS") look
 *  French but are English catalogues with French-derived product names —
 *  declaring them 'fr' turned "BREATHABLE PULL TIE HIJAB" into
 *  "BREATHABLE Sweater TIE HIJAB". */
export const BRAND_LANG: Record<string, 'fr' | 'nl'> = {
  'chic-modesty': 'fr',
  'whiteicy': 'fr',
  'mukistore': 'nl',
  'manzaram': 'nl',
  'noureen': 'nl',
  'hijab-boutique': 'nl',
  'lafemme': 'nl',
};

/** Gate 3 — PROPER NOUNS. Product/model names that collide with a map key.
 *  Only honoured when the token is Capitalised, because the French adjective
 *  ("gris clair") is always lowercase in this corpus while the product name
 *  ("Jupe evasee Claire") is always capitalised. */
const NAMES = new Set([
  'claire', 'marie', 'celine', 'céline', 'louise', 'jeanne', 'irene', 'elise',
  'victoria', 'marina', 'june', 'lana', 'emi', 'zina', 'dana', 'lara', 'raya',
  'milan', 'milano', 'paris', 'osaka', 'venice', 'ibiza', 'marbella',
  'tenerife', 'fuerteventura', 'salam',
]);

export const FR_PHRASES: Record<string, string> = {
  'prêt à nouer':'ready-to-tie','pret a nouer':'ready-to-tie',
  'soie de médine':'Medina silk','soie de medine':'Medina silk',
  'crêpe de corée':'Korean crepe','crepe de coree':'Korean crepe',
  'col mao':'mandarin collar','dessous de robe':'slip dress',
  'pinces anti trou':'snag-free pins','pinces anti-trou':'snag-free pins',
  'épingles hijab':'hijab pins','epingles hijab':'hijab pins',
  'pic aiguille':'needle pin','café au lait':'café au lait',
  'blanc cassé':'off-white','blanc casse':'off-white','anti trou':'snag-free',
  'à pinces':'pleated','a pinces':'pleated',
  'maille vague':'wave knit','pull maille':'knit sweater',
  'petite fille':'girls','maxi t-shirt':'maxi t-shirt','tee shirt':'t-shirt',
};
export const NL_PHRASES: Record<string, string> = {
  'wide leg':'wide-leg','v-hals':'V-neck','v hals':'V-neck',
  'ronde hals':'round neck','hoge taille':'high waist',
  'zwem turban':'swim turban','laatste kans':'last chance',
  // numeric compounds: WORD_RE only matches tokens starting with a letter,
  // so "2-delig" would otherwise survive as-is.
  '2-delig':'two-piece','2-delige':'two-piece','3-delig':'three-piece',
  '3-delige':'three-piece','2 delig':'two-piece',
};
// ---- FR -> EN ----
export const FR: Record<string, string> = {
  // garments
  robe:'dress', robes:'dresses', jupe:'skirt', jupes:'skirt', pantalon:'trousers', pantalons:'trousers',
  veste:'jacket', chemise:'shirt', chemisier:'blouse', haut:'top', tunique:'tunic', manteau:'coat',
  bonnet:'cap', cagoule:'hood', ensemble:'set', gilet:'cardigan', pull:'sweater', jogging:'joggers',
  sweat:'sweatshirt', burkini:'burkini', khimar:'khimar', abaya:'abaya', hijab:'hijab', foulard:'scarf',
  châle:'shawl', chale:'shawl', lunette:'glasses', épingles:'pins', epingles:'pins', pinces:'pins',
  aiguille:'needle', jebha:'headband', tube:'tube', hakama:'hakama', sfifa:'braid-trim', nidah:'nida', nida:'nida',
  // cut / shape
  longue:'long', longues:'long', long:'long', courte:'short', courtes:'short',
  'évasé':'flared','évasée':'flared', evasee:'flared', evase:'flared',
  'froncé':'gathered','froncée':'gathered', fronce:'gathered',
  'plissé':'pleated','plissée':'pleated', plisse:'pleated',
  ample:'relaxed', large:'wide', 'asymétrique':'asymmetric', asymetrique:'asymmetric',
  'croisé':'wrap','croisée':'wrap', 'doublé':'lined','doublée':'lined',
  'structuré':'textured','structurée':'textured','texturé':'textured','texturée':'textured',
  'satiné':'satin','satinée':'satin', 'bouclée':'boucle', 'bouclé':'boucle',
  'réversible':'reversible', reversible:'reversible', ouverte:'open', ouvert:'open',
  'fendu':'split','fendue':'split','rayé':'striped','rayée':'striped', rayures:'stripes',
  carreaux:'checked', vichy:'gingham', popeline:'poplin', 'trapèze':'A-line', ballon:'balloon',
  volants:'ruffles', volant:'ruffle', 'brodé':'embroidered','brodée':'embroidered', broderie:'embroidery',
  perles:'beaded', franges:'fringe', 'nœud':'bow', noeud:'bow', boutons:'buttons', poches:'pockets',
  ceinture:'belt', 'élastique':'elastic', manches:'sleeves', manche:'sleeve', 'épaules':'shoulders',
  col:'collar', ourlet:'hem', taille:'waist', 'doré':'gold','dorée':'gold','argenté':'silver',
  'imprimé':'print','imprimée':'print', uni:'plain', mat:'matte', 'essentielle':'essential','essentiel':'essential',
  classique:'classic', 'bohème':'bohemian', 'légère':'lightweight','léger':'lightweight',
  fluide:'fluid', respirant:'breathable', chaud:'warm', 'été':'summer', hiver:'winter',
  // fabric
  coton:'cotton', laine:'wool', soie:'silk', dentelle:'lace', velours:'velvet', maille:'knit',
  tricot:'jersey', mousseline:'chiffon', 'suédine':'suede', bambou:'bamboo', 'matière':'fabric',
  matiere:'fabric', tissu:'fabric', lin:'linen',
  // colour
  blanc:'white', blanche:'white', 'blanc cassé':'off-white', bleu:'blue', bleue:'blue',
  vert:'green', verte:'green', jaune:'yellow', gris:'grey', grise:'grey', marron:'brown',
  'marroné':'brown', rouge:'red', noir:'black', noire:'black',
  'crème':'cream', creme:'cream', chocolat:'chocolate',
  vanille:'vanilla', prune:'plum', lilas:'lilac', 'émeraude':'emerald', framboise:'raspberry',
  pistache:'pistachio', amande:'almond', sauge:'sage', noisette:'hazelnut', 'châtain':'chestnut',
  beurre:'butter', 'grège':'greige', greige:'greige', 'écru':'ecru', ivoire:'ivory',
  anthracite:'charcoal', nuit:'night', ciel:'sky', clair:'light', claire:'light',
  'foncé':'dark','foncée':'dark', 'poudré':'powder','poudrée':'powder', 'rosé':'blush', rose:'pink',
  sable:'sand', kaki:'khaki', 'émiratie':'Emirati', 'corée':'Korea',
  // function words
  'à':'', avec:'with', sans:'without', pour:'for', et:'and', en:'in', de:'', du:'', des:'',
  la:'', le:'', les:'', un:'', une:'', aux:'', au:'', 'deux':'two', 'pièces':'piece', trois:'three',
  anti:'anti', trou:'snag', dessous:'under', 'salam':'salam', jean:'denim',
  'cassé':'off-white','casse':'off-white', surchemise:'overshirt', vague:'wave',
 grenat:'garnet', 'palé':'pale', dessin:'pattern', nouer:'tie',
  minimaliste:'minimalist', militaire:'military', brut:'raw', 'pétrole':'petrol',
  petrole:'petrol', jeune:'young', fille:'girl', pic:'pin',
};
// ---- NL -> EN ----
export const NL: Record<string, string> = {
  jurk:'dress', jurken:'dresses', jurkje:'dress', blousejurk:'shirt dress', binnenjurk:'slip dress',
  onderjurk:'slip dress', rok:'skirt', rokken:'skirt', broek:'trousers', broeken:'trousers',
  jasje:'jacket', jas:'jacket', vest:'cardigan', trui:'sweater', huispak:'loungewear',
  hoofddoek:'hijab', sjaal:'scarf', khimaar:'khimar', gebedskleed:'prayer mat', heup:'hip',
  tweedelige:'two-piece', tweedelig:'two-piece', driedelige:'three-piece', '2-delig':'two-piece',
  '2-delige':'two-piece', setje:'set', twinset:'twin set',
  mouwen:'sleeves', mouw:'sleeve', splitmouwen:'split sleeves', ballonmouwen:'balloon sleeves',
  smokmouwen:'smocked sleeves', pofmouwen:'puff sleeves', omslagmanchetten:'turn-up cuffs',
  manchetten:'cuffs', kraag:'collar', hals:'neck', halssluiting:'neck fastening',
  knopen:'buttons', sierknopen:'decorative buttons', knoopsluiting:'button closure',
  knoopdetail:'button detail', sierknoopdetails:'decorative button details',
  riem:'belt', ceintuur:'belt', tailleceintuur:'waist belt', strikceintuur:'tie belt',
  gespceintuur:'buckle belt', taillekoord:'waist cord', kwastkoord:'tassel cord',
  kwastjes:'tassels', tailleband:'waistband', taille:'waist', gesp:'buckle',
  gespaccent:'buckle accent', strik:'bow', striksluiting:'bow fastening', strikdetail:'bow detail',
  rits:'zip', ritssluiting:'zip fastening', achterzak:'back pocket', borstzak:'chest pocket',
  zak:'pocket', zakken:'pockets', pijpen:'legs', achterkant:'back', rug:'back',
  capuchon:'hood', kap:'hood', plooi:'pleat', plooidetail:'pleat detail',
  geplooide:'pleated', geplooid:'pleated', ruches:'ruffles', borduring:'embroidery',
  geborduurde:'embroidered', borduursel:'embroidery', kant:'lace', kanten:'lace',
  kantdetails:'lace details', kantafwerking:'lace trim', lint:'ribbon', overslag:'wrap',
  corsetdetail:'corset detail', strepenprint:'stripe print', strependetail:'stripe detail',
  contrastdetails:'contrast details', structuur:'texture', structuurstof:'textured fabric',
  structuurdessin:'textured pattern', bloemenprint:'floral print', bladerenprint:'leaf print',
  gebloemde:'floral', geruite:'checked', gestreepte:'striped', gestreept:'striped',
  geometrische:'geometric', marmer:'marble', ornament:'ornament', barok:'baroque',
  satijnen:'satin', satijnlook:'satin-look', katoenen:'cotton', katoen:'cotton',
  katoenblend:'cotton blend', linnen:'linen', wollen:'wool', zijden:'silk',
  viscoseblend:'viscose blend', viscosemix:'viscose mix', gebreid:'knitted', gebreide:'knitted',
  fluweel:'velvet', tricot:'jersey', stof:'fabric', luchtige:'airy', soepelvallende:'fluid',
  gerimpeld:'crinkled', gesmokte:'smocked', afgewerkte:'finished', zoomranden:'hem edges',
  aangehechte:'attached', 'geïntegreerde':'integrated', geintegreerde:'integrated',
  aansluitende:'fitted', pasvorm:'fit', vaste:'fixed', dubbele:'double', halve:'half',
  ronde:'round', rechte:'straight', brede:'wide', wijde:'wide', nauwsluitend:'fitted',
  lange:'long', korte:'short', hoge:'high', lage:'low', elegante:'elegant',
  sportieve:'sporty', elastische:'elastic', goudkleurige:'gold-tone', goudkleurig:'gold-tone',
  gouden:'gold', dames:'women', vrouwen:'women', effen:'plain', vintage:'vintage',
  zwart:'black', zwarte:'black', wit:'white', witte:'white', blauw:'blue', blauwe:'blue',
  groen:'green', groene:'green', rood:'red', rode:'red', geel:'yellow', gele:'yellow',
  grijs:'grey', grijze:'grey', bruin:'brown', bruine:'brown', roze:'pink', paars:'purple',
  jogging:'joggers', dessin:'pattern', mintgroen:'mint green', legergroen:'army green',
  mosgroen:'moss green', vintagegroen:'vintage green', donkerroze:'dark pink',
  zachtroze:'soft pink', zalmroze:'salmon pink', lichtroze:'light pink',
  zilvergrijs:'silver grey', framboos:'raspberry', okergeel:'ochre', orkelgeel:'ochre',
  linnenbeige:'linen beige', koepel:'dome', splits:'slit', licht:'light',
 ribbel:'ribbed', ribble:'ribbed', sweather:'sweater',
  roomwit:'cream white', donkergrijs:'dark grey', donkerblauw:'navy', lichtgrijs:'light grey',
  waterafstotend:'water-repellent', zwemturban:'swim turban', zwem:'swim',
  zwembroek:'swim shorts', kabel:'cable', voetbalshirt:'football shirt',
  laatste:'last', kans:'chance', mouwtjes:'sleeves', 'a-lijn':'A-line',
  met:'with', van:'in', een:'', het:'', de:'', en:'and', voor:'for', zonder:'without', in:'in',
};

/** Gate 2 — PER-TITLE LANGUAGE PROOF. Brands are bilingual: Mukistore ships
 *  "Super Stretch Wide Leg Jeans" alongside "Tweedelige set met rok". A title
 *  is translated only when it PROVES it is foreign, two ways:
 *   HARD  - one word that cannot occur in an English title ("met", "jupe").
 *   SOFT  - two or more words that are French/Dutch but ALSO English. One
 *           "Robe" is an English bathrobe; "Robe ... en jean" is French. */
const HARD: Record<'fr' | 'nl', Set<string>> = {
  fr: new Set(['à','avec','sans','pour','une','des','du','aux','prêt','nouer','jupe','pantalon','veste','manches','manche','longues','évasé','évasée','froncé','froncée','plissée','cassé','soie','coton','laine','dentelle','ceinture','boutons','poches','blanche','bleue','verte','jaune','grise','marron','imprimé','brodé','tissu','matière','rayures','rayé','carreaux','épaules','amande','sauge','tunique','châle','élastique','pièces','argenté','perles','franges','nœud','volants','fendue','mao','popeline','texturé','été','respirant','médine','clair','foncé','velours','maille','tricot','col','bonnet','cagoule','dessous','epingles','épingles','pinces','framboise','chocolat','vanille','prune','lilas','noisette','beurre','suédine','bambou','emiratie','émiratie','corée','surchemise','grenat','minimaliste','militaire','jeune','fille']),
  nl: new Set(['met','van','een','het','voor','zonder','tweedelige','tweedelig','delige','delig','setje','jurk','jurkje','rok','broek','mouwen','mouw','kraag','knopen','knoopsluiting','ceintuur','tailleband','elastische','satijnen','katoenen','gebreid','gebreide','gestreepte','kant','lint','overslag','wijde','onderjurk','ritssluiting','zwarte','witte','blauwe','groene','rode','gele','grijze','bruine','lange','korte','dames','plooidetail','strik','gesp','splitmouwen','ballonmouwen','blousejurk','hals','v-hals','structuur','zijden','wollen','hoofddoek','sjaal','ruches','driedelige','geplooide','geplooid','waterafstotend','zwemturban','mouwtjes','a-lijn','geruite','gebloemde','trui','jasje','huispak','binnenjurk','taillekoord','achterzak','borstzak','pijpen','kwastjes','geborduurde','heup','roomwit','donkergrijs','mosgroen','vintagegroen','zachtroze','zalmroze','lichtroze','zilvergrijs','donkerroze','framboos','koepel','gebedskleed','mintgroen','roze','paars','rood','groen','blauw','wit','zwart','grijs','bruin','geel','okergeel','orkelgeel','legergroen','linnenbeige','licht','ribbel']),
};
const SOFT: Record<'fr' | 'nl', Set<string>> = {
  fr: new Set(['robe','robes','ensemble','chemise','haut','jean','en','col','de','la','le','les','et','du','pull','gilet','large','ample','long','longue','noir','blanc','bleu','vert','rouge','gris','rose','sable','lin','luxe','trench','crème','crepe','crêpe','plissé','plisse','mousseline','broderie','anthracite','kaki','bordeaux','camel','taupe','beige','satin','voile','polo','maxi']),
  nl: new Set(['set','top','print','vest','twinset','beige','de','en','in','split','denim','jeans','comfy','maxi','midi','blazer','abaya','khimar','khimaar','linnen','taille','detail','details','stretch','rib','viscose','luxe']),
};

const WORD_RE = /[\p{L}\p{M}][\p{L}\p{M}0-9'\u2019-]*/gu;

function tokens(s: string): string[] {
  return (s.toLowerCase().match(WORD_RE) ?? []);
}

/** True when the title proves it is written in `lang`. */
export function isForeignTitle(title: string, lang: 'fr' | 'nl'): boolean {
  let hard = 0;
  let soft = 0;
  for (const w of tokens(title)) {
    if (HARD[lang].has(w)) hard++;
    else if (SOFT[lang].has(w)) soft++;
  }
  return hard >= 1 || soft >= 2;
}

/** Unicode-safe word boundary: \b breaks on accents ("cassé"), so a naive
 *  \bblanc cassé\b never matches and you get "white off-white". */
function phraseRe(phrase: string): RegExp {
  const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{M}])${esc}(?![\\p{L}\\p{M}])`, 'giu');
}

const PHRASE_CACHE = new Map<string, RegExp>();
function cachedPhraseRe(p: string): RegExp {
  let re = PHRASE_CACHE.get(p);
  if (!re) { re = phraseRe(p); PHRASE_CACHE.set(p, re); }
  return re;
}

function matchCase(source: string, target: string): string {
  if (!target) return target;
  if (/^[\p{Lu}]/u.test(source)) return target.charAt(0).toUpperCase() + target.slice(1);
  return target;
}

const DROP = '\u0000';

/** French postposes adjectives ("robe longue"), English preposes them. A
 *  straight word-for-word pass therefore yields "Dress long". 18.9% of the
 *  French titles hit this; Dutch, being Germanic, hits it 1.7% of the time and
 *  needs no such rule. Swapping a single trailing adjective back in front of
 *  its garment noun fixes the overwhelming majority of them. */
const HEAD_NOUN = new Set(['dress','dresses','skirt','trousers','jacket','shirt','blouse','top','tunic','coat','set','cardigan','sweater','sweatshirt','overshirt','joggers','t-shirt','abaya','hijab','khimar','scarf','shawl','cape']);
const POST_ADJ = new Set(['long','short','flared','gathered','pleated','relaxed','wide','asymmetric','wrap','lined','textured','boucle','reversible','open','split','striped','checked','satin','plain','classic','bohemian','breathable','lightweight','fluid','warm','embroidered','minimalist','military','raw']);

function reorderFrench(s: string): string {
  const parts = s.split(/(\s+)/);
  for (let i = 0; i + 2 < parts.length; i += 2) {
    const a = parts[i];
    const b = parts[i + 2];
    if (!a || !b) continue;
    // don't reorder across punctuation such as " - " or " | "
    if (/[-–|,]/.test(parts[i + 1])) continue;
    if (HEAD_NOUN.has(a.toLowerCase()) && POST_ADJ.has(b.toLowerCase())) {
      parts[i] = matchCase(a, b.toLowerCase());
      parts[i + 2] = a.toLowerCase();
      i += 2;
    }
  }
  return parts.join('');
}

/**
 * Translate one product title. Returns the title UNCHANGED unless the brand is
 * declared foreign AND the title proves it is foreign.
 *
 * @param title      raw merchant title
 * @param brandSlug  used to look up BRAND_LANG
 * @param isEnglish  predicate: "is this token a normal English word?" — used
 *                   only in the weak tier, where we refuse to touch anything
 *                   that reads as English. Pass the corpus lexicon.
 */
export function translateTitle(
  title: string,
  brandSlug: string,
  isEnglish: (w: string) => boolean = () => false,
): string {
  const lang = BRAND_LANG[brandSlug];
  if (!lang) return title;

  const strong = isForeignTitle(title, lang);
  const phrases = lang === 'fr' ? FR_PHRASES : NL_PHRASES;
  const words = lang === 'fr' ? FR : NL;

  let s = title;

  // Phrases first, longest-first, so "prêt à nouer" beats "à".
  // Only in the strong tier — a lone phrase hit is not proof of language.
  if (strong) {
    for (const k of Object.keys(phrases).sort((a, b) => b.length - a.length)) {
      s = s.replace(cachedPhraseRe(k), (m) => matchCase(m, phrases[k]));
    }
  }

  s = s.replace(WORD_RE, (m) => {
    const k = m.toLowerCase();

    // Gate 3: capitalised product name wins over the dictionary.
    if (NAMES.has(k) && /^[\p{Lu}]/u.test(m)) return m;

    if (!(k in words)) {
      // "Maxi-jurk" — translate hyphen compounds part by part.
      if (k.includes('-')) {
        const parts = k.split('-');
        const ok =
          parts.length === 2 &&
          parts.every((x) => x in words || isEnglish(x)) &&
          parts.some((x) => x in words && !isEnglish(x));
        if (ok) {
          const out = parts
            .map((x) => (x in words && (strong || !isEnglish(x)) ? words[x] : x))
            .filter(Boolean)
            .join(' ');
          return matchCase(m, out);
        }
      }
      return m;
    }

    // WEAK tier: no grammatical proof, so never touch a word that is also
    // English. This is what saves "Satin", "Print", "Taupe", "Beige".
    if (!strong && isEnglish(k)) return m;

    const v = words[k];
    if (v === '') return strong ? DROP : m;
    return matchCase(m, v);
  });

  // Collapse ONLY around dropped articles, so " - " separators survive.
  s = s.replace(/\s*\u0000\s*/g, ' \u0001 ').replace(/\u0001/g, '');
  s = s.replace(/[ \t]{2,}/g, ' ').replace(/^[\s\-\u2013|]+/, '').trim();
  if (lang === 'fr' && strong) s = reorderFrench(s);
  return s;
}
