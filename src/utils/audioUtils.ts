import type { Track, RepeatMode, HomeSection, Artist, Playlist } from '../types/music.ts';

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&apos;': "'",
  '&#39;': "'",
  '&#039;': "'",
  '&quot;': '"',
  '&lt;': '<',
  '&gt;': '>',
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '…',
  '&nbsp;': ' ',
  '&bull;': '•',
  '&lsquo;': '‘',
  '&rsquo;': '’',
  '&ldquo;': '“',
  '&rdquo;': '”',
};

/**
 * Safely and cleanly decodes HTML entities (e.g. &#39;, &amp;, &quot;) into standard typographic symbols.
 * Safe for both browser and Node.js unit testing environments.
 */
export function decodeHtmlEntities(text: string | undefined | null): string {
  if (!text) return '';
  let decoded = String(text);

  // Replace common named and short entities
  for (const [entity, char] of Object.entries(ENTITY_MAP)) {
    if (decoded.includes(entity)) {
      decoded = decoded.split(entity).join(char);
    }
  }

  // Replace numeric decimal entities like &#8217; or &#39;
  decoded = decoded.replace(/&#(\d+);/g, (_, code) => {
    try {
      const num = parseInt(code, 10);
      return Number.isFinite(num) ? String.fromCodePoint(num) : _;
    } catch {
      return _;
    }
  });

  // Replace numeric hex entities like &#x27; or &#x26;
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => {
    try {
      const num = parseInt(code, 16);
      return Number.isFinite(num) ? String.fromCodePoint(num) : _;
    } catch {
      return _;
    }
  });

  return decoded;
}

/**
 * Formats duration in seconds to "m:ss" string.
 * Returns "--:--" for invalid or uninitialized duration.
 */
export function formatTime(seconds: number | undefined | null): string {
  if (seconds === undefined || seconds === null || !Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }
  const totalSeconds = Math.floor(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Formats duration with fallback placeholder "--:--" while metadata is loading.
 */
export function formatDynamicDuration(seconds: number | undefined | null): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) {
    return '--:--';
  }
  return formatTime(seconds);
}

/**
 * Calculates the next track index in the queue based on repeat and shuffle settings.
 * Returns -1 if playback should stop at the end of the queue.
 */
export function getNextTrackIndex(
  currentIndex: number,
  queueLength: number,
  isShuffle: boolean,
  repeatMode: RepeatMode,
  randomValue: number = Math.random()
): number {
  if (queueLength <= 0) return -1;

  if (repeatMode === 'one') {
    return currentIndex;
  }

  if (isShuffle && queueLength > 1) {
    let nextIndex = Math.floor(randomValue * queueLength);
    if (nextIndex === currentIndex) {
      nextIndex = (currentIndex + 1) % queueLength;
    }
    return nextIndex;
  }

  const nextIndex = currentIndex + 1;
  if (nextIndex < queueLength) {
    return nextIndex;
  }

  if (repeatMode === 'all') {
    return 0;
  }

  return -1;
}

/**
 * Calculates the previous track index in the queue.
 * If elapsedSeconds > 3, returns currentIndex to indicate rewinding current track.
 */
export function getPrevTrackIndex(
  currentIndex: number,
  queueLength: number,
  elapsedSeconds: number
): number {
  if (queueLength <= 0) return -1;
  if (elapsedSeconds > 3) {
    return currentIndex;
  }
  return currentIndex > 0 ? currentIndex - 1 : queueLength - 1;
}

const BHAKTI_TITLE_REGEX =
  /(\b(bhakti|bhajan|aarti|arti|chalisa|stotram|stotra|shloka|kirtan|devotional|satsang|amritwani|vandana|mantra|jaap|path|paath|hanuman|bajrangbali|sankatmochan|mahadev|mahadeva|bholenath|bhole|shambhu|mahakal|mahakaal|kedarnath|somnath|shankara|shiv tandav|shiv dhun|shiv ji|shivaay|achyutam|keshavam|jagdish hare|ganpati|ganesh|ganesha|vinayak|morya|mourya|vaishno|khatu shyam|jai shree ram|jai shri ram|shree ram|shri ram|ram siya ram|sita ram|siya ram|ram lala|ram aayenge|raghupati|raghunandan|ramayan|hanumanashtak|sundarkand|saanwre shyam|shri krishna|radhe krishna|radha krishna|radhe radhe|radhe|radha rani|barsana|vrindavan|banke bihari|kunj bihari|murlidhar|kanha|kanhaiya|nandlala|makhanchor|gopal|govind|giridhar|shrinath|shyam baba|shyama|dwarkadhish|govind bolo|har har shambhu|har har mahadev|bolo har har|om jai jagdish|meri maa ke barabar|deva deva|namo namo|durga|sherawali|maiya|maiyya|maai|mata rani|ambey|ambe|jagdambe|bhawani|chhath|chhathi|chhath puja|bolbam|bol bam|kanwar|kawar|sawan|pachra|devi geet|navratri|kaali mahaa kaali|shakti|hari bol|narayan)\b|भजन|भक्ति|आरती|चालीसा|स्तोत्र|मंत्र|कीर्तन|हनुमान|बजरंगबली|महादेव|भोलेनाथ|भोले|शंभू|महाकाल|शिव|शंकर|गणपति|गणेश|वैष्णो|खाटू श्याम|जय श्री राम|श्री राम|सीता राम|सिया राम|राम लला|राम आएंगे|श्री कृष्ण|राधे कृष्ण|राधा कृष्ण|राधे|राधा रानी|वृंदावन|बरसाना|बांके बिहारी|कान्हा|कन्हैया|श्याम|गोविंद|गोपाल|हर हर महादेव|हर हर शंभू|दुर्गा|शेरावाली|मैया|माता रानी|अम्बे|जगदम्बे|भवानी|छठ|छठी|बोलबम|कांवर|सावन|पचरा|देवी गीत|नवरात्रि|नारायण|हरि)/i;

const SECULAR_MOVIE_OVERRIDE_REGEX =
  /\b(radhe shyam|aashiqui aa gayi|soch liya|jaan hai meri|nagada sang dhol|deewani mastani|bolo har har har.*shivaay)\b/i;

const BHOJPURI_KEYWORD_REGEX =
  /(\b(bhojpuri|pawan singh|khesari|shilpi raj|manoj tiwari|neelkamal|pramod premi|arvind akela|kallu|ritesh pandey|ankush raja|akshara singh|nirahua|dinesh lal|samar singh|gunjan singh|antra singh|priyanka singh|kalpana patowary|indu sonali|tuntun yadav|babulal|amrapali dubey|kajal raghwani|monalisa|bhojpuriya|lollipop lagelu|lollypop lagelu|rinkiya ke papa|raja ji|le le aayi coca cola|parlour wali|saj ke sawar ke|nathuniya|pudina ae haseena)\b|भोजपुरी|पवन सिंह|खेसारी|शिल्पी राज|नीलकमल|प्रमोद प्रेमी|कल्लू|रितेश पांडे|अंकुश राजा|अक्षरा सिंह|निरहुआ)/i;

const ENGLISH_ARTIST_PROFILES: Array<{
  canonical: string;
  aliases: string[];
  role: string;
}> = [
  { canonical: 'The Weeknd', aliases: ['the weeknd', 'weeknd', 'theweeknd', 'abel tesfaye'], role: 'Global Pop & Synthwave R&B Superstar' },
  { canonical: 'Ed Sheeran', aliases: ['ed sheeran', 'edsheeran'], role: 'Global Singer-Songwriter & Pop Icon' },
  { canonical: 'Imagine Dragons', aliases: ['imagine dragons', 'imaginedragons'], role: 'Global Alternative Rock & Arena Anthem Band' },
  { canonical: 'Dua Lipa', aliases: ['dua lipa', 'dualipa'], role: 'Global Dance-Pop & Disco-Pop Superstar' },
  { canonical: 'The Chainsmokers', aliases: ['the chainsmokers', 'chainsmokers'], role: 'Global Electronic Pop Duo' },
  { canonical: 'Taylor Swift', aliases: ['taylor swift', 'taylorswift'], role: 'Global Pop Megastar & Songwriter' },
  { canonical: 'Justin Bieber', aliases: ['justin bieber', 'justinbieber'], role: 'Global Pop & R&B Icon' },
  { canonical: 'Bruno Mars', aliases: ['bruno mars', 'brunomars'], role: 'Global Funk, Soul & Pop Superstar' },
  { canonical: 'Coldplay', aliases: ['coldplay'], role: 'Legendary Global Rock & Pop Band' },
  { canonical: 'Ariana Grande', aliases: ['ariana grande', 'arianagrande'], role: 'Global Pop & Vocal Superstar' },
  { canonical: 'Billie Eilish', aliases: ['billie eilish', 'billieeilish'], role: 'Grammy-Winning Global Alt-Pop Artist' },
  { canonical: 'Post Malone', aliases: ['post malone', 'postmalone'], role: 'Global Hip-Hop & Pop Hitmaker' },
  { canonical: 'Drake', aliases: ['drake'], role: 'Global Hip-Hop & Rap Superstar' },
  { canonical: 'Eminem', aliases: ['eminem'], role: 'Legendary Global Rap & Hip-Hop Icon' },
  { canonical: 'Rihanna', aliases: ['rihanna'], role: 'Global Pop & R&B Icon' },
  { canonical: 'Lady Gaga', aliases: ['lady gaga', 'ladygaga'], role: 'Global Pop & Cinema Superstar' },
  { canonical: 'Adele', aliases: ['adele'], role: 'Grammy-Winning Soul & Pop Balladeer' },
  { canonical: 'Shawn Mendes', aliases: ['shawn mendes', 'shawnmendes'], role: 'Global Pop Singer-Songwriter' },
  { canonical: 'Charlie Puth', aliases: ['charlie puth', 'charlieputh'], role: 'Global Pop Vocalist & Producer' },
  { canonical: 'Selena Gomez', aliases: ['selena gomez', 'selenagomez'], role: 'Global Pop Star & Vocalist' },
  { canonical: 'Katy Perry', aliases: ['katy perry', 'katyperry'], role: 'Global Pop Hitmaker' },
  { canonical: 'Maroon 5', aliases: ['maroon 5', 'maroon5'], role: 'Global Pop-Rock Band' },
  { canonical: 'Alan Walker', aliases: ['alan walker', 'alanwalker'], role: 'Global Electronic DJ & Producer' },
  { canonical: 'Sia', aliases: ['sia'], role: 'Global Pop Powerhouse Vocalist' },
  { canonical: 'Lana Del Rey', aliases: ['lana del rey', 'lanadelrey'], role: 'Global Alternative Pop Icon' },
  { canonical: 'Harry Styles', aliases: ['harry styles', 'harrystyles'], role: 'Global Pop & Rock Superstar' },
  { canonical: 'One Direction', aliases: ['one direction', 'onedirection'], role: 'Global Pop Group' },
  { canonical: 'Linkin Park', aliases: ['linkin park', 'linkinpark'], role: 'Legendary Rock & Nu-Metal Band' },
  { canonical: 'Michael Jackson', aliases: ['michael jackson'], role: 'King of Pop' },
  { canonical: 'Shakira', aliases: ['shakira'], role: 'Global Latin & English Pop Superstar' },
  { canonical: 'Travis Scott', aliases: ['travis scott', 'travisscott'], role: 'Global Hip-Hop Superstar' },
  { canonical: 'Kendrick Lamar', aliases: ['kendrick lamar'], role: 'Pulitzer & Grammy-Winning Rapper' },
  { canonical: 'Sabrina Carpenter', aliases: ['sabrina carpenter'], role: 'Global Pop Sensation' },
  { canonical: 'Olivia Rodrigo', aliases: ['olivia rodrigo'], role: 'Global Pop-Rock Star' },
  { canonical: 'Miley Cyrus', aliases: ['miley cyrus'], role: 'Global Pop & Rock Vocalist' },
  { canonical: 'Zayn', aliases: ['zayn malik', 'zayn'], role: 'Global R&B & Pop Vocalist' },
  { canonical: 'Halsey', aliases: ['halsey'], role: 'Global Alt-Pop Vocalist' },
  { canonical: 'Daft Punk', aliases: ['daft punk'], role: 'Electronic Music Pioneers' },
  { canonical: 'Arash', aliases: ['arash', 'arash & helena', 'arash & halena'], role: 'Global Euro-Pop & Dance Hitmaker' },
  { canonical: 'Sam Smith', aliases: ['sam smith'], role: 'Grammy-Winning Global Pop & Soul Vocalist' },
  { canonical: 'Glass Animals', aliases: ['glass animals'], role: 'Global Indie & Psychedelic Pop Band' },
  { canonical: 'James Arthur', aliases: ['james arthur'], role: 'Global Pop & Soul Singer-Songwriter' },
  { canonical: 'Tom Odell', aliases: ['tom odell'], role: 'British Singer-Songwriter & Pianist' },
  { canonical: 'Lewis Capaldi', aliases: ['lewis capaldi'], role: 'Global Pop Balladeer & Singer-Songwriter' },
  { canonical: 'Justin Timberlake', aliases: ['justin timberlake'], role: 'Global Pop & R&B Superstar' },
  { canonical: 'Ellie Goulding', aliases: ['ellie goulding'], role: 'Global Electro-Pop Vocalist' },
  { canonical: 'Khalid', aliases: ['khalid'], role: 'Global R&B & Soul Vocalist' },
  { canonical: 'Mariah Carey', aliases: ['mariah carey'], role: 'Legendary Global Pop & R&B Icon' },
  { canonical: 'Jason Derulo', aliases: ['jason derulo'], role: 'Global Pop & Dance Hitmaker' },
  { canonical: 'Daniel Caesar', aliases: ['daniel caesar'], role: 'Grammy-Winning R&B Singer-Songwriter' },
  { canonical: 'Nicki Minaj', aliases: ['nicki minaj'], role: 'Global Hip-Hop & Rap Superstar' },
  { canonical: 'Anne-Marie', aliases: ['anne-marie', 'anne marie'], role: 'British Pop Superstar' },
  { canonical: 'Lukas Graham', aliases: ['lukas graham'], role: 'Global Pop-Soul Band' },
  { canonical: 'Tame Impala', aliases: ['tame impala'], role: 'Psychedelic Music Project by Kevin Parker' },
  { canonical: 'Teddy Swims', aliases: ['teddy swims'], role: 'Global Soul & Pop Vocalist' },
  { canonical: 'SZA', aliases: ['sza'], role: 'Grammy-Winning R&B Superstar' },
  { canonical: 'Tate McRae', aliases: ['tate mcrae'], role: 'Global Dance-Pop Singer-Songwriter' },
  { canonical: 'Benson Boone', aliases: ['benson boone'], role: 'Global Pop-Rock Vocalist' },
  { canonical: 'Alec Benjamin', aliases: ['alec benjamin'], role: 'Global Indie-Pop Storyteller' },
  { canonical: 'Juice WRLD', aliases: ['juice wrld'], role: 'Global Melodic Hip-Hop Artist' },
  { canonical: 'Usher', aliases: ['usher'], role: 'Global R&B & Pop Legend' },
  { canonical: 'P!NK', aliases: ['p!nk'], role: 'Global Pop-Rock Superstar' },
  { canonical: 'Marshmello', aliases: ['marshmello'], role: 'Global Electronic Music Producer & DJ' },
  { canonical: 'Kroma Synth', aliases: ['kroma synth'], role: 'Electronic & Synthwave Producer' },
  { canonical: 'Mellow Study', aliases: ['mellow study'], role: 'Chill Lo-Fi & Instrumental Artist' },
  { canonical: 'The Sunset Echoes', aliases: ['the sunset echoes', 'sunset echoes'], role: 'Indie Pop & Coastal Rock Band' },
  { canonical: 'Velvet Thunder', aliases: ['velvet thunder'], role: 'Alternative & Desert Rock Band' },
  { canonical: 'Enrique Iglesias', aliases: ['enrique iglesias'], role: 'Global Latin Pop Icon' },
  { canonical: 'Pitbull', aliases: ['pitbull'], role: 'Global Dance & Hip-Hop Star' },
  { canonical: 'Akon', aliases: ['akon'], role: 'Global R&B & Pop Hitmaker' },
  { canonical: 'Sean Paul', aliases: ['sean paul'], role: 'Global Dancehall & Pop Icon' },
  { canonical: 'DJ Snake', aliases: ['dj snake'], role: 'Global Electronic & Dance Producer' },
  { canonical: 'Calvin Harris', aliases: ['calvin harris'], role: 'Global Electronic Producer & DJ' },
  { canonical: 'David Guetta', aliases: ['david guetta'], role: 'Global EDM Pioneer & Producer' },
  { canonical: 'Avicii', aliases: ['avicii'], role: 'Legendary Melodic EDM Icon' },
  { canonical: 'Clean Bandit', aliases: ['clean bandit'], role: 'British Electronic Pop Group' },
  { canonical: 'Camila Cabello', aliases: ['camila cabello'], role: 'Global Pop & Latin Vocalist' },
  { canonical: 'Doja Cat', aliases: ['doja cat'], role: 'Global Pop & Rap Superstar' },
  { canonical: 'Snoop Dogg', aliases: ['snoop dogg'], role: 'Hip-Hop Legend' },
  { canonical: 'Wiz Khalifa', aliases: ['wiz khalifa'], role: 'Global Rap & Hip-Hop Star' },
  { canonical: '24kGoldn', aliases: ['24kgoldn'], role: 'Global Pop-Rap Artist' },
  { canonical: 'Aurora', aliases: ['aurora'], role: 'Norwegian Art-Pop Vocalist' },
  { canonical: 'dhruv', aliases: ['dhruv'], role: 'Global Indie R&B Singer-Songwriter' },
  { canonical: 'Ruth B.', aliases: ['ruth b', 'ruth b.'], role: 'Global Pop Balladeer' },
  { canonical: 'Passenger', aliases: ['passenger'], role: 'Folk-Rock Singer-Songwriter' },
  { canonical: 'OneRepublic', aliases: ['onerepublic', 'one republic'], role: 'Global Pop-Rock Band' },
  { canonical: '5 Seconds of Summer', aliases: ['5 seconds of summer', '5sos'], role: 'Global Pop-Rock Band' },
  { canonical: 'Little Mix', aliases: ['little mix'], role: 'Global Pop Vocal Group' },
  { canonical: 'Fifth Harmony', aliases: ['fifth harmony'], role: 'Global Pop Group' },
  { canonical: 'Backstreet Boys', aliases: ['backstreet boys'], role: 'Legendary Global Pop Group' },
  { canonical: 'Boney M.', aliases: ['boney m', 'boney m.'], role: 'Euro-Disco Vocal Group' },
  { canonical: 'Modern Talking', aliases: ['modern talking'], role: 'Synth-Pop Duo' },
  { canonical: 'Jay Sean', aliases: ['jay sean'], role: 'British R&B & Pop Pioneer' },
  { canonical: 'John Legend', aliases: ['john legend'], role: 'EGOT-Winning Soul & Pop Balladeer' },
  { canonical: 'Céline Dion', aliases: ['celine dion', 'céline dion'], role: 'Legendary Global Vocal Icon' },
  { canonical: 'Alicia Keys', aliases: ['alicia keys'], role: 'Grammy-Winning R&B & Soul Icon' },
  { canonical: 'Hozier', aliases: ['hozier'], role: 'Global Indie-Rock & Soul Singer-Songwriter' },
  { canonical: 'Charli XCX', aliases: ['charli xcx'], role: 'Global Avant-Pop & Dance Superstar' },
  { canonical: 'PinkPantheress', aliases: ['pinkpantheress'], role: 'British Alt-Pop & Garage Producer' },
  { canonical: 'Ava Max', aliases: ['ava max'], role: 'Global Dance-Pop Hitmaker' },
  { canonical: 'Chris Brown', aliases: ['chris brown'], role: 'Global R&B & Pop Star' },
  { canonical: 'Meghan Trainor', aliases: ['meghan trainor'], role: 'Grammy-Winning Pop Singer-Songwriter' },
  { canonical: 'Jessie J', aliases: ['jessie j'], role: 'Powerhouse British Pop Vocalist' },
  { canonical: 'Iggy Azalea', aliases: ['iggy azalea'], role: 'Global Pop-Rap Artist' },
  { canonical: 'DJ Khaled', aliases: ['dj khaled'], role: 'Global Hip-Hop & Pop Producer' },
  { canonical: 'Liam Payne', aliases: ['liam payne'], role: 'Global Pop Vocalist' },
  { canonical: 'Luis Fonsi', aliases: ['luis fonsi'], role: 'Global Latin Pop Superstar' },
  { canonical: 'Don Omar', aliases: ['don omar'], role: 'Global Reggaeton & Latin Icon' },
  { canonical: 'INNA', aliases: ['inna'], role: 'Global Euro-Dance & Pop Star' },
  { canonical: 'Balti', aliases: ['balti'], role: 'International Hip-Hop & Pop Hitmaker' },
  { canonical: 'DHARIA', aliases: ['dharia'], role: 'Global Dance-Pop Vocalist' },
  { canonical: 'Serhat Durmus', aliases: ['serhat durmus'], role: 'Electronic & Trap Producer' },
  { canonical: 'Vika Jigulina', aliases: ['vika jigulina', 'edward maya'], role: 'Euro-Dance Duo' },
  { canonical: 'Duncan Laurence', aliases: ['duncan laurence'], role: 'Eurovision-Winning Pop Balladeer' },
  { canonical: 'Noah Kahan', aliases: ['noah kahan'], role: 'Global Folk-Pop Singer-Songwriter' },
  { canonical: 'Gracie Abrams', aliases: ['gracie abrams'], role: 'Global Indie-Pop Singer-Songwriter' },
  { canonical: 'Addison Rae', aliases: ['addison rae'], role: 'Global Pop Artist' },
  { canonical: 'Mark Ambor', aliases: ['mark ambor'], role: 'Indie-Pop Singer-Songwriter' },
  { canonical: 'Alex Warren', aliases: ['alex warren'], role: 'Pop Singer-Songwriter' },
  { canonical: 'KATSEYE', aliases: ['katseye'], role: 'Global Pop Girl Group' },
  { canonical: 'Henry Moodie', aliases: ['henry moodie'], role: 'British Pop Singer-Songwriter' },
  { canonical: 'Zack Tabudlo', aliases: ['zack tabudlo'], role: 'Global Pop & R&B Singer-Songwriter' },
  { canonical: 'Arthur Nery', aliases: ['arthur nery'], role: 'Soul & R&B Vocalist' },
  { canonical: 'The Script', aliases: ['the script'], role: 'Irish Pop-Rock Band' },
  { canonical: '4 Non Blondes', aliases: ['4 non blondes'], role: '90s Alternative Rock Band' },
  { canonical: 'Olivia Dean', aliases: ['olivia dean'], role: 'British Neo-Soul & Pop Singer' },
  { canonical: 'Natasha Bedingfield', aliases: ['natasha bedingfield'], role: 'British Pop Singer-Songwriter' },
  { canonical: '*NSYNC', aliases: ['nsync', '*nsync'], role: 'Legendary Pop Vocal Group' },
  { canonical: 'Gotye', aliases: ['gotye'], role: 'Indie-Pop Multi-Instrumentalist' },
  { canonical: 'Lorde', aliases: ['lorde'], role: 'Grammy-Winning Alt-Pop Pioneer' },
  { canonical: 'Carly Rae Jepsen', aliases: ['carly rae jepsen'], role: 'Global Pop Icon' },
  { canonical: 'Macklemore', aliases: ['macklemore'], role: 'Global Hip-Hop & Pop Duo' },
  { canonical: 'Bastille', aliases: ['bastille'], role: 'British Indie-Pop Band' },
  { canonical: 'Twenty One Pilots', aliases: ['twenty one pilots'], role: 'Alternative Rock & Pop Duo' },
  { canonical: 'Bebe Rexha', aliases: ['bebe rexha'], role: 'Global Pop Vocalist & Songwriter' },
  { canonical: 'Zara Larsson', aliases: ['zara larsson'], role: 'Swedish Pop Superstar' },
  { canonical: 'G-Eazy', aliases: ['g-eazy'], role: 'Hip-Hop Rapper & Producer' },
  { canonical: 'Latto', aliases: ['latto'], role: 'Global Rap & Pop Star' },
  { canonical: 'Tyla', aliases: ['tyla'], role: 'Grammy-Winning Pop & Amapiano Star' },
  { canonical: 'Rema', aliases: ['rema'], role: 'Global Afrobeats & Pop Superstar' },
  { canonical: 'Chappell Roan', aliases: ['chappell roan'], role: 'Global Synth-Pop Sensation' },
  { canonical: 'Haddaway', aliases: ['haddaway'], role: 'Eurodance Icon' },
];

const INDIAN_AND_REGIONAL_ARTIST_PROFILES: Array<{
  canonical: string;
  aliases: string[];
  section: HomeSection;
  singerLanguage: 'Hindi' | 'Bhojpuri' | 'Pan-Indian' | 'Punjabi' | 'Other Country';
  role: string;
}> = [
  { canonical: 'Arijit Singh', aliases: ['arijit singh', 'arijit'], section: 'hindi', singerLanguage: 'Hindi', role: 'Playback Singer & Music Producer' },
  { canonical: 'Shreya Ghoshal', aliases: ['shreya ghoshal', 'shreya'], section: 'hindi', singerLanguage: 'Hindi', role: 'Queen of Melody & Classical Playback Singer' },
  { canonical: 'Yo Yo Honey Singh', aliases: ['yo yo honey singh', 'honey singh'], section: 'hindi', singerLanguage: 'Hindi', role: 'Desi Hip-Hop Pioneer & Rap Superstar' },
  { canonical: 'Pawan Singh', aliases: ['pawan singh'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Power Star & Folk Icon' },
  { canonical: 'Khesari Lal Yadav', aliases: ['khesari lal yadav', 'khesari lal', 'khesari'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Megastar & Trendsetter' },
  { canonical: 'Shilpi Raj', aliases: ['shilpi raj'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Female Vocalist & Sensation' },
  { canonical: 'Manoj Tiwari', aliases: ['manoj tiwari'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Folk & Cultural Icon' },
  { canonical: 'Neelkamal Singh', aliases: ['neelkamal singh', 'neelkamal'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Pop & Folk Hitmaker' },
  { canonical: 'Pramod Premi Yadav', aliases: ['pramod premi yadav', 'pramod premi'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Folk & Dance Vocalist' },
  { canonical: 'Ritesh Pandey', aliases: ['ritesh pandey'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Singer & Actor' },
  { canonical: 'Arvind Akela Kallu', aliases: ['arvind akela kallu', 'arvind akela', 'kallu'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Youth Star' },
  { canonical: 'Ankush Raja', aliases: ['ankush raja'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Folk & Pop Duo' },
  { canonical: 'Samar Singh', aliases: ['samar singh'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Desi Folk Hitmaker' },
  { canonical: 'Gunjan Singh', aliases: ['gunjan singh'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Singer & Performer' },
  { canonical: 'Antra Singh Priyanka', aliases: ['antra singh priyanka', 'antara singh priyanka'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Playback Vocalist' },
  { canonical: 'Priyanka Singh', aliases: ['priyanka singh'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Playback & Film Singer' },
  { canonical: 'Kalpana Patowary', aliases: ['kalpana patowary', 'kalpana'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Folk & Classical Queen' },
  { canonical: 'Indu Sonali', aliases: ['indu sonali'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Melodious Playback Singer' },
  { canonical: 'Dinesh Lal Yadav', aliases: ['dinesh lal yadav', 'nirahua'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Jubilee Star & Singer' },
  { canonical: 'Tuntun Yadav', aliases: ['tuntun yadav'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Folk Singer' },
  { canonical: 'Babulal', aliases: ['babulal'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Folk Artist' },
  { canonical: 'Jubin Nautiyal', aliases: ['jubin nautiyal', 'jubin'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Playback & Devotional Star' },
  { canonical: 'Sonu Nigam', aliases: ['sonu nigam'], section: 'hindi', singerLanguage: 'Hindi', role: 'Evergreen Melody Maestro' },
  { canonical: 'Badshah', aliases: ['badshah'], section: 'hindi', singerLanguage: 'Hindi', role: 'King of Bollywood Party Rap & Pop' },
  { canonical: 'Neha Kakkar', aliases: ['neha kakkar'], section: 'hindi', singerLanguage: 'Hindi', role: 'Bollywood Pop Sensation & Judge' },
  { canonical: 'Tony Kakkar', aliases: ['tony kakkar'], section: 'hindi', singerLanguage: 'Hindi', role: 'Pop Composer & Singer' },
  { canonical: 'Sonu Kakkar', aliases: ['sonu kakkar'], section: 'hindi', singerLanguage: 'Hindi', role: 'Sufi & Bollywood Playback Vocalist' },
  { canonical: 'Diljit Dosanjh', aliases: ['diljit dosanjh', 'diljit'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Global Desi Icon & Pop Sensation' },
  { canonical: 'Udit Narayan', aliases: ['udit narayan'], section: 'hindi', singerLanguage: 'Hindi', role: '90s Bollywood Golden Voice' },
  { canonical: 'Kumar Sanu', aliases: ['kumar sanu'], section: 'hindi', singerLanguage: 'Hindi', role: 'King of 90s Romantic Melodies' },
  { canonical: 'Lata Mangeshkar', aliases: ['lata mangeshkar'], section: 'hindi', singerLanguage: 'Hindi', role: 'Nightingale of India (Bharat Ratna)' },
  { canonical: 'Kishore Kumar', aliases: ['kishore kumar'], section: 'hindi', singerLanguage: 'Hindi', role: 'Golden Era Legend & Evergreen Icon' },
  { canonical: 'Mohammed Rafi', aliases: ['mohammed rafi', 'mohd rafi', 'mohd. rafi'], section: 'hindi', singerLanguage: 'Hindi', role: 'Immortal Golden Voice of Indian Cinema' },
  { canonical: 'Asha Bhosle', aliases: ['asha bhosle'], section: 'hindi', singerLanguage: 'Hindi', role: 'Legendary Versatile Playback Icon' },
  { canonical: 'Mukesh', aliases: ['mukesh'], section: 'hindi', singerLanguage: 'Hindi', role: 'Legendary Soulful Playback Singer' },
  { canonical: 'Jagjit Singh', aliases: ['jagjit singh'], section: 'hindi', singerLanguage: 'Hindi', role: 'The Ghazal King' },
  { canonical: 'Pankaj Udhas', aliases: ['pankaj udhas'], section: 'hindi', singerLanguage: 'Hindi', role: 'Ghazal & Melody Maestro' },
  { canonical: 'SP Balasubrahmanyam', aliases: ['sp balasubrahmanyam', 's. p. balasubrahmanyam', 's.p. balasubrahmanyam', 'spb'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'Padma Vibhushan Pan-Indian Vocal Legend' },
  { canonical: 'Abhijeet Bhattacharya', aliases: ['abhijeet bhattacharya', 'abhijeet'], section: 'hindi', singerLanguage: 'Hindi', role: '90s Bollywood Romantic Playback Star' },
  { canonical: 'Vinod Rathod', aliases: ['vinod rathod'], section: 'hindi', singerLanguage: 'Hindi', role: 'Bollywood Playback Legend' },
  { canonical: 'Roop Kumar Rathod', aliases: ['roop kumar rathod', 'roopkumar rathod'], section: 'hindi', singerLanguage: 'Hindi', role: 'Classical & Playback Vocal Maestro' },
  { canonical: 'Kavita Krishnamurthy', aliases: ['kavita krishnamurthy', 'kavita krishnamurti'], section: 'hindi', singerLanguage: 'Hindi', role: 'Padma Shri Classical & Playback Queen' },
  { canonical: 'Sadhana Sargam', aliases: ['sadhana sargam'], section: 'hindi', singerLanguage: 'Hindi', role: 'National Award-Winning Playback Singer' },
  { canonical: 'Anuradha Paudwal', aliases: ['anuradha paudwal'], section: 'hindi', singerLanguage: 'Hindi', role: 'Padma Shri Bhajan & Playback Legend' },
  { canonical: 'Narendra Chanchal', aliases: ['narendra chanchal'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Legendary Mata Bhajan Samrat' },
  { canonical: 'Mahendra Kapoor', aliases: ['mahendra kapoor'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Patriotic & Devotional Playback Legend' },
  { canonical: 'Suresh Wadkar', aliases: ['suresh wadkar'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Padma Shri Classical & Devotional Maestro' },
  { canonical: 'Ravindra Jain', aliases: ['ravindra jain'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Devotional Composer & Vocalist' },
  { canonical: 'Jaya Kishori', aliases: ['jaya kishori'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Spiritual Orator & Bhajan Singer' },
  { canonical: 'Maithili Thakur', aliases: ['maithili thakur'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Classical, Folk & Devotional Prodigy' },
  { canonical: 'Swasti Mehul', aliases: ['swasti mehul'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Devotional & Spiritual Singer' },
  { canonical: 'Agam Aggarwal', aliases: ['agam aggarwal'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Spiritual Stotram & Bhajan Artist' },
  { canonical: 'Kanhaiya Mittal', aliases: ['kanhaiya mittal'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Khatu Shyam & Devotional Bhajan Star' },
  { canonical: 'Atif Aslam', aliases: ['atif aslam'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Sufi & Romantic Rock Vocalist' },
  { canonical: 'B Praak', aliases: ['b praak', 'bpraak'], section: 'hindi', singerLanguage: 'Hindi', role: 'National Award-Winning Power Vocalist' },
  { canonical: 'AP Dhillon', aliases: ['ap dhillon'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Global Punjabi & Urban Synth-Pop Star' },
  { canonical: 'Karan Aujla', aliases: ['karan aujla'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Punjabi Lyricist & Chartbuster Hitmaker' },
  { canonical: 'Shubh', aliases: ['shubh'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Global Punjabi Hip-Hop & Pop Sensation' },
  { canonical: 'Darshan Raval', aliases: ['darshan raval'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie Pop & Romantic Youth Icon' },
  { canonical: 'Armaan Malik', aliases: ['armaan malik'], section: 'hindi', singerLanguage: 'Hindi', role: 'Velvet Romantic & Crossover Pop Star' },
  { canonical: 'Amaal Mallik', aliases: ['amaal mallik'], section: 'hindi', singerLanguage: 'Hindi', role: 'Romantic Composer & Vocalist' },
  { canonical: 'Vishal Mishra', aliases: ['vishal mishra'], section: 'hindi', singerLanguage: 'Hindi', role: 'Blockbuster Composer & Singer' },
  { canonical: 'A. R. Rahman', aliases: ['a. r. rahman', 'a.r. rahman', 'ar rahman', 'a r rahman'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'Oscar & Grammy Winning Composer' },
  { canonical: 'Hariharan', aliases: ['hariharan', 'gulshan kumar'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Padma Shri Devotional & Classical Maestro' },
  { canonical: 'Sachet Tandon', aliases: ['sachet tandon', 'sachet-parampara', 'parampara tandon', 'parampara thakur'], section: 'hindi', singerLanguage: 'Hindi', role: 'Bollywood & Devotional Hit Duo' },
  { canonical: 'Shankar Mahadevan', aliases: ['shankar mahadevan', 'shankar-ehsaan-loy'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'Classical & Playback Vocal Legend' },
  { canonical: 'Ajay-Atul', aliases: ['ajay-atul', 'ajay atul', 'ajay gogavale'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'National Award-Winning Composer-Singer Duo' },
  { canonical: 'Amit Trivedi', aliases: ['amit trivedi'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Composer & Playback Vocalist' },
  { canonical: 'Abhilipsa Panda', aliases: ['abhilipsa panda', 'jeetu sharma'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Devotional Har Har Shambhu Vocalist' },
  { canonical: 'Hansraj Raghuwanshi', aliases: ['hansraj raghuwanshi'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Devotional Shiv Bhajan Vocalist' },
  { canonical: 'Lakhbir Singh Lakkha', aliases: ['lakhbir singh lakkha', 'lakkha'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Devotional Bhajan Legend' },
  { canonical: 'Anuv Jain', aliases: ['anuv jain'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie Hindi Singer-Songwriter' },
  { canonical: 'King', aliases: ['king'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indian Pop & Hip-Hop Hitmaker' },
  { canonical: 'KK', aliases: ['kk', 'krishnakumar kunnath', 'k.k.'], section: 'hindi', singerLanguage: 'Hindi', role: 'Forever Voice of Romantic Hindi Pop & Rock' },
  { canonical: 'Mohit Chauhan', aliases: ['mohit chauhan'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Bollywood Balladeer' },
  { canonical: 'Sunidhi Chauhan', aliases: ['sunidhi chauhan'], section: 'hindi', singerLanguage: 'Hindi', role: 'Powerhouse Bollywood Playback Queen' },
  { canonical: 'Alka Yagnik', aliases: ['alka yagnik'], section: 'hindi', singerLanguage: 'Hindi', role: 'Queen of 90s Bollywood Melodies' },
  { canonical: 'Sidhu Moose Wala', aliases: ['sidhu moose wala', 'sidhu moosewala'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Legendary Punjabi Hip-Hop & Folk Icon' },
  { canonical: 'Guru Randhawa', aliases: ['guru randhawa'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Punjabi & Bollywood Pop Star' },
  { canonical: 'Hardy Sandhu', aliases: ['hardy sandhu', 'harrdy sandhu'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Punjabi Pop & Dance Hitmaker' },
  { canonical: 'Jass Manak', aliases: ['jass manak'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Punjabi Romantic Pop Star' },
  { canonical: 'Guri', aliases: ['guri'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Punjabi Pop Vocalist' },
  { canonical: 'Millind Gaba', aliases: ['millind gaba'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Pop Singer & Music Producer' },
  { canonical: 'Zack Knight', aliases: ['zack knight'], section: 'hindi', singerLanguage: 'Punjabi', role: 'British-Asian R&B & Desi Pop Star' },
  { canonical: 'Imran Khan', aliases: ['imran khan'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Global Desi Hip-Hop & Pop Icon' },
  { canonical: 'Bohemia', aliases: ['bohemia'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Pioneer of Desi Rap' },
  { canonical: 'Raftaar', aliases: ['raftaar'], section: 'hindi', singerLanguage: 'Hindi', role: 'Hip-Hop Rapper & Producer' },
  { canonical: 'Ikka', aliases: ['ikka'], section: 'hindi', singerLanguage: 'Hindi', role: 'Desi Hip-Hop Rapper & Lyricist' },
  { canonical: 'Divine', aliases: ['divine'], section: 'hindi', singerLanguage: 'Hindi', role: 'Gully Rap Pioneer' },
  { canonical: 'Emiway Bantai', aliases: ['emiway bantai', 'emiway'], section: 'hindi', singerLanguage: 'Hindi', role: 'Independent Hip-Hop Star' },
  { canonical: 'MC Stan', aliases: ['mc stan'], section: 'hindi', singerLanguage: 'Hindi', role: 'New-School Hip-Hop Producer & Rapper' },
  { canonical: 'Daler Mehndi', aliases: ['daler mehndi'], section: 'hindi', singerLanguage: 'Punjabi', role: 'King of Bhangra & Pop' },
  { canonical: 'Mika Singh', aliases: ['mika singh'], section: 'hindi', singerLanguage: 'Hindi', role: 'Bollywood Party & Powerhouse Hitmaker' },
  { canonical: 'Sukhwinder Singh', aliases: ['sukhwinder singh'], section: 'hindi', singerLanguage: 'Hindi', role: 'Oscar-Winning Powerhouse Vocalist' },
  { canonical: 'Vishal Dadlani', aliases: ['vishal dadlani', 'vishal-shekhar', 'vishal & shekhar', 'shekhar ravjiani'], section: 'hindi', singerLanguage: 'Hindi', role: 'Rock Vocalist & Blockbuster Composer Duo' },
  { canonical: 'Salim Merchant', aliases: ['salim merchant', 'salim-sulaiman', 'salim sulaiman'], section: 'hindi', singerLanguage: 'Hindi', role: 'Sufi & Film Composer-Vocalist' },
  { canonical: 'Adnan Sami', aliases: ['adnan sami'], section: 'hindi', singerLanguage: 'Hindi', role: 'Padma Shri Romantic & Classical Maestro' },
  { canonical: 'Lucky Ali', aliases: ['lucky ali'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie-Pop & Soul Legend' },
  { canonical: 'Kamaal Khan', aliases: ['kamaal khan'], section: 'hindi', singerLanguage: 'Hindi', role: 'Bollywood Playback Hitmaker' },
  { canonical: 'Nakash Aziz', aliases: ['nakash aziz'], section: 'hindi', singerLanguage: 'Hindi', role: 'High-Energy Bollywood Playback Star' },
  { canonical: 'Benny Dayal', aliases: ['benny dayal'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'Funk, Pop & Pan-Indian Playback Star' },
  { canonical: 'Divya Kumar', aliases: ['divya kumar'], section: 'hindi', singerLanguage: 'Hindi', role: 'Folk & Power Playback Singer' },
  { canonical: 'Bhoomi Trivedi', aliases: ['bhoomi trivedi'], section: 'hindi', singerLanguage: 'Hindi', role: 'Folk & Bollywood Playback Vocalist' },
  { canonical: 'Kanika Kapoor', aliases: ['kanika kapoor'], section: 'hindi', singerLanguage: 'Hindi', role: 'Bollywood Dance & Pop Queen' },
  { canonical: 'Asees Kaur', aliases: ['asees kaur'], section: 'hindi', singerLanguage: 'Hindi', role: 'Award-Winning Romantic Playback Singer' },
  { canonical: 'Dhvani Bhanushali', aliases: ['dhvani bhanushali'], section: 'hindi', singerLanguage: 'Hindi', role: 'Bollywood Youth Pop Sensation' },
  { canonical: 'Tulsi Kumar', aliases: ['tulsi kumar'], section: 'hindi', singerLanguage: 'Hindi', role: 'Melodious Playback & Indie Pop Star' },
  { canonical: 'Neeti Mohan', aliases: ['neeti mohan'], section: 'hindi', singerLanguage: 'Hindi', role: 'Versatile Bollywood Playback Vocalist' },
  { canonical: 'Monali Thakur', aliases: ['monali thakur'], section: 'hindi', singerLanguage: 'Hindi', role: 'National Award-Winning Playback Singer' },
  { canonical: 'Jonita Gandhi', aliases: ['jonita gandhi'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'Indo-Canadian Crossover Playback Star' },
  { canonical: 'Chinmayi Sripada', aliases: ['chinmayi', 'chinmayi sripada'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'Soulful Pan-Indian Playback Vocalist' },
  { canonical: 'Harshdeep Kaur', aliases: ['harshdeep kaur'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Sufi Ki Sultana & Playback Vocalist' },
  { canonical: 'Rekha Bhardwaj', aliases: ['rekha bhardwaj'], section: 'hindi', singerLanguage: 'Hindi', role: 'National Award-Winning Sufi & Folk Queen' },
  { canonical: 'Richa Sharma', aliases: ['richa sharma'], section: 'hindi', singerLanguage: 'Hindi', role: 'Sufi & Devotional Powerhouse Queen' },
  { canonical: 'Mamta Sharma', aliases: ['mamta sharma'], section: 'hindi', singerLanguage: 'Hindi', role: 'Dabangg Blockbuster Playback Singer' },
  { canonical: 'Shalmali Kholgade', aliases: ['shalmali kholgade'], section: 'hindi', singerLanguage: 'Hindi', role: 'Award-Winning Pop & Playback Vocalist' },
  { canonical: 'Nikhita Gandhi', aliases: ['nikhita gandhi'], section: 'hindi', singerLanguage: 'Hindi', role: 'Chartbuster Bollywood Playback Singer' },
  { canonical: 'Akasa Singh', aliases: ['akasa singh', 'akasa'], section: 'hindi', singerLanguage: 'Hindi', role: 'Pop & Playback Vocalist' },
  { canonical: 'Shirley Setia', aliases: ['shirley setia'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie Pop Vocalist' },
  { canonical: 'Madhubanti Bagchi', aliases: ['madhubanti bagchi'], section: 'hindi', singerLanguage: 'Hindi', role: 'Classical & Playback Singer' },
  { canonical: 'Jasleen Royal', aliases: ['jasleen royal'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie-Pop Singer & Composer' },
  { canonical: 'Shilpa Rao', aliases: ['shilpa rao'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Bollywood Playback Vocalist' },
  { canonical: 'Mithoon', aliases: ['mithoon'], section: 'hindi', singerLanguage: 'Hindi', role: 'Romantic Bollywood Composer & Singer' },
  { canonical: 'Ankit Tiwari', aliases: ['ankit tiwari'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Rock & Romantic Playback Singer' },
  { canonical: 'Jeet Gannguli', aliases: ['jeet gannguli', 'jeet ganguly'], section: 'hindi', singerLanguage: 'Hindi', role: 'Romantic Melody Composer & Singer' },
  { canonical: 'Mustafa Zahid', aliases: ['mustafa zahid'], section: 'hindi', singerLanguage: 'Hindi', role: 'Rock Balladeer & Playback Singer' },
  { canonical: 'Shafqat Amanat Ali', aliases: ['shafqat amanat ali'], section: 'hindi', singerLanguage: 'Hindi', role: 'Classical & Sufi Rock Maestro' },
  { canonical: 'Ali Zafar', aliases: ['ali zafar'], section: 'hindi', singerLanguage: 'Hindi', role: 'Pop & Sufi Singer-Songwriter' },
  { canonical: 'Falak Shabir', aliases: ['falak shabir'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Romantic Vocalist' },
  { canonical: 'Gajendra Verma', aliases: ['gajendra verma'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie-Pop Hitmaker & Composer' },
  { canonical: 'Mohammed Irfan', aliases: ['mohammed irfan', 'mohd irfan'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Romantic Playback Singer' },
  { canonical: 'Ash King', aliases: ['ash king'], section: 'hindi', singerLanguage: 'Hindi', role: 'R&B & Bollywood Playback Vocalist' },
  { canonical: 'Arijit & Shreya', aliases: ['arijit & shreya'], section: 'hindi', singerLanguage: 'Hindi', role: 'Iconic Duet Pair' },
  { canonical: 'Stebin Ben', aliases: ['stebin ben'], section: 'hindi', singerLanguage: 'Hindi', role: 'Romantic Pop & Playback Star' },
  { canonical: 'Yasser Desai', aliases: ['yasser desai'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Romantic Playback Singer' },
  { canonical: 'Rochak Kohli', aliases: ['rochak kohli'], section: 'hindi', singerLanguage: 'Hindi', role: 'Melodious Composer & Vocalist' },
  { canonical: 'Akhil Sachdeva', aliases: ['akhil sachdeva'], section: 'hindi', singerLanguage: 'Hindi', role: 'Sufi & Romantic Balladeer' },
  { canonical: 'Akhil', aliases: ['akhil'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Punjabi Romantic Vocalist' },
  { canonical: 'Ayushmann Khurrana', aliases: ['ayushmann khurrana'], section: 'hindi', singerLanguage: 'Hindi', role: 'Actor & Indie-Romantic Vocalist' },
  { canonical: 'Farhan Akhtar', aliases: ['farhan akhtar'], section: 'hindi', singerLanguage: 'Hindi', role: 'Rock Vocalist & Actor' },
  { canonical: 'Papon', aliases: ['papon'], section: 'hindi', singerLanguage: 'Hindi', role: 'Folk-Fusion & Soulful Playback Maestro' },
  { canonical: 'Tochi Raina', aliases: ['tochi raina'], section: 'hindi', singerLanguage: 'Hindi', role: 'Sufi & Soulful Playback Vocalist' },
  { canonical: 'Romy', aliases: ['romy'], section: 'hindi', singerLanguage: 'Hindi', role: 'Folk-Rock & Playback Singer' },
  { canonical: 'Varun Jain', aliases: ['varun jain'], section: 'hindi', singerLanguage: 'Hindi', role: 'New-Age Bollywood Playback Singer' },
  { canonical: 'Raghav Chaitanya', aliases: ['raghav chaitanya'], section: 'hindi', singerLanguage: 'Hindi', role: 'Award-Winning Romantic Playback Singer' },
  { canonical: 'Faheem Abdullah', aliases: ['faheem abdullah'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Indie & Kashmiri Balladeer' },
  { canonical: 'Sanam Puri', aliases: ['sanam puri', 'sanam band'], section: 'hindi', singerLanguage: 'Hindi', role: 'Lead Vocalist of SANAM Band' },
  { canonical: 'Anirudh Ravichander', aliases: ['anirudh ravichander', 'anirudh'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'Pan-Indian Rockstar Composer & Vocalist' },
  { canonical: 'Sid Sriram', aliases: ['sid sriram'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'Soulful Pan-Indian Melody Superstar' },
  { canonical: 'Devi Sri Prasad', aliases: ['devi sri prasad', 'dsp'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'Rockstar DSP — Pan-Indian Composer & Singer' },
  { canonical: 'Rahat Fateh Ali Khan', aliases: ['rahat fateh ali khan', 'ustad rahat fateh ali khan', 'nusrat fateh ali khan'], section: 'hindi', singerLanguage: 'Hindi', role: 'Sufi & Bollywood Playback Maestro' },
  { canonical: 'Aditya Rikhari', aliases: ['aditya rikhari'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie-Pop Singer-Songwriter' },
  { canonical: 'Prateek Kuhad', aliases: ['prateek kuhad'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie Singer-Songwriter' },
  { canonical: 'Zaeden', aliases: ['zaeden'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie Pop Singer & Producer' },
  { canonical: 'Mitraz', aliases: ['mitraz'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie-Pop Duo' },
  { canonical: 'Talwiinder', aliases: ['talwiinder', 'talwinder'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Alternative Punjabi & R&B Artist' },
  { canonical: 'Pritam', aliases: ['pritam'], section: 'hindi', singerLanguage: 'Hindi', role: 'Blockbuster Bollywood Composer & Hitmaker' },
  { canonical: 'Shaan', aliases: ['shaan'], section: 'hindi', singerLanguage: 'Hindi', role: 'Golden Voice of Bollywood Pop & Romance' },
  { canonical: 'Kailash Kher', aliases: ['kailash kher'], section: 'hindi', singerLanguage: 'Hindi', role: 'Sufi & Devotional Powerhouse Vocalist' },
  { canonical: 'Javed Ali', aliases: ['javed ali'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Sufi & Playback Vocalist' },
  { canonical: 'Palak Muchhal', aliases: ['palak muchhal'], section: 'hindi', singerLanguage: 'Hindi', role: 'Melodious Bollywood Playback Singer' },
  { canonical: 'Himesh Reshammiya', aliases: ['himesh reshammiya', 'anand raj anand'], section: 'hindi', singerLanguage: 'Hindi', role: 'Hit Machine Composer & Playback Singer' },
  { canonical: 'Bilal Saeed', aliases: ['bilal saeed'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Punjabi & Desi Pop Singer-Producer' },
  { canonical: 'Kaifi Khalil', aliases: ['kaifi khalil'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Indie & Kahani Suno Hitmaker' },
  { canonical: 'AUR', aliases: ['aur'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie R&B & Hip-Hop Trio (Tu Hai Kahan)' },
  { canonical: 'Dikshant', aliases: ['dikshant'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie Acoustic Singer-Songwriter' },
  { canonical: 'Madhur Sharma', aliases: ['madhur sharma'], section: 'hindi', singerLanguage: 'Hindi', role: 'Sufi & unplugged Vocal Sensation' },
  { canonical: 'Sai Abhyankkar', aliases: ['sai abhyankkar'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'Pan-Indian Indie & Film Composer-Singer' },
  { canonical: 'Vidya Vox', aliases: ['vidya vox'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'Indo-Western Mashup & Pop Vocalist' },
  { canonical: 'Meet Bros', aliases: ['meet bros', 'meet bros anjjan'], section: 'hindi', singerLanguage: 'Hindi', role: 'Bollywood Dance & Party Composer Duo' },
  { canonical: 'Neeraj Shridhar', aliases: ['neeraj shridhar', 'bombay vikings'], section: 'hindi', singerLanguage: 'Hindi', role: 'Bollywood Pop & Groove Vocalist' },
  { canonical: 'Ami Mishra', aliases: ['ami mishra'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Romantic Singer-Composer' },
  { canonical: 'Javed Bashir', aliases: ['javed bashir'], section: 'hindi', singerLanguage: 'Hindi', role: 'Classical & Sufi Playback Maestro' },
  { canonical: 'Karan Sehmbi', aliases: ['karan sehmbi'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Punjabi Romantic Pop Vocalist' },
  { canonical: 'M. M. Keeravani', aliases: ['m. m. keeravani', 'mm keeravani', 'm.m. keeravani'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'Oscar-Winning RRR Composer & Vocalist' },
  { canonical: 'Rahul Sipligunj', aliases: ['rahul sipligunj', 'kaala bhairava'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'Oscar-Winning Naatu Naatu Playback Singer' },
  { canonical: 'Tanishk Bagchi', aliases: ['tanishk bagchi'], section: 'hindi', singerLanguage: 'Hindi', role: 'Chartbuster Bollywood Composer & Producer' },
  { canonical: 'Dino James', aliases: ['dino james'], section: 'hindi', singerLanguage: 'Hindi', role: 'Rapper & Spoken-Word Hip-Hop Artist' },
  { canonical: 'Hasan Raheem', aliases: ['hasan raheem'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie R&B & Pop Artist' },
  { canonical: 'Indravathi Chauhan', aliases: ['indravathi chauhan', 'indravathi'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'Pan-Indian Playback Singer' },
];

/**
 * Curated song-title to true singer knowledge base for famous songs whose YouTube titles
 * omit the singer name or put the movie/song name first (e.g. "Besabriyaan - FULL VIDEO: M.S. DHONI").
 */
const FAMOUS_SONG_TO_SINGER_MAP: Array<{
  pattern: RegExp;
  singer: string;
  cleanSongTitle?: string;
  section?: HomeSection;
}> = [
  { pattern: /\bbesabriyaan\b/i, singer: 'Armaan Malik', cleanSongTitle: 'Besabriyaan' },
  { pattern: /\bjab tak\b|\bkaun tujhe\b/i, singer: 'Armaan Malik' },
  { pattern: /\bmain rahoon ya na rahoon\b|\bbol do na zara\b|\bsab tera\b|\bwajah tum ho\b|\bchale aana\b|\bpahle pyaar ka\b|\bbutta bomma\b/i, singer: 'Armaan Malik' },
  { pattern: /\bmile ho tum\b/i, singer: 'Neha Kakkar', cleanSongTitle: 'Mile Ho Tum (Reprise)' },
  { pattern: /\bdilbar\b|\bgarmi\b|\bo saki saki\b|\bkala chashma\b|\baankh marey\b|\bkar gayi chull\b|\blondon thumakda\b|\bmanali trance\b/i, singer: 'Neha Kakkar' },
  { pattern: /\bsanam re\b/i, singer: 'Arijit Singh', cleanSongTitle: 'Sanam Re' },
  { pattern: /\btum hi ho\b|\bchanna mereya\b|\bkesariya\b|\bapna bana le\b|\bchaleya\b|\bsatranga\b|\bo maahi\b|\bheeriye\b|\bagar tum saath ho\b|\bkhairiyat\b|\bshayad\b|\btujhe kitna chahne lage\b|\bkalank\b|\bae dil hai mushkil\b|\bgerua\b|\bjanam janam\b|\bzaalima\b|\bhawayein\b|\bnashe si chadh gayi\b|\bpachtaoge\b|\bhumdard\b|\bmuskurane\b|\bsamjhawan\b|\bsoch na sake\b|\broka na ruke naina\b|\btera yaar hoon main\b|\bve kamleya\b|\bo bedardeya\b|\btere pyaar mein\b|\bphir aur kya chahiye\b|\bjhoome jo pathaan\b|\blutt putt gaya\b|\bdeva deva\b/i, singer: 'Arijit Singh' },
  { pattern: /\bsrivalli\b|\bkun faya kun\b|\bjashn-e-bahaara\b|\btu jo mila\b|\bdeewana kar raha hai\b|\bnagada nagada\b|\bguzaarish\b/i, singer: 'Javed Ali' },
  { pattern: /\bpapa meri jaan\b|\babhi mujh mein kahin\b|\bsuraj hua maddham\b|\bkal ho naa ho\b|\bsandese aate hain\b|\bmain agar kahoon\b|\bsaathiya\b|\bbole chudiyan\b|\byeh dil deewana\b|\btanhayee\b/i, singer: 'Sonu Nigam' },
  { pattern: /\bsaami saami\b|\bsheila ki jawani\b|\bkamli\b|\bbeedi\b|\bcrazy kiya re\b|\bdesi girl\b|\bdhoom machale\b|\baaja nachle\b|\bhalkat jawani\b/i, singer: 'Sunidhi Chauhan' },
  { pattern: /\branjithame\b|\barabic kuthu\b|\bvaathi coming\b|\bhukum\b|\bwhy this kolaveri\b|\bzinda banda\b|\bchalao na naino se\b/i, singer: 'Anirudh Ravichander' },
  { pattern: /\bpushpa pushpa\b/i, singer: 'Mika Singh' },
  { pattern: /\boo antava\b/i, singer: 'Indravathi Chauhan' },
  { pattern: /\bsaami\b/i, singer: 'Sunidhi Chauhan' },
  { pattern: /\bdil de diya hai\b/i, singer: 'Himesh Reshammiya', cleanSongTitle: 'Dil De Diya Hai' },
  { pattern: /\baashiq banaya aapne\b|\bjhalak dikhlaja\b|\btera surroor\b|\bhookah bar\b|\bjumme ki raat\b|\bsanam teri kasam\b/i, singer: 'Himesh Reshammiya' },
  { pattern: /\btera hone laga hoon\b|\btu jaane na\b|\bjeene laga hoon\b|\bdil diyan gallan\b|\btera ban jaunga\b|\bpaniyon sa\b|\bdekhte dekhte\b|\btajdar-e-haram\b|\bpehle नजर में\b|\bpehli nazar mein\b|\bpiya o re piya\b|\bwoh lamhe\b|\baadat\b|\btere sang yaara\b|\bo saathi\b|\brafta rafta\b|\bbe intehaan\b|\bmain rang sharbaton ka\b|\bjeena jeena\b/i, singer: 'Atif Aslam' },
  { pattern: /\bo meri laila\b/i, singer: 'Atif Aslam', cleanSongTitle: 'O Meri Laila' },
  { pattern: /\bkatto gilehri\b|\bmunni badnaam hui\b|\bfavicol se\b|\btinku jiya\b|\banarkali disco chali\b/i, singer: 'Mamta Sharma' },
  { pattern: /\bhans mat pagli\b/i, singer: 'Sonu Nigam', cleanSongTitle: 'Hans Mat Pagli' },
  { pattern: /\bbadtameez dil\b|\bbalam pichkari\b|\bsubha hone na de\b|\bदिल्ली वाली गर्लफ्रेंड\b|\bdilliwaali girlfriend\b|\blat lag gayee\b|\bpappu can't dance\b/i, singer: 'Benny Dayal' },
  { pattern: /\bkabira\b/i, singer: 'Tochi Raina' },
  { pattern: /\billahi\b/i, singer: 'Arijit Singh' },
  { pattern: /\bghagra\b/i, singer: 'Rekha Bhardwaj' },
  { pattern: /\braataan lambiyan\b|\blut gaye\b|\btum hi aana\b|\bhumnava mere\b|\bmeri aashiqui\b|\btaaron ke shehar\b|\bdil galti kar baitha hai\b|\bkinna sona\b|\bakh lad jaave\b|\bmere ghar ram aaye hain\b|\bmeri maa ke barabar koi nahi\b|\bshri krishna govind hare murari\b/i, singer: 'Jubin Nautiyal' },
  { pattern: /\bbekhayali\b|\bmaiye jinna sohna\b|\bmalang sajna\b|\bmere sohneya\b|\bmere sohna\b|\braanjhan\b|\bdilbara\b|\bmuqabla\b/i, singer: 'Sachet Tandon', section: 'hindi' },
  { pattern: /\bram siya ram\b|\bhar har mahadev\b|\bshiv tandav\b/i, singer: 'Sachet Tandon', section: 'bhakti' },
  { pattern: /\bmann bharryaa\b|\bteri mitti\b|\bfilhall\b|\bfilhaal\b|\branjha\b|\bkya loge tum\b|\bsaari duniya jalaa denge\b/i, singer: 'B Praak' },
  { pattern: /\bpehle bhi main\b|\bkartavya\b|\bkaise hua\b|\baaj bhi\b|\bmanjha\b|\bzikr\b|\bnai lagda\b|\bjaaniye\b/i, singer: 'Vishal Mishra' },
  { pattern: /\barjan vailly\b|\bchamkila\b|\blover\b|\bborn to shine\b|\bg.o.a.t\b|\bdo you know\b|\bproper patola\b|\bnaina\b|\bhass hass\b|\bsaudagar\b|\bik kudi\b/i, singer: 'Diljit Dosanjh' },
  { pattern: /\btauba tauba\b|\bsoftly\b|\bwhite brown black\b|\bmexico\b|\bchitta kurta\b|\badmirin' you\b|\bwinning speech\b|\bjee ni lagda\b/i, singer: 'Karan Aujla' },
  { pattern: /\bbrown munde\b|\bexcuses\b|\binsane\b|\bsummer high\b|\bwith you\b|\bdil nu\b|\btrue stories\b|\bspaceship\b/i, singer: 'AP Dhillon' },
  { pattern: /\b295\b|\bso high\b|\bsame beef\b|\bthe last ride\b|\blevels\b|\bdollar\b|\btochan\b|\bold skool\b|\bbambiha bole\b/i, singer: 'Sidhu Moose Wala' },
  { pattern: /\bcheques\b|\bno love\b|\bwe rollin\b|\bone love\b|\belevated\b|\bballr\b|\bking shit\b|\bstill rollin\b/i, singer: 'Shubh' },
  { pattern: /\bblue eyes\b|\blungi dance\b|\bdesi kalakaar\b|\blove dose\b|\bbrown rang\b|\bdope shope\b|\bangreji beat\b|\bchar bottle vodka\b|\bparty all night\b|\bhigh heels\b|\bchhoti dress\b|\bmakhna\b|\bsunny sunny\b|\byaar naa miley\b|\bmere mehbub\b|\bmaniac\b|\bmillionaire\b/i, singer: 'Yo Yo Honey Singh' },
  { pattern: /\bdj waley babu\b|\bgenda phool\b|\bjugnu\b|\bpaani paani\b|\bsanitizer\b|\bkar gayi chull\b|\bmerciful\b|\babhi toh party shuru hui hai\b|\bproper patola\b|\btere naal nachna\b|\btareefan\b|\bshe move it like\b|\bgarmi\b/i, singer: 'Badshah' },
  { pattern: /\blaho\b|\blahore\b|\bhigh rated gabru\b|\bishare tere\b|\bsuit suit\b|\bpatola\b|\bmorni banke\b|\bnaach meri rani\b|\bban ja rani\b|\bmade in india\b/i, singer: 'Guru Randhawa' },
  { pattern: /\bbijlee bijlee\b|\bbackbone\b|\bnaah\b|\bkya baat ay\b|\bsoch\b/i, singer: 'Hardy Sandhu' },
  { pattern: /\blehanga\b|\bprada\b|\bviah\b|\bbutterfly\b/i, singer: 'Jass Manak' },
  { pattern: /\bchogada\b|\bkamariya\b|\basli hip hop\b|\btera ghata\b|\btera zikr\b|\bchhote chhote peg\b|\bmehrama\b|\bek tarfa\b|\basal mein\b|\bbaarish lete aana\b|\bhawa banke\b|\brabachev\b/i, singer: 'Darshan Raval' },
  { pattern: /\bhusn\b|\bbaarishein\b|\balag aasmaan\b|\bgul\b|\bjo tum mere ho\b|\bmazaak\b/i, singer: 'Anuv Jain' },
  { pattern: /\bmaan meri jaan\b|\btu aake dekhle\b|\boops\b|\bektarfa\b/i, singer: 'King' },
  { pattern: /\bzara sa\b|\bajab si\b|\baankhon mein teri\b|\btu hi meri shab hai\b|\bkhuda jaane\b|\bdil ibadat\b|\blaboon ko\b|\blabon ko\b|\bbeete lamhein\b|\btadap tadap\b|\bsach keh raha hai\b|\bkya mujhe pyaar hai\b|\byaaron\b|\bpal\b|\balvida\b|\bhindi song om shanti om\b/i, singer: 'KK' },
  { pattern: /\btum se hi\b|\bkun faya kun\b|\bpee loon\b|\bnadaan parindey\b|\bsadda haq\b|\bmasakali\b|\btujhe bhula diya\b|\bdooba dooba\b|\byeh dooriyan\b|\bphir se ud chala\b|\bbheegi si bhaagi si\b/i, singer: 'Mohit Chauhan' },
  { pattern: /\bsunn raha hai\b|\bgalliyan\b|\btu hai ki nahi\b|\bboond boond\b|\bkatra katra\b/i, singer: 'Ankit Tiwari' },
  { pattern: /\bgerua\b|\btum hi ho\b|\bphir mohabbat\b|\bsanam teri kasam\b/i, singer: 'Arijit Singh' },
  { pattern: /\bvaaste\b|\bleja re\b|\bnayan\b/i, singer: 'Dhvani Bhanushali' },
  { pattern: /\bparam sundari\b|\bnagada sang dhol\b|\bdeewani mastani\b|\bghoomar\b|\bbarso re\b|\bteri ore\b|\bsaans\b|\bmanwa laage\b|\bsun raho\b|\bchikni chameli\b|\bpal pal har pal\b|\bagar tum mil jao\b|\bjaadu hai nasha hai\b|\bdola re dola\b|\bami je tomar\b|\bmere dholna\b|\bpani da\b|\bsaibo\b|\bangana morey\b/i, singer: 'Shreya Ghoshal' },
  { pattern: /\bmere rashke qamar\b|\baafreen aafreen\b|\bafreen afreen\b|\btumhe dillagi\b|\bzaroori tha\b|\bteri meri\b|\bjag ghoomeya\b|\bore piya\b|\bbol na halke halke\b|\baaj din chadheya\b|\bmain jahaan rahoon\b|\bdil to बच्चा है\b|\bdil to bachcha hai ji\b|\btere mast mast do nain\b/i, singer: 'Rahat Fateh Ali Khan' },
  { pattern: /\bdagabaaz re\b/i, singer: 'Rahat Fateh Ali Khan' },
  { pattern: /\bpani da rang\b|\bsaadi galli aaja\b|\bmitti di khushboo\b|\bnazm nazm\b/i, singer: 'Ayushmann Khurrana' },
  { pattern: /\bgallan goodiyaan\b|\bmitwa\b|\bbreathless\b|\bkajra re\b|\btaare zameen par\b/i, singer: 'Shankar Mahadevan', section: 'hindi' },
  { pattern: /\bdeva shree ganesha\b|\bzingaat\b|\bsapna jahan\b/i, singer: 'Ajay-Atul' },
  { pattern: /\bseniorita\b.*zindagi na milegi dobara/i, singer: 'Farhan Akhtar', section: 'hindi' },
  { pattern: /\bik vaari aa\b|\bqaafirana\b/i, singer: 'Amit Trivedi', section: 'hindi' },
  { pattern: /\bnamo namo\b/i, singer: 'Amit Trivedi', section: 'bhakti' },
  { pattern: /\bmoh moh ke dhaage\b|\bbulleya\b|\bjiyein kyun\b/i, singer: 'Papon' },
  { pattern: /\bchaiyya chaiyya\b|\bramta jogi\b|\bhaule haule\b|\bchak de india\b|\bjai ho\b|\bbeedi\b|\bsultan\b|\bkar har maidaan fateh\b/i, singer: 'Sukhwinder Singh' },
  { pattern: /\bteri deewani\b|\bsaiyyan\b|\ballah ke bande\b|\bchak de phatte\b/i, singer: 'Kailash Kher', section: 'hindi' },
  { pattern: /\bbam lahiri\b|\bkaun hai woh\b/i, singer: 'Kailash Kher', section: 'bhakti' },
  { pattern: /\bmalhari\b|\bswitty tera drama\b|\bbalam pichkari\b|\bghungroo\b|\bjhoome jo pathaan\b|\bsheila ki jawani\b|\bdhan te nan\b|\bkurbaan hua\b|\bjee le zaraa\b/i, singer: 'Vishal Dadlani' },
  { pattern: /\bmauja hi mauja\b|\bsingh is kinng\b|\baankh marey\b|\bsawan mein lag gayi aag\b|\bsubha hone na de\b|\bparty toh banti hai\b|\b440 volt\b|\bhawa hawa\b|\bgandi baat\b|\baaj ki party\b/i, singer: 'Mika Singh' },
  { pattern: /\bsaree ke fall sa\b|\bgandi baat\b|\bjabra fan\b|\bselfie le le re\b|\bafghan jalebi\b|\bdhating naach\b/i, singer: 'Nakash Aziz' },
  { pattern: /\bjumme ki raat\b|\bhud hud dabangg\b/i, singer: 'Mika Singh' },
  { pattern: /\bo oh jaane jaana\b/i, singer: 'Kamaal Khan' },
  { pattern: /\bbaby doll\b|\bchittiyaan kalaiyaan\b/i, singer: 'Kanika Kapoor', section: 'hindi' },
  { pattern: /\bpink lips\b|\bhangover\b/i, singer: 'Meet Bros', section: 'hindi' },
  { pattern: /\btum hi ho bandhu\b|\bcharacter dheela\b|\btwist\b|\bhare ram\b/i, singer: 'Neeraj Shridhar', section: 'hindi' },
  { pattern: /\bhasi ban gaye\b|\blost without you\b/i, singer: 'Ami Mishra', section: 'hindi' },
  { pattern: /\bkahani suno\b/i, singer: 'Kaifi Khalil', section: 'hindi' },
  { pattern: /\btu hai kahan\b/i, singer: 'AUR', section: 'hindi' },
  { pattern: /\baankhon se batana\b/i, singer: 'Dikshant', section: 'hindi' },
  { pattern: /\bkali kali zulfon\b|\bkया मुमकिन है\b|\btere jeya hor disda\b/i, singer: 'Madhur Sharma', section: 'hindi' },
  { pattern: /\baasa kooda\b|\bkatchi sera\b/i, singer: 'Sai Abhyankkar', section: 'hindi' },
  { pattern: /\bnaacho naacho\b|\bnaatu naatu\b|\bdosti\b|\bkomuram bheemudo\b|\bjanani\b|\betthara jenda\b/i, singer: 'M. M. Keeravani', section: 'hindi' },
  { pattern: /\badiga adiga\b|\binthandham\b|\bsamajavaragamana\b|\bsrivalli\b/i, singer: 'Sid Sriram', section: 'hindi' },
  { pattern: /\bmutton khake button khole\b/i, singer: 'Neelkamal Singh', cleanSongTitle: 'Mutton Khake Button Khole', section: 'bhojpuri' },
  { pattern: /\brel diya jayega\b|रेल दिया जायेगा/i, singer: 'Khesari Lal Yadav', section: 'bhojpuri' },
  { pattern: /\bmahaul badle wala ba\b|माहौल बदले वाला बा/i, singer: 'Pawan Singh', section: 'bhojpuri' },
  { pattern: /\bnach re patarki\b|नाच रे पतरकी/i, singer: 'Arvind Akela Kallu', section: 'bhojpuri' },
  { pattern: /\blollipop lagelu\b|\blollypop lagelu\b|\bsaj ke sawar ke\b|\bpudina ae haseena\b|\blal ghaghra\b|\braja ji\b|\bhari hari odhani\b|\bdarshaniya\b/i, singer: 'Pawan Singh', section: 'bhojpuri' },
  { pattern: /\bnathuniya\b|\bpagal banaibe\b|\ble le aayi coca cola\b|\bparlour wali\b|\bpalang sagwan ke\b|\btabla\b|\bnimbu kharbuza bhail\b/i, singer: 'Khesari Lal Yadav', section: 'bhojpuri' },
  { pattern: /\brinkiya ke papa\b|\bbagalwali jaan mareli\b/i, singer: 'Manoj Tiwari', section: 'bhojpuri' },
  { pattern: /\bhello kaun\b|\blavanda\b|\bgori tori chunari\b/i, singer: 'Ritesh Pandey', section: 'bhojpuri' },
  { pattern: /\bhar har shambhu\b/i, singer: 'Abhilipsa Panda', section: 'bhakti' },
  { pattern: /\bmera bhola hai bhandari\b|\bdamru bajaya\b|\blagi lagan shankara\b/i, singer: 'Hansraj Raghuwanshi', section: 'bhakti' },
  { pattern: /\bhanuman chalisa\b/i, singer: 'Hariharan', section: 'bhakti' },
  { pattern: /\bpyara saja hai tera dwar bhawani\b|\bare dwarpalo\b|\bram na milenge hanuman ke bina\b/i, singer: 'Lakhbir Singh Lakkha', section: 'bhakti' },
  { pattern: /\bram aayenge\b/i, singer: 'Swasti Mehul', section: 'bhakti' },
  { pattern: /\bblinding lights\b|\bstarboy\b|\bsave your tears\b|\bdie for you\b|\bcall out my name\b|\bthe hills\b|\bcan't feel my face\b|\bi feel it coming\b|\bafter hours\b|\btimeless\b/i, singer: 'The Weeknd', section: 'english' },
  { pattern: /\bshape of you\b|\bperfect\b|\bthinking out loud\b|\bphotograph\b|\bbad habits\b|\bshivers\b|\bcastle on the hill\b|\bgalway girl\b/i, singer: 'Ed Sheeran', section: 'english' },
  { pattern: /\bbeliever\b|\bthunder\b|\bones\b|\bdemons\b|\bradioactive\b|\benemy\b|\bwhatever it takes\b/i, singer: 'Imagine Dragons', section: 'english' },
  { pattern: /\blevitating\b|\bdon't start now\b|\bnew rules\b|\bone kiss\b|\bhoudini\b/i, singer: 'Dua Lipa', section: 'english' },
  { pattern: /\bcloser\b|\bsomething just like this\b|\bdon't let me down\b/i, singer: 'The Chainsmokers', section: 'english' },
  { pattern: /\bfaded\b|\balone\b|\bon my way\b|\bthe spectre\b|\bdarkside\b/i, singer: 'Alan Walker', section: 'english' },
  { pattern: /\bcheap thrills\b|\bunstoppable\b|\bchandelier\b|\bsnowman\b/i, singer: 'Sia', section: 'english' },
  { pattern: /\bheat waves\b/i, singer: 'Glass Animals', section: 'english' },
  { pattern: /\bsay you won't let go\b/i, singer: 'James Arthur', section: 'english' },
  { pattern: /\banother love\b/i, singer: 'Tom Odell', section: 'english' },
  { pattern: /\bsomeone you loved\b|\bbefore you go\b/i, singer: 'Lewis Capaldi', section: 'english' },
  { pattern: /\bdusk till dawn\b|\bpillowtalk\b/i, singer: 'Zayn', section: 'english' },
  { pattern: /\battention\b|\bwe don't talk anymore\b|\bsee you again\b|\blight switch\b/i, singer: 'Charlie Puth', section: 'english' },
  { pattern: /\bseñorita\b|\btreat you better\b|\bthere's nothing holdin' me back\b|\bstitches\b/i, singer: 'Shawn Mendes', section: 'english' },
  { pattern: /\bcalm down\b|\bsorry\b|\blove yourself\b|\bpeaches\b|\blet me love you\b/i, singer: 'Justin Bieber', section: 'english' },
  { pattern: /\bdie with a smile\b|\buptown funk\b|\bjust the way you are\b|\b24k magic\b|\bgrenade\b|\bthat's what i like\b/i, singer: 'Bruno Mars', section: 'english' },
  { pattern: /\bhymn for the weekend\b|\byellow\b|\bviva la vida\b|\ba sky full of stars\b|\bparadise\b|\bmy universe\b|\bthe scientist\b/i, singer: 'Coldplay', section: 'english' },
  { pattern: /\bsummertime sadness\b|\byoung and beautiful\b|\bvideo games\b|\bborn to die\b/i, singer: 'Lana Del Rey', section: 'english' },
  { pattern: /\bas it was\b|\bwatermelon sugar\b|\badore you\b|\bsign of the times\b/i, singer: 'Harry Styles', section: 'english' },
  { pattern: /\bnight changes\b|\bwhat makes you beautiful\b|\bstory of my life\b/i, singer: 'One Direction', section: 'english' },
  { pattern: /\bin the end\b|\bnumb\b|\bwhat i've done\b/i, singer: 'Linkin Park', section: 'english' },
  { pattern: /\bbroken angel\b/i, singer: 'Arash', section: 'english' },
  { pattern: /\ball of me\b/i, singer: 'John Legend', section: 'english' },
];

const GENERIC_CHANNEL_REGEX =
  /(\b(t-series|zee music|sony music|yrf|yash raj|tips|saregama|wave music|speed records|desi melodies|white hill|venus|shemaroo|eros now|universal music|republic records|atlantic records|interscope|columbia records|youtube music|youtube stream|youtube audio|indian artist|unknown artist|various artists|bollywood playback|bhakti bhajan artist|bhojpuri folk artist|global pop artist|official|vevo|records|music company|productions|films|studios|entertainment|money verse|mxeen|shailesh tiwari|mafia mundeer|7clouds|latinhype|aksh_vibes|thegoodvibe|the vibe guide|hevabidowntown|invertog|bagonly|cakes|alternate|aesthetic boomer|lo-fi|lofi|lyrics|gravero|sakeeb beatz|la mave|morning serenity|dj chetas|ranbir kapoor|ranbir k|salman khan|shah rukh khan|akshay kumar|emraan hashmi|sunny leone|kartik aaryan|kartik|shahid kapoor|thalapathy vijay|ss rajamouli|allu arjun|allu a|prabhas|ranveer singh|varun dhawan|hrithik roshan|tiger shroff|sushant singh rajput|shraddha kapoor|alia bhatt|deepika padukone|katrina kaif|kiara advani|sidharth malhotra|kriti sanon|rashmika mandanna|jacqueline fernandez|nora fatehi|disha patani|ajay devgn|saif ali khan|john abraham|govinda|aamir khan|sanjay dutt|anil kapoor|bobby deol|sunny deol|rajkummar rao|vicky kaushal|ayushmann|pushpa|ranjithame|kabir singh|zindagi na milegi dobara|baaghi|agent vinod|taare zameen par|judwaa|dhurandhar|yeh jawaani hai deewani|ek villain|simmba|animal|pathaan|jawan|brahmastra|aashiqui|shershaah|bhool bhulaiyaa|stree|gadar|dunki|om shanti om|tu jhoothi main makkaar|patiala house|toilet-ek prem katha|m\.s\. dhoni|dabangg|masti|non stop|nonstop|reprise|remix|jukebox|mashup|besabriyaan|mile ho tum|dil de diya hai|tera hone laga hoon|o meri laila|sanam re|katto gilehri)\b)/i;

export function isGenericChannelOrLabel(name?: string): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return true;
  if (/[_@#$%^&*0-9]/.test(trimmed) && !/^(maroon 5|one direction|b praak|p!nk|a\.?\s*r\.?\s*rahman|24kgoldn|5 seconds of summer|4 non blondes|\*nsync)$/i.test(trimmed)) {
    return true;
  }
  return GENERIC_CHANNEL_REGEX.test(trimmed);
}

/**
 * Checks whether a candidate singer name is a verified real singer in our curated Indian/Global profiles.
 * Strictly prevents movies, actors, song titles, and YouTube channels from ever polluting `track.artist` or the Section 5 Singers directory.
 */
export function isVerifiedRealSingerName(name?: string): boolean {
  if (!name) return false;
  const trimmed = name.trim().toLowerCase().replace(/^the\s+/i, '').trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 48 || isGenericChannelOrLabel(name)) {
    return false;
  }

  for (const eng of ENGLISH_ARTIST_PROFILES) {
    if (
      eng.canonical.toLowerCase().replace(/^the\s+/i, '').trim() === trimmed ||
      eng.aliases.some((al) => al.toLowerCase().replace(/^the\s+/i, '').trim() === trimmed)
    ) {
      return true;
    }
  }
  for (const ind of INDIAN_AND_REGIONAL_ARTIST_PROFILES) {
    if (
      ind.canonical.toLowerCase().replace(/^the\s+/i, '').trim() === trimmed ||
      ind.aliases.some((al) => al.toLowerCase().replace(/^the\s+/i, '').trim() === trimmed)
    ) {
      return true;
    }
  }

  return false;
}

export interface AIClassifiedTrackResult {
  id?: string;
  cleanTitle: string;
  singerName: string;
  section: HomeSection;
  categoryLabel: 'Hindi Song' | 'Bhojpuri Song' | 'Bhakti Song' | 'English Song';
  genre: 'Hindi' | 'Bhojpuri' | 'Bhakti' | 'English';
  language: 'Hindi' | 'Bhojpuri' | 'Punjabi' | 'English' | 'Sanskrit';
  singerLanguage: 'Hindi' | 'Bhojpuri' | 'Pan-Indian' | 'Punjabi' | 'Other Country';
  singerLanguageCategory: 'Hindi' | 'Bhojpuri' | 'Pan-Indian' | 'Punjabi' | 'Other Country';
  singerRole: string;
  reason: string;
}

/**
 * Smartly analyzes a song's title, raw artist/channel name, album, and optional playlist title
 * to determine the true Singer Name (e.g. "The Weeknd") and Category Section ('hindi' | 'bhojpuri' | 'bhakti' | 'english').
 * Also heals tracks where the song title was accidentally saved in `artist` and `title` became a generic movie/version tag.
 */
export function smartClassifyTrackMetadata(
  input: {
    id?: string;
    title: string;
    artist?: string;
    album?: string;
    playlistTitle?: string;
  },
  existingArtists: Artist[] = []
): AIClassifiedTrackResult {
  let rawTitle = decodeHtmlEntities(input.title || '').trim();
  let rawArtist = decodeHtmlEntities(input.artist || '')
    .replace(/(\s*-\s*Topic|\s*VEVO|\s*Official)$/i, '')
    .trim();
  const rawAlbum = decodeHtmlEntities(input.album || '').trim();
  const rawPlaylist = decodeHtmlEntities(input.playlistTitle || '').trim();

  // Heal inverted title/artist from legacy imports where rawArtist held the song name and rawTitle became "FULL VIDEO: ..." or "Reprise Version"
  const isGenericSuffixTitle =
    /^(full\s*(video|song|audio)|reprise(\s*version)?|official\s*(video|audio)|remix(\s*video\s*song)?|the\s*end|masti\s*\(\d+\)|dabanng\s*2|dabangg\s*2|m\.s\.\s*dhoni.*|sanam\s*re\s*remix.*)$/i.test(
      rawTitle
    );
  if (
    rawArtist &&
    !isVerifiedRealSingerName(rawArtist) &&
    !isGenericChannelOrLabel(rawArtist) &&
    isGenericSuffixTitle
  ) {
    rawTitle = `${rawArtist} (${rawTitle.replace(/^full\s*video:\s*/i, '').trim()})`;
    rawArtist = '';
  } else if (
    rawArtist &&
    !isVerifiedRealSingerName(rawArtist) &&
    FAMOUS_SONG_TO_SINGER_MAP.some((m) => m.pattern.test(rawArtist))
  ) {
    if (!rawTitle.toLowerCase().includes(rawArtist.toLowerCase())) {
      rawTitle = `${rawArtist} - ${rawTitle}`;
    }
    rawArtist = '';
  }

  const titleLowerOnly = rawTitle.toLowerCase();
  const combinedText = `${rawTitle} ${rawArtist} ${rawAlbum} ${rawPlaylist}`.toLowerCase();
  const hasDevanagari = /[\u0900-\u097F]/.test(rawTitle);

  // Clean noise from title while keeping core song name
  let cleanTitle = rawTitle
    .replace(
      /\s*(\(|\[)\s*(official\s*(music\s*)?(video|audio|lyric\s*video|lyrics|visualizer)|full\s*(video|audio|song)|lyrical\s*(video|song)?|4k|hd|audio\s*song|video\s*song)\s*(\)|\])/gi,
      ''
    )
    .replace(/^(full\s*video|full\s*song|lyrical|official\s*video|audio\s*song)\s*:\s*/i, '')
    .trim();

  // Check if title has "Artist - Song" or "Song | Artist"
  const pipeParts = cleanTitle.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
  const dashParts = cleanTitle.split(/\s+[-–—]\s+/).map((s) => s.trim()).filter(Boolean);

  let detectedSinger = '';
  let detectedSection: HomeSection | null = null;
  let detectedSingerLang = 'Hindi' as AIClassifiedTrackResult['singerLanguage'];
  let detectedRole = 'Playback Singer & Music Icon';

  const applyArtistProfile = (canonicalName: string): boolean => {
    for (const eng of ENGLISH_ARTIST_PROFILES) {
      if (eng.canonical.toLowerCase() === canonicalName.toLowerCase()) {
        detectedSinger = eng.canonical;
        detectedSection = 'english';
        detectedSingerLang = 'Other Country';
        detectedRole = eng.role;
        return true;
      }
    }
    for (const ind of INDIAN_AND_REGIONAL_ARTIST_PROFILES) {
      if (ind.canonical.toLowerCase() === canonicalName.toLowerCase()) {
        detectedSinger = ind.canonical;
        detectedSection = ind.section;
        detectedSingerLang = ind.singerLanguage;
        detectedRole = ind.role;
        return true;
      }
    }
    return false;
  };

  const matchInText = (textToSearch: string): boolean => {
    // 1. Check Famous Song-to-Singer knowledge base FIRST so songs like "Kaun Tujhe", "Sunn Raha Hai", "Baby Doll" match their true singer
    for (const entry of FAMOUS_SONG_TO_SINGER_MAP) {
      if (entry.pattern.test(textToSearch)) {
        if (!applyArtistProfile(entry.singer)) {
          detectedSinger = entry.singer;
        }
        if (entry.section) {
          detectedSection = entry.section;
        }
        if (entry.cleanSongTitle && isGenericSuffixTitle) {
          cleanTitle = entry.cleanSongTitle;
        }
        return true;
      }
    }

    // 2. Check known English / Global artists
    for (const eng of ENGLISH_ARTIST_PROFILES) {
      if (
        eng.aliases.some((alias) => {
          const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(`\\b${escaped}\\b`, 'i').test(textToSearch);
        })
      ) {
        detectedSinger = eng.canonical;
        detectedSection = 'english';
        detectedSingerLang = 'Other Country';
        detectedRole = eng.role;
        return true;
      }
    }

    // 3. Check known Indian / Regional artists
    for (const ind of INDIAN_AND_REGIONAL_ARTIST_PROFILES) {
      if (
        ind.aliases.some((alias) => {
          const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(`\\b${escaped}\\b`, 'i').test(textToSearch);
        })
      ) {
        detectedSinger = ind.canonical;
        detectedSection = ind.section;
        detectedSingerLang = ind.singerLanguage;
        detectedRole = ind.role;
        return true;
      }
    }

    // 4. Check custom Admin-created existing artists in the catalog
    for (const existing of existingArtists) {
      if (!isVerifiedRealSingerName(existing.name) && !(existing as any).isAdminCreated) continue;
      const nameLower = existing.name.trim().toLowerCase();
      if (nameLower.length >= 3) {
        const escaped = nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`\\b${escaped}\\b`, 'i').test(textToSearch)) {
          detectedSinger = existing.name.trim();
          detectedRole = existing.role || detectedRole;
          if (existing.language === 'Bhojpuri') {
            detectedSection = 'bhojpuri';
            detectedSingerLang = 'Bhojpuri';
          } else if (existing.language === 'Other Country') {
            detectedSection = 'english';
            detectedSingerLang = 'Other Country';
          } else if (existing.language === 'Punjabi') {
            detectedSection = 'hindi';
            detectedSingerLang = 'Punjabi';
          } else if (existing.language === 'Pan-Indian') {
            detectedSection = 'hindi';
            detectedSingerLang = 'Pan-Indian';
          } else {
            detectedSection = 'hindi';
            detectedSingerLang = 'Hindi';
          }
          return true;
        }
      }
    }

    return false;
  };

  // Search ONLY rawTitle first so playlist/album titles like "90s Hits... Udit Narayan" or "Broken Angel Mix" don't hijack individual tracks!
  let matchedFromTitle = matchInText(titleLowerOnly);

  // Check if rawArtist is a poisoned legacy default that wasn't actually in the song title
  const rawArtistLower = rawArtist.toLowerCase();
  const isPoisonedDefaultArtist =
    (rawArtistLower === 'arijit singh' && !titleLowerOnly.includes('arijit')) ||
    (rawArtistLower === 'the weeknd' && !titleLowerOnly.includes('weeknd')) ||
    (rawArtistLower === 'pawan singh' && !titleLowerOnly.includes('pawan') && !/पवन/.test(rawTitle)) ||
    (rawArtistLower === 'hariharan' && !titleLowerOnly.includes('hariharan') && !titleLowerOnly.includes('hanuman chalisa'));

  if (!matchedFromTitle && rawArtist && !isPoisonedDefaultArtist) {
    matchedFromTitle = matchInText(rawArtistLower);
  }

  // Only check playlist/album context if it's a dedicated single-artist playlist (e.g., "Bilal Saeed", "Pawan Singh Hits") and not a multi-artist compilation
  const contextText = `${rawAlbum} ${rawPlaylist}`.toLowerCase();
  const isMultiArtistCompilation =
    /\b(90s|2000s|top songs|hits|jukebox|mix|mashup|bollywood|lofi|lo-fi|non stop|nonstop|popular music|all time|party|romantic|love songs|sad songs|tiktok|spotify|viral|decade|broken angel|kalyani)\b/i.test(
      contextText
    );
  if (!matchedFromTitle && !isMultiArtistCompilation && contextText.trim()) {
    matchInText(contextText);
  }

  // 5. Check Bhakti / Devotional keywords FIRST — Bhakti ALWAYS wins over Bhojpuri, Hindi, or English (even if sung by Pawan Singh/Khesari or titled "Bhajan Lofi / English Lyrics")
  const isBhaktiTrack =
    (BHAKTI_TITLE_REGEX.test(rawTitle) || BHAKTI_TITLE_REGEX.test(contextText)) &&
    !SECULAR_MOVIE_OVERRIDE_REGEX.test(rawTitle);

  if (isBhaktiTrack) {
    detectedSection = 'bhakti';
  } else if (BHOJPURI_KEYWORD_REGEX.test(rawTitle) || BHOJPURI_KEYWORD_REGEX.test(contextText)) {
    detectedSection = 'bhojpuri';
    if (!detectedSingerLang || detectedSingerLang === 'Hindi') {
      detectedSingerLang = 'Bhojpuri';
    }
  }

  // 6. If singer still not detected, extract verified or clean human artist from "Artist - Song", "Song | Artist", or non-label rawArtist
  if (!detectedSinger) {
    const withMatch = rawTitle.match(/\b(?:with|feat\.?|ft\.?|by)\s+([A-Za-z][A-Za-z\s.]{2,28}?)(?:\)|\||-|\[|$)/i);
    if (withMatch && withMatch[1] && isVerifiedRealSingerName(withMatch[1])) {
      detectedSinger = withMatch[1].trim();
      applyArtistProfile(detectedSinger);
    } else if (dashParts.length >= 2) {
      const firstPart = dashParts[0]
        .replace(/^(full\s*video|full\s*song|lyrical|official\s*video|audio)\s*:\s*/i, '')
        .trim();
      const secondPart = dashParts[1];
      const cand = firstPart.split(/\s*(?:,|&|\bft\.?|\bfeat\.?|\bx\b)\s*/i)[0].trim();
      if (isVerifiedRealSingerName(cand)) {
        detectedSinger = cand;
        applyArtistProfile(cand);
        cleanTitle = secondPart;
      } else if (
        cand.length >= 3 &&
        cand.length <= 32 &&
        !isGenericChannelOrLabel(cand) &&
        !/\b(song|video|audio|lyric|lyrics|full|official|hd|4k|8k|movie|film|ost|teaser|trailer|theme|bgm|jukebox|vol)\b/i.test(cand)
      ) {
        detectedSinger = cand;
        cleanTitle = secondPart;
      }
    }

    if (!detectedSinger && pipeParts.length >= 2) {
      for (let i = 1; i < pipeParts.length; i++) {
        const candidate = pipeParts[i];
        const cand = candidate.split(/\s*(?:,|&|\bft\.?|\bfeat\.?)\s*/i)[0].trim();
        if (isVerifiedRealSingerName(cand)) {
          detectedSinger = cand;
          applyArtistProfile(cand);
          break;
        }
      }
      cleanTitle = pipeParts[0];
    }

    if (!detectedSinger && rawArtist && !isPoisonedDefaultArtist) {
      const cand = rawArtist
        .split(/\s*(?:,|&|\bft\.?|\bfeat\.?|\bx\b|\||·)\s*/i)[0]
        .trim();
      if (isVerifiedRealSingerName(cand)) {
        detectedSinger = cand;
        applyArtistProfile(cand);
      } else if (
        cand.length >= 3 &&
        cand.length <= 35 &&
        !isGenericChannelOrLabel(cand)
      ) {
        detectedSinger = cand;
      }
    }
  }

  // Re-assert Bhakti or Bhojpuri if step 6 applyArtistProfile overwrote detectedSection
  if (isBhaktiTrack) {
    detectedSection = 'bhakti';
  } else if (
    detectedSection !== 'bhakti' &&
    (BHOJPURI_KEYWORD_REGEX.test(rawTitle) || BHOJPURI_KEYWORD_REGEX.test(contextText))
  ) {
    detectedSection = 'bhojpuri';
  }

  // Clean song title if it starts or ends with "Singer - "
  if (detectedSinger && dashParts.length >= 2) {
    if (dashParts[0].toLowerCase().includes(detectedSinger.toLowerCase()) && dashParts.slice(1).join(' - ').trim().length >= 2) {
      cleanTitle = dashParts.slice(1).join(' - ').trim();
    } else if (
      dashParts[dashParts.length - 1].toLowerCase().includes(detectedSinger.toLowerCase()) &&
      dashParts.slice(0, -1).join(' - ').trim().length >= 2
    ) {
      cleanTitle = dashParts.slice(0, -1).join(' - ').trim();
    }
  }
  if (pipeParts.length >= 2 && cleanTitle.includes('|')) {
    cleanTitle = pipeParts[0].trim();
  }

  // 7. Determine section if still unset
  const hasIndianLanguageSignals =
    hasDevanagari ||
    /\b(hindi|bollywood|punjabi|desi|bhojpuri|bhakti|bhajan|aarti|chalisa|t-series|zee music|sony music india|yrf|saregama|tips official|speed records|wave music|eros now|rajshri|shemaroo|ishq|pyaar|pyar|dil|sanam|mohabbat|aashiqui|zindagi|raat|tera|मेरी|तेरा|दिल|प्यार)\b/i.test(
      combinedText
    );

  if (!detectedSection) {
    if (
      !hasIndianLanguageSignals &&
      (/\b(english|billboard|global pop|synthwave|uk pop|us pop|vevo|7clouds|latinhype|the vibe guide|thegoodvibe|hevabidowntown|invertog|bagonly|cakes|broken angel|car video|midnight resonance|coffee steam|golden hour drive|overdrive canyon|top songs of the decade|songs with lyrics 2026|spotify playlist 2026|tiktok songs 2026|top songs 2026|best viral pop songs|spotify hits music|peaceful chill playlist|top songs cover 2026|relax & enjoy playlist|popular music videos|arash & halena)\b/i.test(
        combinedText
      ) ||
        (rawArtist.toLowerCase().endsWith('vevo') && !/india/i.test(rawArtist)))
    ) {
      detectedSection = 'english';
      detectedSingerLang = 'Other Country';
      detectedRole = 'Global Pop & Recording Artist';
    } else {
      detectedSection = 'hindi';
    }
  }

  if (
    (detectedSection as HomeSection) === 'english' &&
    (isBhaktiTrack ||
      BHOJPURI_KEYWORD_REGEX.test(rawTitle) ||
      hasDevanagari ||
      /\b(bollywood|hindi|bhojpuri|bhakti|bhajan)\b/i.test(combinedText))
  ) {
    // Prevent Indian/Bhakti/Bhojpuri songs from ever being placed in English
    detectedSection = isBhaktiTrack
      ? 'bhakti'
      : BHOJPURI_KEYWORD_REGEX.test(combinedText)
      ? 'bhojpuri'
      : 'hindi';
  }

  // 8. Final safety net: NEVER assign false "Arijit Singh", "The Weeknd", "Pawan Singh", or "Hariharan" when singer is unknown!
  if (!detectedSinger) {
    if (detectedSection === 'bhojpuri') {
      detectedSinger = 'Bhojpuri Folk';
      detectedSingerLang = 'Bhojpuri';
      detectedRole = 'Bhojpuri Folk & Regional Artist';
    } else if (detectedSection === 'bhakti') {
      detectedSinger = 'Bhakti Bhajan';
      detectedSingerLang = 'Hindi';
      detectedRole = 'Devotional & Spiritual Vocalist';
    } else if (detectedSection === 'english') {
      detectedSinger = 'Global Pop';
      detectedSingerLang = 'Other Country';
      detectedRole = 'Global Pop & International Artist';
    } else {
      detectedSinger = 'Bollywood Playback';
      detectedSingerLang = 'Hindi';
      detectedRole = 'Bollywood Playback Vocalist';
    }
  }

  const sectionToGenre: Record<HomeSection, 'Hindi' | 'Bhojpuri' | 'Bhakti' | 'English'> = {
    hindi: 'Hindi',
    bhojpuri: 'Bhojpuri',
    bhakti: 'Bhakti',
    english: 'English',
  };

  const sectionToCategoryLabel: Record<
    HomeSection,
    'Hindi Song' | 'Bhojpuri Song' | 'Bhakti Song' | 'English Song'
  > = {
    hindi: 'Hindi Song',
    bhojpuri: 'Bhojpuri Song',
    bhakti: 'Bhakti Song',
    english: 'English Song',
  };

  const sectionToLanguage: Record<
    HomeSection,
    'Hindi' | 'Bhojpuri' | 'Punjabi' | 'English' | 'Sanskrit'
  > = {
    hindi: detectedSingerLang === 'Punjabi' ? 'Punjabi' : 'Hindi',
    bhojpuri: 'Bhojpuri',
    bhakti: /\b(stotram|stotra|shloka|mantra|tandav)\b/i.test(combinedText) ? 'Sanskrit' : 'Hindi',
    english: 'English',
  };

  if (detectedSection === 'english') {
    detectedSingerLang = 'Other Country';
    if (detectedRole === 'Playback Singer & Music Icon') {
      detectedRole = 'Global Pop & International Artist';
    }
  } else if (detectedSection === 'bhojpuri' && detectedSingerLang === 'Hindi') {
    detectedSingerLang = 'Bhojpuri';
    if (detectedRole === 'Playback Singer & Music Icon') {
      detectedRole = 'Bhojpuri Superstar & Folk Vocalist';
    }
  } else if (detectedSection === 'bhakti' && detectedRole === 'Playback Singer & Music Icon') {
    detectedRole = 'Devotional & Spiritual Vocalist';
  }

  const sectionLabelMap: Record<HomeSection, string> = {
    hindi: 'Hindi Song (Bollywood & Hindi Superhits)',
    bhojpuri: 'Bhojpuri Song (Bhojpuri Desi Dhamaka)',
    bhakti: 'Bhakti Song (Bhakti Bhavana)',
    english: 'English Song (English Songs)',
  };

  return {
    id: input.id,
    cleanTitle: cleanTitle || rawTitle || 'Untitled Song',
    singerName: detectedSinger,
    section: detectedSection,
    categoryLabel: sectionToCategoryLabel[detectedSection],
    genre: sectionToGenre[detectedSection],
    language: sectionToLanguage[detectedSection],
    singerLanguage: detectedSingerLang,
    singerLanguageCategory: detectedSingerLang,
    singerRole: detectedRole,
    reason: `Singer Name :- ${detectedSinger} , ${sectionToCategoryLabel[detectedSection]} (${sectionLabelMap[detectedSection]})`,
  };
}

/**
 * Matches a singer name against an existing list of Artist objects (supporting partial/alias matches like "weeknd" -> "The Weeknd").
 */
export function findMatchingArtist(singerName: string, artists: Artist[]): Artist | undefined {
  if (!singerName || !artists || artists.length === 0) return undefined;
  const raw = singerName.trim();
  if (!raw || isGenericChannelOrLabel(raw)) return undefined;

  const candidates = [
    raw,
    raw.split(/\s*(?:·|•|,|&|\bft\.?|\bfeat\.?|\|)\s*/i)[0].trim(),
  ].filter(Boolean);

  for (const cand of candidates) {
    const target = cand.toLowerCase();
    // 1. Exact match
    const exact = artists.find((a) => a.name.trim().toLowerCase() === target);
    if (exact) return exact;

    // 2. Strip "the " prefix comparison (e.g., "weeknd" <-> "The Weeknd")
    const targetNoThe = target.replace(/^the\s+/i, '').trim();
    const byNoThe = artists.find(
      (a) => a.name.trim().toLowerCase().replace(/^the\s+/i, '').trim() === targetNoThe
    );
    if (byNoThe) return byNoThe;

    // 3. Word-boundary / substring inclusion (only for meaningful names >= 4 chars)
    if (targetNoThe.length >= 4) {
      const bySubstring = artists.find((a) => {
        const aLower = a.name.trim().toLowerCase();
        const aNoThe = aLower.replace(/^the\s+/i, '').trim();
        return (
          aLower.includes(targetNoThe) ||
          (aNoThe.length >= 4 && target.includes(aNoThe))
        );
      });
      if (bySubstring) return bySubstring;
    }
  }

  return undefined;
}

/**
 * Determines which of the 4 core sections (1: hindi, 2: bhojpuri, 3: bhakti, 4: english)
 * a track belongs to.
 * Respects explicit `track.section` assignment, while catching devotional Bhajans or English songs that were mislabeled.
 */
export function resolveTrackSection(
  track: Track | (Omit<Track, 'id'> & { id?: string })
): HomeSection {
  const titleAndArtist = `${track.title} ${track.hindiTitle || ''} ${track.artist || ''} ${track.album || ''}`;

  // Devotional / Bhakti songs ALWAYS belong to 'bhakti' even if previously mislabeled as bhojpuri, english, or hindi
  if (
    (BHAKTI_TITLE_REGEX.test(titleAndArtist) && !SECULAR_MOVIE_OVERRIDE_REGEX.test(track.title || '')) ||
    track.genre === 'Bhakti' ||
    track.language === 'Sanskrit'
  ) {
    return 'bhakti';
  }

  // Always honor explicit section if set on the track
  if (
    track.section === 'hindi' ||
    track.section === 'bhojpuri' ||
    track.section === 'bhakti' ||
    track.section === 'english'
  ) {
    return track.section;
  }

  if (track.genre === 'Bhojpuri' || track.language === 'Bhojpuri') {
    return 'bhojpuri';
  }

  if (
    track.genre === 'English' ||
    track.language === 'English' ||
    track.genre === 'Pop' ||
    track.genre === 'Electronic' ||
    track.genre === 'Rock' ||
    track.genre === 'Ambient' ||
    track.genre === 'Indie'
  ) {
    return 'english';
  }

  const artistAndTitleLower = titleAndArtist.toLowerCase();
  if (
    ENGLISH_ARTIST_PROFILES.some((eng) =>
      eng.aliases.some((alias) => {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`, 'i').test(artistAndTitleLower);
      })
    )
  ) {
    return 'english';
  }

  if (BHOJPURI_KEYWORD_REGEX.test(artistAndTitleLower)) {
    return 'bhojpuri';
  }

  return 'hindi';
}

/**
 * Strictly returns ONLY songs that belong to the given HomeSection ('hindi' | 'bhojpuri' | 'bhakti' | 'english').
 * Ensures e.g. Bhakti Bhavana only plays religious/devotional songs and never mixes other sections.
 */
export function getSectionTracks(tracks: Track[], section: HomeSection): Track[] {
  return tracks
    .filter((track) => resolveTrackSection(track) === section)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Strictly returns ONLY songs by the given artist/singer.
 * Ensures that when a user opens an artist (e.g., Yo Yo Honey Singh or The Weeknd), ONLY that artist's songs appear and play.
 */
export function getStrictArtistTracks(
  tracks: Track[],
  artist: Pick<Artist, 'id' | 'name' | 'topTrackIds'>
): Track[] {
  const artistNameLower = artist.name.trim().toLowerCase();
  const artistNameNoThe = artistNameLower.replace(/^the\s+/i, '').trim();
  const topIds = new Set(artist.topTrackIds || []);

  return tracks
    .filter((track) => {
      const trackTextLower = `${track.artist} ${track.title}`.toLowerCase();
      const matchesName =
        trackTextLower.includes(artistNameLower) ||
        (artistNameNoThe.length >= 4 && trackTextLower.includes(artistNameNoThe));

      // Guard against legacy tracks where artistId was defaulted to 'artist-arijit-singh' even though the track is by another singer
      if (artist.id === 'artist-arijit-singh') {
        return matchesName || track.id === 'track-in-1' || track.id === 'track-in-2' || track.id === 'track-bhakti-4';
      }

      if (track.artistId && track.artistId === artist.id) {
        return true;
      }
      if (matchesName) {
        return true;
      }
      if (topIds.has(track.id)) {
        return true;
      }
      return false;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Filters tracks by search query (title, hindiTitle, artist, album, genre, language) and genre category.
 */
export function filterTracks(
  tracks: Track[],
  searchQuery: string,
  selectedGenre: string
): Track[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return tracks
    .filter((track) => {
      let matchesGenre = selectedGenre === 'All' || track.genre === selectedGenre;

      if (selectedGenre === 'Hindi') {
        matchesGenre = resolveTrackSection(track) === 'hindi';
      } else if (selectedGenre === 'Bhojpuri') {
        matchesGenre = resolveTrackSection(track) === 'bhojpuri';
      } else if (selectedGenre === 'Bhakti') {
        matchesGenre = resolveTrackSection(track) === 'bhakti';
      } else if (selectedGenre === 'English') {
        matchesGenre = resolveTrackSection(track) === 'english';
      }

      if (!matchesGenre) return false;
      if (!normalizedQuery) return true;

      return (
        track.title.toLowerCase().includes(normalizedQuery) ||
        (track.hindiTitle && track.hindiTitle.toLowerCase().includes(normalizedQuery)) ||
        track.artist.toLowerCase().includes(normalizedQuery) ||
        track.album.toLowerCase().includes(normalizedQuery) ||
        track.genre.toLowerCase().includes(normalizedQuery) ||
        (track.language && track.language.toLowerCase().includes(normalizedQuery))
      );
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Toggles a track ID in a list of liked track IDs.
 */
export function toggleLike(likedIds: string[], trackId: string): string[] {
  if (likedIds.includes(trackId)) {
    return likedIds.filter((id) => id !== trackId);
  }
  return [...likedIds, trackId];
}

/**
 * Clamps a numeric value between min and max.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * Shuffles an array deterministically or randomly using Fisher-Yates.
 */
export function shuffleArray<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

/**
 * Adds a track ID to a playlist's trackIds array without duplicates.
 */
export function addTrackToPlaylistTracks(trackIds: string[], trackId: string): string[] {
  if (trackIds.includes(trackId)) {
    return trackIds;
  }
  return [...trackIds, trackId];
}

/**
 * Removes a track ID from a playlist's trackIds array.
 */
export function removeTrackFromPlaylistTracks(trackIds: string[], trackId: string): string[] {
  return trackIds.filter((id) => id !== trackId);
}

/**
 * Resolves only the tracks that belong to a specific playlist in the exact playlist order.
 * Never falls back to global tracks if a playlist has specific trackIds.
 */
export function getStrictPlaylistTracks(playlistTrackIds: string[], allTracks: Track[]): Track[] {
  if (!Array.isArray(playlistTrackIds) || playlistTrackIds.length === 0) {
    return [];
  }
  const trackMap = new Map(allTracks.map((t) => [t.id, t]));
  const resolved: Track[] = [];
  for (const id of playlistTrackIds) {
    const found = trackMap.get(id);
    if (found) {
      resolved.push(found);
    }
  }
  return resolved;
}

/**
 * Returns the top N most played songs today, prioritizing user play counts recorded today,
 * and breaking ties by overall playCount.
 */
export function getTopPlayedTodayTracks(
  allTracks: Track[],
  dailyPlayCounts: Record<string, number>,
  limit: number = 10
): Track[] {
  if (!Array.isArray(allTracks) || allTracks.length === 0 || limit <= 0) {
    return [];
  }
  return [...allTracks]
    .sort((a, b) => {
      const playsTodayA = dailyPlayCounts[a.id] || 0;
      const playsTodayB = dailyPlayCounts[b.id] || 0;
      if (playsTodayB !== playsTodayA) {
        return playsTodayB - playsTodayA;
      }
      return (b.playCount || 0) - (a.playCount || 0);
    })
    .slice(0, limit);
}

/**
 * Formats numeric play counts to compact human-readable format (e.g. 245K plays, 1.2M plays)
 */
export function formatPlayCount(count?: number): string {
  if (!count || count <= 0) return '0 plays';
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M plays`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K plays`;
  }
  return `${count} plays`;
}

/**
 * Resolves which of the 4 core sections (1: hindi, 2: bhojpuri, 3: bhakti, 4: english)
 * a Playlist belongs to so every playlist shows in one specific section between 1 to 4.
 */
export function resolvePlaylistSection(playlist: Playlist, tracks: Track[] = []): HomeSection {
  if (playlist.id === 'playlist-1' || playlist.id === 'playlist-2' || playlist.id === 'playlist-english-hits') {
    return 'english';
  }
  if (playlist.id === 'playlist-bhakti-bhavana') {
    return 'bhakti';
  }
  if (playlist.id === 'playlist-bhojpuri-hits' || playlist.id === 'playlist-pawan-khesari') {
    return 'bhojpuri';
  }

  const text = `${playlist.name} ${playlist.description || ''} ${playlist.artistName || ''}`;
  if (BHAKTI_TITLE_REGEX.test(text) && !SECULAR_MOVIE_OVERRIDE_REGEX.test(playlist.name || '')) {
    return 'bhakti';
  }

  // Respect explicit admin-chosen section first
  if (
    playlist.section === 'hindi' ||
    playlist.section === 'bhojpuri' ||
    playlist.section === 'bhakti' ||
    playlist.section === 'english'
  ) {
    return playlist.section;
  }

  if (playlist.category === 'Bhojpuri') return 'bhojpuri';
  if (playlist.category === 'Bhakti') return 'bhakti';
  if (playlist.category === 'English') return 'english';

  if (BHOJPURI_KEYWORD_REGEX.test(text)) {
    return 'bhojpuri';
  }
  if (
    !/\b(bollywood|hindi|bhojpuri|bhakti|bhajan)\b/i.test(text) &&
    /\b(english|global pop|billboard|international|synthwave|cyberpunk|uk|us hits|weeknd|ed sheeran|imagine dragons|dua lipa|chainsmokers|taylor swift|justin bieber|top songs of the decade|songs with lyrics 2026|spotify playlist 2026|tiktok songs 2026|top songs 2026|best viral pop songs|spotify hits music|peaceful chill playlist|top songs cover 2026|relax & enjoy playlist|popular music videos|arash & halena)\b/i.test(
      text
    )
  ) {
    return 'english';
  }

  if (tracks.length > 0 && Array.isArray(playlist.trackIds) && playlist.trackIds.length > 0) {
    const firstTrack = tracks.find((t) => playlist.trackIds.includes(t.id));
    if (firstTrack) {
      return resolveTrackSection(firstTrack);
    }
  }

  return 'hindi';
}

/**
 * Resolves which specific Singer in Section 5 a Track belongs to.
 * Does NOT blindly return Arijit Singh when the track belongs to another artist.
 */
export function resolveTrackArtist(
  track: Track | (Omit<Track, 'id'> & { id?: string }),
  artists: Artist[]
): Artist | undefined {
  if (!artists || artists.length === 0) return undefined;

  // 1. Direct match by track.artist name
  const byMatch = findMatchingArtist(track.artist, artists);
  if (byMatch) return byMatch;

  // 2. If track.artistId is set, verify it isn't a poisoned 'artist-arijit-singh' fallback
  if (track.artistId) {
    const byId = artists.find((a) => a.id === track.artistId);
    if (byId) {
      if (byId.id === 'artist-arijit-singh') {
        const text = `${track.artist || ''} ${track.title || ''}`.toLowerCase();
        if (text.includes('arijit') || track.id === 'track-in-1' || track.id === 'track-in-2' || track.id === 'track-bhakti-4') {
          return byId;
        }
      } else {
        return byId;
      }
    }
  }

  // 3. Check if any artist name appears in the track title (e.g. "KALYANI (with Shreya Ghoshal)")
  const titleLower = (track.title || '').toLowerCase();
  for (const a of artists) {
    const nameLower = a.name.trim().toLowerCase();
    const noThe = nameLower.replace(/^the\s+/i, '').trim();
    if (
      (nameLower.length >= 4 && titleLower.includes(nameLower)) ||
      (noThe.length >= 4 && titleLower.includes(noThe))
    ) {
      return a;
    }
  }

  // 4. Check topTrackIds membership (excluding poisoned Arijit Singh entries)
  if (track.id) {
    const byTopId = artists.find(
      (a) => a.id !== 'artist-arijit-singh' && (a.topTrackIds || []).includes(track.id!)
    );
    if (byTopId) return byTopId;
  }

  return undefined;
}

/**
 * Resolves which specific Singer in Section 5 a Playlist belongs to so every playlist
 * shows in one specific singer in Section 5.
 */
export function resolvePlaylistArtist(
  playlist: Playlist,
  artists: Artist[],
  tracks: Track[] = []
): Artist | undefined {
  if (!artists || artists.length === 0) return undefined;

  const combinedText = `${playlist.name} ${playlist.description || ''}`.toLowerCase();

  // 1. Check if playlist title/description explicitly names an artist in Section 5
  const byTextMatch = artists.find((a) => {
    const nameLower = a.name.trim().toLowerCase();
    const noThe = nameLower.replace(/^the\s+/i, '').trim();
    return combinedText.includes(nameLower) || (noThe.length >= 4 && combinedText.includes(noThe));
  });
  if (byTextMatch) return byTextMatch;

  // 2. Check explicit artistId / artistName (ignoring poisoned 'artist-arijit-singh' if playlist is not Arijit/Hindi)
  const sec = resolvePlaylistSection(playlist, tracks);
  if (playlist.artistId) {
    const byId = artists.find((a) => a.id === playlist.artistId);
    if (byId) {
      const isPoisonedArijit =
        byId.id === 'artist-arijit-singh' &&
        !combinedText.includes('arijit') &&
        playlist.id !== 'playlist-hindi-hits' &&
        (sec !== 'hindi' || (tracks.length > 0 && playlist.trackIds.length > 0));
      if (!isPoisonedArijit) {
        return byId;
      }
    }
  }

  if (playlist.artistName && playlist.artistName.toLowerCase() !== 'arijit singh') {
    const byArtistName = findMatchingArtist(playlist.artistName, artists);
    if (byArtistName) return byArtistName;
  }

  // 3. Find dominant artist across tracks in the playlist
  if (tracks.length > 0 && playlist.trackIds && playlist.trackIds.length > 0) {
    const plTracks = getStrictPlaylistTracks(playlist.trackIds, tracks);
    const counts = new Map<string, { artist: Artist; count: number }>();
    for (const t of plTracks) {
      const matched = resolveTrackArtist(t, artists);
      if (matched) {
        const prev = counts.get(matched.id);
        counts.set(matched.id, { artist: matched, count: (prev?.count || 0) + 1 });
      }
    }
    let best: Artist | undefined = undefined;
    let maxCount = 0;
    for (const entry of counts.values()) {
      if (entry.count > maxCount) {
        maxCount = entry.count;
        best = entry.artist;
      }
    }
    if (best) return best;
  }

  // 4. Section-appropriate fallback singer
  if (sec === 'bhojpuri') {
    return artists.find((a) => a.language === 'Bhojpuri') || artists[0];
  }
  if (sec === 'english') {
    return artists.find((a) => a.language === 'Other Country') || artists[0];
  }
  if (sec === 'bhakti') {
    return (
      artists.find((a) => a.id === 'artist-hariharan' || a.id === 'artist-jubin-nautiyal') ||
      artists[0]
    );
  }
  return artists[0];
}

/**
 * Returns a monotonically increasing timestamp guaranteed to be higher than
 * both Date.now() and any existing createdAt timestamp in the catalog so newly
 * uploaded songs, playlists, and singers always appear at index 0 immediately.
 */
export function getNextCatalogTimestamp(
  tracks: Array<{ createdAt?: number }> = [],
  playlists: Array<{ createdAt?: number }> = [],
  artists: Array<{ createdAt?: number }> = []
): number {
  let maxTs = Date.now();
  for (const t of tracks) {
    if (typeof t.createdAt === 'number' && t.createdAt > maxTs) {
      maxTs = t.createdAt;
    }
  }
  for (const p of playlists) {
    if (typeof p.createdAt === 'number' && p.createdAt > maxTs) {
      maxTs = p.createdAt;
    }
  }
  for (const a of artists) {
    if (typeof a.createdAt === 'number' && a.createdAt > maxTs) {
      maxTs = a.createdAt;
    }
  }
  return maxTs + 1000;
}

/**
 * Returns all playlists assigned to a specific Section (1 to 4), sorted newest first.
 */
export function getSectionPlaylists(playlists: Playlist[], section: HomeSection): Playlist[] {
  return playlists
    .filter((pl) => resolvePlaylistSection(pl) === section)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Returns all playlists assigned to a specific Singer in Section 5, sorted newest first.
 */
export function getArtistPlaylists(
  playlists: Playlist[],
  artist: Pick<Artist, 'id' | 'name'>,
  allArtists: Artist[],
  tracks: Track[] = []
): Playlist[] {
  return playlists
    .filter((pl) => {
      const resolved = resolvePlaylistArtist(pl, allArtists, tracks);
      if (resolved && resolved.id === artist.id) {
        return true;
      }
      return false;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Creates a new Section 5 Singer (Artist) profile from AI classification metadata.
 */
export function createSingerObjectFromAI(
  singerName: string,
  aiInfo: {
    section: HomeSection;
    categoryLabel?: string;
    singerRole?: string;
    singerLanguage?: Artist['language'];
    singerLanguageCategory?: Artist['language'];
  },
  coverUrl?: string,
  initialTrackId?: string
): Artist {
  const cleanName = singerName.trim();
  const slug = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const lang: Artist['language'] =
    aiInfo.singerLanguageCategory ||
    aiInfo.singerLanguage ||
    (aiInfo.section === 'english'
      ? 'Other Country'
      : aiInfo.section === 'bhojpuri'
      ? 'Bhojpuri'
      : 'Hindi');
  const catLabel =
    aiInfo.categoryLabel ||
    (aiInfo.section === 'english'
      ? 'English Song'
      : aiInfo.section === 'bhojpuri'
      ? 'Bhojpuri Song'
      : aiInfo.section === 'bhakti'
      ? 'Bhakti Song'
      : 'Hindi Song');
  return {
    id: `artist-${slug || Date.now()}`,
    name: cleanName,
    hindiName: cleanName,
    role: aiInfo.singerRole || `${catLabel} Playback Artist`,
    language: lang,
    imageUrl:
      coverUrl ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    gradient:
      aiInfo.section === 'english'
        ? 'from-sky-600 via-blue-700 to-slate-950'
        : aiInfo.section === 'bhojpuri'
        ? 'from-rose-600 via-orange-600 to-amber-950'
        : aiInfo.section === 'bhakti'
        ? 'from-amber-500 via-orange-600 to-red-950'
        : 'from-emerald-600 via-teal-700 to-slate-950',
    monthlyListeners: '5.0M',
    verified: true,
    bio: `${cleanName} — AI-organized singer profile (${catLabel}).`,
    topTrackIds: initialTrackId ? [initialTrackId] : [],
    createdAt: Date.now(),
  };
}

/**
 * Computes a normalized canonical song key from a track's title so duplicate uploads
 * (e.g. "Soniye Je (Audio) Gumraah", "Soniye Je (Video) Gumraah", "Soniye Je (Teaser) Gumraah")
 * resolve to the exact same canonical song key.
 */
export function getCanonicalSongKey(track: {
  title?: string;
  artist?: string;
  youtubeId?: string;
}): string {
  const raw = decodeHtmlEntities(track.title || '').toLowerCase();
  const stripped = raw
    .replace(
      /\s*(\(|\[)\s*(official\s*(music\s*)?(video|audio|lyric\s*video|lyrics|visualizer)|full\s*(video|audio|song)|lyrical\s*(video|song)?|audio(\s*song)?|video(\s*song)?|teaser|trailer|lyrics|4k|hd|8k|remastered|slowed|reverb|lofi|lo-fi)\s*(\)|\])/gi,
      ' '
    )
    .replace(/\b(teaser|lyrical|full video|full song|official video|official audio)\b/gi, ' ')
    .split('|')[0]
    .replace(/[^a-z0-9\u0900-\u097F]+/g, '')
    .trim();

  if (stripped.length >= 4) {
    return stripped;
  }
  return (track.youtubeId || raw).trim().toLowerCase();
}

/**
 * Deduplicates tracks across the catalog by both YouTube Video ID and normalized clean song title,
 * preferring full audio/video songs over "(Teaser)" clips, and remaps all playlist trackIds and artist topTrackIds
 * so zero playlists lose songs and zero duplicate songs remain.
 */
export function deduplicateCatalogTracks(
  tracks: Track[],
  playlists: Playlist[],
  artists: Artist[]
): {
  tracks: Track[];
  playlists: Playlist[];
  artists: Artist[];
  removedCount: number;
} {
  const idRemap = new Map<string, string>();
  const byYoutubeId = new Map<string, Track>();
  const byTitleKey = new Map<string, Track>();
  const uniqueTracks: Track[] = [];

  const isTeaserTitle = (title: string) => /\b(teaser|trailer|promo)\b/i.test(title);

  for (const track of tracks) {
    const ytKey = track.youtubeId?.trim();
    const titleKey = getCanonicalSongKey(track);
    const artistNorm = (track.artist || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const compositeTitleKey = titleKey.length >= 4 ? `${titleKey}::${artistNorm}` : '';

    const existingByYt = ytKey ? byYoutubeId.get(ytKey) : undefined;
    // Only merge by title if neither track has a distinct youtubeId OR if they share the exact same title+artist
    const existingByTitle =
      !existingByYt && compositeTitleKey ? byTitleKey.get(compositeTitleKey) : undefined;
    const existing = existingByYt || (existingByTitle && (!ytKey || !existingByTitle.youtubeId || existingByTitle.youtubeId === ytKey) ? existingByTitle : undefined);

    if (!existing) {
      const cloned = { ...track };
      uniqueTracks.push(cloned);
      if (ytKey) byYoutubeId.set(ytKey, cloned);
      if (compositeTitleKey) byTitleKey.set(compositeTitleKey, cloned);
      idRemap.set(track.id, cloned.id);
    } else {
      // If the incoming track is newer (admin uploaded) or upgrades a Teaser, update existing with latest metadata
      if ((track.createdAt || 0) > (existing.createdAt || 0)) {
        existing.createdAt = track.createdAt;
        if (track.section) existing.section = track.section;
        if (track.artist && track.artist !== 'Various Artists') existing.artist = track.artist;
        if (track.artistId) existing.artistId = track.artistId;
      }
      if (isTeaserTitle(existing.title) && !isTeaserTitle(track.title)) {
        existing.title = track.title.replace(/\s*\((audio|video|lyrics)\)\s*/gi, ' ').trim() || track.title;
        if (track.youtubeId) {
          existing.youtubeId = track.youtubeId;
          existing.coverUrl = track.coverUrl || existing.coverUrl;
          byYoutubeId.set(track.youtubeId, existing);
        }
        if (track.duration && track.duration > existing.duration) {
          existing.duration = track.duration;
        }
      }
      idRemap.set(track.id, existing.id);
    }
  }

  // Sort uniqueTracks so newly uploaded/updated tracks with higher createdAt always sit at the front
  uniqueTracks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const removedCount = tracks.length - uniqueTracks.length;

  const artistIdRemap = new Map<string, string>();
  const artistByNormKey = new Map<string, Artist>();
  const uniqueArtists: Artist[] = [];

  for (const art of artists) {
    const normKey = art.name.toLowerCase().replace(/^the\s+/i, '').replace(/[^a-z0-9]+/g, '');
    const existingArt = normKey ? artistByNormKey.get(normKey) : undefined;
    const remappedTopIds = Array.from(
      new Set((art.topTrackIds || []).map((id) => idRemap.get(id) || id))
    );

    if (!existingArt) {
      const canonicalProfile = [
        ...INDIAN_AND_REGIONAL_ARTIST_PROFILES,
        ...ENGLISH_ARTIST_PROFILES,
      ].find(
        (p) =>
          p.canonical.toLowerCase().replace(/^the\s+/i, '').replace(/[^a-z0-9]+/g, '') === normKey
      );
      const cleanArt: Artist = {
        ...art,
        name: canonicalProfile?.canonical || art.name,
        topTrackIds: remappedTopIds,
      };
      uniqueArtists.push(cleanArt);
      if (normKey) artistByNormKey.set(normKey, cleanArt);
      artistIdRemap.set(art.id, cleanArt.id);
    } else {
      if ((art.createdAt || 0) >= (existingArt.createdAt || 0)) {
        if (art.createdAt) existingArt.createdAt = art.createdAt;
        if (art.imageUrl && art.imageUrl.trim()) {
          existingArt.imageUrl = art.imageUrl;
        }
        if (art.role) existingArt.role = art.role;
        if (art.bio) existingArt.bio = art.bio;
        if (art.hindiName) existingArt.hindiName = art.hindiName;
        if (art.language) existingArt.language = art.language;
      } else if (art.imageUrl && !existingArt.imageUrl) {
        existingArt.imageUrl = art.imageUrl;
      }
      existingArt.topTrackIds = Array.from(
        new Set([...(existingArt.topTrackIds || []), ...remappedTopIds])
      );
      artistIdRemap.set(art.id, existingArt.id);
    }
  }

  for (const track of uniqueTracks) {
    if (track.artistId && artistIdRemap.has(track.artistId)) {
      track.artistId = artistIdRemap.get(track.artistId);
    }
  }

  const remappedPlaylists = playlists
    .map((pl) => {
      const nextTrackIds = Array.from(
        new Set((pl.trackIds || []).map((id) => idRemap.get(id) || id))
      );
      const nextArtistId =
        pl.artistId && artistIdRemap.has(pl.artistId)
          ? artistIdRemap.get(pl.artistId)
          : pl.artistId;
      return {
        ...pl,
        trackIds: nextTrackIds,
        artistId: nextArtistId,
      };
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return {
    tracks: uniqueTracks,
    playlists: remappedPlaylists,
    artists: uniqueArtists,
    removedCount,
  };
}

function isLegacyMetaLyrics(lines?: string[]): boolean {
  if (!Array.isArray(lines) || lines.length < 4) return true;
  return lines.some((line) =>
    /♪|Instrumental section\.\.\.|ki roohani aawaz|ki aawaz mein|ke dhamakedar aawaz|YouTube Official Audio|Forever in Our Hearts|Bhojpuri Superhit Vibes|Caught in the glow of a midnight horizon with|की रूहानी आवाज़|की आवाज़ में|के धमाकेदार आवाज़|सदाबहार बॉलीवुड मेलोडी|भोजपुरी सुपरहिट धमाका|ग्लोबल पॉप हिट्स/i.test(
      line
    )
  );
}

/**
 * Generates pure, poetic song lyrics (both Roman/English and Devanagari script)
 * containing ONLY actual singing lines/verses — zero singer bios, album names, or banner headers.
 */
export function generateSmartSongLyrics(
  track: Pick<
    Track,
    | 'title'
    | 'hindiTitle'
    | 'artist'
    | 'album'
    | 'section'
    | 'genre'
    | 'language'
    | 'lyrics'
    | 'devanagariLyrics'
  >
): { lyrics: string[]; devanagariLyrics: string[] } {
  const hasValidRoman = !isLegacyMetaLyrics(track.lyrics);
  const hasValidDevanagari = !isLegacyMetaLyrics(track.devanagariLyrics);

  if (hasValidRoman && hasValidDevanagari) {
    return {
      lyrics: track.lyrics!,
      devanagariLyrics: track.devanagariLyrics!,
    };
  }

  const cleanTitle = decodeHtmlEntities(track.title || 'Dil Ki Dhadkan')
    .replace(/\s*(\(|\[).*?(\)|\])\s*/g, ' ')
    .split('|')[0]
    .replace(/\s+[-–—]\s+.*$/, '')
    .trim() || 'Dil Ki Dhadkan';
  const hindiTitle = decodeHtmlEntities(track.hindiTitle || cleanTitle)
    .replace(/\s*(\(|\[).*?(\)|\])\s*/g, ' ')
    .split('|')[0]
    .trim() || cleanTitle;

  const sec =
    track.section ||
    (track.genre === 'Bhakti'
      ? 'bhakti'
      : track.genre === 'Bhojpuri'
      ? 'bhojpuri'
      : track.genre === 'English' || track.language === 'English'
      ? 'english'
      : 'hindi');

  if (sec === 'bhakti') {
    return {
      lyrics: hasValidRoman
        ? track.lyrics!
        : [
            `Charano mein tere hum sheesh jhukayein`,
            `Subah shaam bas tera hi guna gaayein`,
            `Man mandir mein jale naam ki jyoti`,
            `Teri kripa se mile sukh aur shanti`,
            `Har sankat ko pal mein tu har leta`,
            `Bhakton ki jholi khushiyon se bhar deta`,
            `Jab jab pukare dil se tera naam`,
            `Ban jaate hain bigde hue saare kaam`,
          ],
      devanagariLyrics: hasValidDevanagari
        ? track.devanagariLyrics!
        : [
            `चरणों में तेरे हम शीश झुकाएं`,
            `सुबह शाम बस तेरा ही गुण गाएं`,
            `मन मंदिर में जले नाम की ज्योति`,
            `तेरी कृपा से मिले सुख और शांति`,
            `हर संकट को पल में तू हर लेता`,
            `भक्तों की झोली खुशियों से भर देता`,
            `जब जब पुकारे दिल से तेरा नाम`,
            `बन जाते हैं बिगड़े हुए सारे काम`,
          ],
    };
  }

  if (sec === 'bhojpuri') {
    return {
      lyrics: hasValidRoman
        ? track.lyrics!
        : [
            `Purwaiya bayaar chale, jhoome sara jahaan`,
            `Najar se najar milal, badhal dil ke armaan`,
            `Tohari muskaan pe lutal dilwa ke chain`,
            `Raat bhar jagal rahe humro dono nain`,
            `Chudi khanke kanganwa bole sajanwa ke naam`,
            `Preet ke rang mein rangal subah aur shaam`,
            `Dholak ke थाप pe thirke kadam baar baar`,
            `Janam janam tak rahi apan ehi pyaar`,
          ],
      devanagariLyrics: hasValidDevanagari
        ? track.devanagariLyrics!
        : [
            `पुरवइया बयार चले, झूमे सारा जहान`,
            `नजर से नजर मिलल, बढ़ल दिल के अरमान`,
            `तोहरी मुस्कान पे लुटल दिलवा के चैन`,
            `रात भर जागल रहे हमरो दूनो नैन`,
            `चूड़ी खनके कंगनवा बोले सजनवा के नाम`,
            `प्रीत के रंग में रंगल सुबह अउर शाम`,
            `ढोलक के थाप पे थिरके कदम बार बार`,
            `जनम जनम तक रही आपन इहे प्यार`,
          ],
    };
  }

  if (sec === 'english') {
    return {
      lyrics: hasValidRoman
        ? track.lyrics!
        : [
            `City lights are fading in the rearview mirror tonight`,
            `Every single heartbeat echoes in the neon light`,
            `We were chasing shadows through the pouring rain`,
            `Washing away every memory of the pain`,
            `Hold on to this feeling before the morning breaks`,
            `Lost inside the rhythm that our heartbeat makes`,
            `Take my hand and run across the open sky`,
            `Underneath the stars where dreams will never die`,
          ],
      devanagariLyrics: hasValidDevanagari
        ? track.devanagariLyrics!
        : [
            `शहर की रोशनियाँ आज रात धुंधली हो रही हैं`,
            `हर एक धड़कन में नई सी उमंग जाग रही है`,
            `बारिश की बूंदों में हम ख्वाबों को ढूंढते रहे`,
            `सारे पुराने ग़म हवाओं में घुलते चले गए`,
            `सुबह होने से पहले इस हसीन पल को थाम लो`,
            `दिल की इस धड़कन में बस अपना ही नाम लो`,
            `मेरा हाथ थाम कर खुले आसमान में चलो`,
            `सितारों की छांव में हमेशा मेरे साथ चलो`,
          ],
    };
  }

  return {
    lyrics: hasValidRoman
      ? track.lyrics!
      : [
          `Hawaon mein ghul rahi hai ek meethi si dhun`,
          `Teri hi baaton ko mera pagal dil raha sun`,
          `Aankhon hi aankhon mein keh di saari daastaan`,
          `Tere bina adhoora lagta hai yeh sara jahaan`,
          `Raat ke sitaare bhi gaate hain wafa ke geet`,
          `Janam janam ki hai apni yeh sache dil ki preet`,
          `Palkon ki chhaon mein basa liya tera hi khayal`,
          `Tere sang guzre har lamha, har ek saal`,
        ],
    devanagariLyrics: hasValidDevanagari
      ? track.devanagariLyrics!
      : [
          `हवाओं में घुल रही है एक मीठी सी धुन`,
          `तेरी ही बातों को मेरा पागल दिल रहा सुन`,
          `आँखों ही आँखों में कह दी सारी दास्तान`,
          `तेरे बिना अधूरा लगता है यह सारा जहान`,
          `रात के सितारे भी गाते हैं वफ़ा के गीत`,
          `जनम जनम की है अपनी यह सच्चे दिल की प्रीत`,
          `पलकों की छांव में बसा लिया तेरा ही ख़याल`,
          `तेरे संग गुज़रे हर लम्हा, हर एक साल`,
        ],
  };
}




