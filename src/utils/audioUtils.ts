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
  /\b(bhakti|bhajan|aarti|chalisa|stotram|stotra|shloka|kirtan|devotional|hanuman|mahadev|mahadeva|bholenath|shambhu|achyutam|keshavam|jagdish hare|ganpati|vaishno|khatu shyam|jai shree ram|ram siya ram|ram lala|ram aayenge|saanwre shyam|shri krishna|radhe krishna|govind bolo|har har shambhu|har har mahadev|shiv tandav|om jai jagdish|meri maa ke barabar|deva deva|namo namo|shankara)\b/i;

const BHOJPURI_KEYWORD_REGEX =
  /\b(bhojpuri|pawan singh|khesari|shilpi raj|manoj tiwari|neelkamal|pramod premi|arvind akela|kallu|ritesh pandey|ankush raja|akshara singh|nirahua|dinesh lal|lollipop lagelu|lollypop lagelu|rinkiya ke papa|raja ji|le le aayi coca cola|parlour wali|saj ke sawar ke|nathuniya|pudina ae haseena)\b/i;

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
  { canonical: 'Arash', aliases: ['arash', 'arash & helena', 'arash & halena', 'broken angel'], role: 'Global Euro-Pop & Dance Hitmaker' },
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
  { canonical: 'P!NK', aliases: ['p!nk', 'pink'], role: 'Global Pop-Rock Superstar' },
  { canonical: 'Marshmello', aliases: ['marshmello'], role: 'Global Electronic Music Producer & DJ' },
  { canonical: 'Kroma Synth', aliases: ['kroma synth'], role: 'Electronic & Synthwave Producer' },
  { canonical: 'Mellow Study', aliases: ['mellow study'], role: 'Chill Lo-Fi & Instrumental Artist' },
  { canonical: 'The Sunset Echoes', aliases: ['the sunset echoes', 'sunset echoes'], role: 'Indie Pop & Coastal Rock Band' },
  { canonical: 'Velvet Thunder', aliases: ['velvet thunder'], role: 'Alternative & Desert Rock Band' },
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
  { canonical: 'Pramod Premi Yadav', aliases: ['pramod premi'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Folk & Dance Vocalist' },
  { canonical: 'Ritesh Pandey', aliases: ['ritesh pandey'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Singer & Actor' },
  { canonical: 'Arvind Akela Kallu', aliases: ['arvind akela', 'kallu'], section: 'bhojpuri', singerLanguage: 'Bhojpuri', role: 'Bhojpuri Youth Star' },
  { canonical: 'Jubin Nautiyal', aliases: ['jubin nautiyal', 'jubin'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Playback & Devotional Star' },
  { canonical: 'Sonu Nigam', aliases: ['sonu nigam'], section: 'hindi', singerLanguage: 'Hindi', role: 'Evergreen Melody Maestro' },
  { canonical: 'Badshah', aliases: ['badshah'], section: 'hindi', singerLanguage: 'Hindi', role: 'King of Bollywood Party Rap & Pop' },
  { canonical: 'Neha Kakkar', aliases: ['neha kakkar'], section: 'hindi', singerLanguage: 'Hindi', role: 'Bollywood Pop Sensation & Judge' },
  { canonical: 'Diljit Dosanjh', aliases: ['diljit dosanjh', 'diljit'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Global Desi Icon & Pop Sensation' },
  { canonical: 'Udit Narayan', aliases: ['udit narayan'], section: 'hindi', singerLanguage: 'Hindi', role: '90s Bollywood Golden Voice' },
  { canonical: 'Kumar Sanu', aliases: ['kumar sanu'], section: 'hindi', singerLanguage: 'Hindi', role: 'King of 90s Romantic Melodies' },
  { canonical: 'Lata Mangeshkar', aliases: ['lata mangeshkar'], section: 'hindi', singerLanguage: 'Hindi', role: 'Nightingale of India (Bharat Ratna)' },
  { canonical: 'Kishore Kumar', aliases: ['kishore kumar'], section: 'hindi', singerLanguage: 'Hindi', role: 'Golden Era Legend & Evergreen Icon' },
  { canonical: 'Atif Aslam', aliases: ['atif aslam'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Sufi & Romantic Rock Vocalist' },
  { canonical: 'B Praak', aliases: ['b praak', 'bpraak'], section: 'hindi', singerLanguage: 'Hindi', role: 'National Award-Winning Power Vocalist' },
  { canonical: 'AP Dhillon', aliases: ['ap dhillon'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Global Punjabi & Urban Synth-Pop Star' },
  { canonical: 'Karan Aujla', aliases: ['karan aujla'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Punjabi Lyricist & Chartbuster Hitmaker' },
  { canonical: 'Darshan Raval', aliases: ['darshan raval'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie Pop & Romantic Youth Icon' },
  { canonical: 'Armaan Malik', aliases: ['armaan malik'], section: 'hindi', singerLanguage: 'Hindi', role: 'Velvet Romantic & Crossover Pop Star' },
  { canonical: 'Vishal Mishra', aliases: ['vishal mishra'], section: 'hindi', singerLanguage: 'Hindi', role: 'Blockbuster Composer & Singer' },
  { canonical: 'A. R. Rahman', aliases: ['a. r. rahman', 'a.r. rahman', 'ar rahman', 'a r rahman'], section: 'hindi', singerLanguage: 'Pan-Indian', role: 'Oscar & Grammy Winning Composer' },
  { canonical: 'Hariharan', aliases: ['hariharan', 'gulshan kumar'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Padma Shri Devotional & Classical Maestro' },
  { canonical: 'Sachet Tandon', aliases: ['sachet tandon', 'sachet-parampara', 'parampara tandon'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Devotional & Bollywood Hit Duo' },
  { canonical: 'Shankar Mahadevan', aliases: ['shankar mahadevan'], section: 'bhakti', singerLanguage: 'Pan-Indian', role: 'Classical & Devotional Vocal Legend' },
  { canonical: 'Amit Trivedi', aliases: ['amit trivedi'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Composer & Playback Vocalist' },
  { canonical: 'Abhilipsa Panda', aliases: ['abhilipsa panda', 'jeetu sharma'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Devotional Har Har Shambhu Vocalist' },
  { canonical: 'Hansraj Raghuwanshi', aliases: ['hansraj raghuwanshi'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Devotional Shiv Bhajan Vocalist' },
  { canonical: 'Lakhbir Singh Lakkha', aliases: ['lakhbir singh lakkha', 'lakkha'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Devotional Bhajan Legend' },
  { canonical: 'Anuv Jain', aliases: ['anuv jain'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie Hindi Singer-Songwriter' },
  { canonical: 'King', aliases: ['king'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indian Pop & Hip-Hop Hitmaker' },
  { canonical: 'KK', aliases: ['kk', 'krishnakumar kunnath'], section: 'hindi', singerLanguage: 'Hindi', role: 'Forever Voice of Romantic Hindi Pop & Rock' },
  { canonical: 'Mohit Chauhan', aliases: ['mohit chauhan'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Bollywood Balladeer' },
  { canonical: 'Sunidhi Chauhan', aliases: ['sunidhi chauhan'], section: 'hindi', singerLanguage: 'Hindi', role: 'Powerhouse Bollywood Playback Queen' },
  { canonical: 'Alka Yagnik', aliases: ['alka yagnik'], section: 'hindi', singerLanguage: 'Hindi', role: 'Queen of 90s Bollywood Melodies' },
  { canonical: 'Sidhu Moose Wala', aliases: ['sidhu moose wala', 'sidhu moosewala'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Legendary Punjabi Hip-Hop & Folk Icon' },
  { canonical: 'Guru Randhawa', aliases: ['guru randhawa'], section: 'hindi', singerLanguage: 'Punjabi', role: 'Punjabi & Bollywood Pop Star' },
  { canonical: 'Jasleen Royal', aliases: ['jasleen royal'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie-Pop Singer & Composer' },
  { canonical: 'Shilpa Rao', aliases: ['shilpa rao'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Bollywood Playback Vocalist' },
  { canonical: 'Mithoon', aliases: ['mithoon'], section: 'hindi', singerLanguage: 'Hindi', role: 'Romantic Bollywood Composer & Singer' },
  { canonical: 'Ankit Tiwari', aliases: ['ankit tiwari'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Rock & Romantic Playback Singer' },
  { canonical: 'Rahat Fateh Ali Khan', aliases: ['rahat fateh ali khan', 'ustad rahat fateh ali khan'], section: 'hindi', singerLanguage: 'Hindi', role: 'Sufi & Bollywood Playback Maestro' },
  { canonical: 'Aditya Rikhari', aliases: ['aditya rikhari'], section: 'hindi', singerLanguage: 'Hindi', role: 'Indie-Pop Singer-Songwriter' },
  { canonical: 'Pritam', aliases: ['pritam'], section: 'hindi', singerLanguage: 'Hindi', role: 'Blockbuster Bollywood Composer & Hitmaker' },
  { canonical: 'Shaan', aliases: ['shaan'], section: 'hindi', singerLanguage: 'Hindi', role: 'Golden Voice of Bollywood Pop & Romance' },
  { canonical: 'Kailash Kher', aliases: ['kailash kher'], section: 'bhakti', singerLanguage: 'Hindi', role: 'Sufi & Devotional Powerhouse Vocalist' },
  { canonical: 'Javed Ali', aliases: ['javed ali'], section: 'hindi', singerLanguage: 'Hindi', role: 'Soulful Sufi & Playback Vocalist' },
  { canonical: 'Palak Muchhal', aliases: ['palak muchhal'], section: 'hindi', singerLanguage: 'Hindi', role: 'Melodious Bollywood Playback Singer' },
  { canonical: 'Himesh Reshammiya', aliases: ['himesh reshammiya'], section: 'hindi', singerLanguage: 'Hindi', role: 'Hit Machine Composer & Playback Singer' },
];

const GENERIC_CHANNEL_REGEX =
  /(\b(t-series|zee music|sony music|yrf|yash raj|tips|saregama|wave music|speed records|desi melodies|white hill|venus|shemaroo|eros now|universal music|republic records|atlantic records|interscope|columbia records|youtube music|youtube stream|youtube audio|indian artist|unknown artist|various artists|official|vevo|records|music company|productions|films|studios|entertainment|money verse|mxeen|shailesh tiwari|mafia mundeer|7clouds|latinhype|aksh_vibes|thegoodvibe|the vibe guide|hevabidowntown|invertog|bagonly|cakes|alternate|aesthetic boomer|lo-fi|lofi|lyrics|gravero|sakeeb beatz|la mave|morning serenity|dj chetas|ranbir kapoor|salman khan|shah rukh khan|akshay kumar|emraan hashmi|sunny leone|kartik aaryan|kartik|shahid kapoor|thalapathy vijay|ss rajamouli|allu arjun|prabhas|ranveer singh|varun dhawan|hrithik roshan|tiger shroff|pushpa|ranjithame|kabir singh|zindagi na milegi dobara|baaghi|agent vinod|taare zameen par|judwaa|dhurandhar|yeh jawaani hai deewani|ek villain|simmba|animal|pathaan|jawan|brahmastra|aashiqui|shershaah|bhool bhulaiyaa|stree|gadar|dunki)\b)/i;

export function isGenericChannelOrLabel(name?: string): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return true;
  if (/[_@#$%^&*0-9]/.test(trimmed) && !/^(maroon 5|one direction|b praak|p!nk|a\.?\s*r\.?\s*rahman)$/i.test(trimmed)) {
    return true;
  }
  return GENERIC_CHANNEL_REGEX.test(trimmed);
}

/**
 * Checks whether a candidate singer name is a verified real singer in our curated Indian/Global profiles.
 * Prevents movies, actors, song titles, and YouTube channels from ever polluting the Section 5 Singers directory.
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

  // Also accept valid human/artist names added by Admin or AI that aren't YouTube channel clutter
  const channelClutter = /\b(records|music|films|entertainment|studios|company|channel|topic|vevo|present|presents|production|productions|audio|video|jukebox|hits|nonstop|mashup|remix|dj|status|ringtone|lofi|slowed|reverb|official|lyrical|bollywood|bhojpuri|bhakti|sagar|series|wave|worldwide|media|network|label|sound|beats|vibes|tunes)\b/i;
  if (channelClutter.test(trimmed)) {
    return false;
  }

  // Must look like a real name (1 to 4 words, letters/spaces/dots)
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 1 && words.length <= 4 && /^[a-z\u0900-\u097F\s.'-]+$/i.test(trimmed)) {
    return true;
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
  const rawTitle = decodeHtmlEntities(input.title || '').trim();
  const rawArtist = decodeHtmlEntities(input.artist || '')
    .replace(/(\s*-\s*Topic|\s*VEVO|\s*Official)$/i, '')
    .trim();
  const rawAlbum = decodeHtmlEntities(input.album || '').trim();
  const rawPlaylist = decodeHtmlEntities(input.playlistTitle || '').trim();

  const titleAndContext = `${rawTitle} ${rawAlbum} ${rawPlaylist}`.toLowerCase();
  const combinedText = `${rawTitle} ${rawArtist} ${rawAlbum} ${rawPlaylist}`.toLowerCase();

  // Clean noise from title while keeping core song name
  let cleanTitle = rawTitle
    .replace(
      /\s*(\(|\[)\s*(official\s*(music\s*)?(video|audio|lyric\s*video|lyrics|visualizer)|full\s*(video|audio|song)|lyrical\s*(video|song)?|4k|hd|audio\s*song|video\s*song)\s*(\)|\])/gi,
      ''
    )
    .trim();

  // Check if title has "Artist - Song" or "Song | Artist"
  const pipeParts = cleanTitle.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
  const dashParts = cleanTitle.split(/\s+[-–—]\s+/).map((s) => s.trim()).filter(Boolean);

  let detectedSinger = '';
  let detectedSection: HomeSection | null = null;
  let detectedSingerLang = 'Hindi' as AIClassifiedTrackResult['singerLanguage'];
  let detectedRole = 'Playback Singer & Music Icon';

  const matchInText = (textToSearch: string): boolean => {
    // 1. Check known English / Global artists first (e.g. "The Weeknd", "Ed Sheeran", "Arash")
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

    // 2. Check known Indian / Regional artists
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

    // 3. Check custom existing artists in the catalog (only if valid singer name)
    for (const existing of existingArtists) {
      if (isGenericChannelOrLabel(existing.name)) continue;
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

  // Search title/album/playlist first so a default or channel rawArtist doesn't mask the real singer in the song title
  const matchedFromTitle = matchInText(titleAndContext);
  if (!matchedFromTitle && rawArtist) {
    matchInText(rawArtist.toLowerCase());
  }

  // 4. Check Bhakti / Devotional keywords (overrides Hindi if it's a devotional song like "Deva Deva", "Ram Aayenge", "Ram Lala", "Shri Krishna")
  if (BHAKTI_TITLE_REGEX.test(combinedText)) {
    detectedSection = 'bhakti';
  } else if (BHOJPURI_KEYWORD_REGEX.test(combinedText)) {
    detectedSection = 'bhojpuri';
    if (!detectedSingerLang || detectedSingerLang === 'Hindi') {
      detectedSingerLang = 'Bhojpuri';
    }
  }

  // 5. If singer still not detected from known profiles, extract from "(with Singer)", "Artist - Song", pipe parts, or rawArtist
  if (!detectedSinger) {
    const withMatch = rawTitle.match(/\b(?:with|feat\.?|ft\.?|by)\s+([A-Za-z][A-Za-z\s.]{2,28}?)(?:\)|\||-|\[|$)/i);
    if (withMatch && withMatch[1] && isVerifiedRealSingerName(withMatch[1])) {
      detectedSinger = withMatch[1].trim();
    } else if (dashParts.length >= 2) {
      const firstPart = dashParts[0]
        .replace(/^(full\s*video|full\s*song|lyrical|official\s*video|audio)\s*:\s*/i, '')
        .trim();
      const secondPart = dashParts[1];
      if (
        !isGenericChannelOrLabel(firstPart) &&
        !/\b(full|video|audio|song|lyrical|notebook|animal|kabir singh)\b/i.test(firstPart) &&
        firstPart.split(' ').length <= 4
      ) {
        const cand = firstPart.split(/\s*(?:,|&|\bft\.?|\bfeat\.?)\s*/i)[0].trim();
        if (isVerifiedRealSingerName(cand)) {
          detectedSinger = cand;
        }
        cleanTitle = secondPart;
      }
    }

    if (!detectedSinger && pipeParts.length >= 2) {
      for (let i = 1; i < pipeParts.length; i++) {
        const candidate = pipeParts[i];
        const cand = candidate.split(/\s*(?:,|&|\bft\.?|\bfeat\.?)\s*/i)[0].trim();
        if (isVerifiedRealSingerName(cand)) {
          detectedSinger = cand;
          break;
        }
      }
      cleanTitle = pipeParts[0];
    }

    if (!detectedSinger && rawArtist && isVerifiedRealSingerName(rawArtist)) {
      detectedSinger = rawArtist
        .split(/\s*(?:,|&|\bft\.?|\bfeat\.?|\bx\b|\||·)\s*/i)[0]
        .trim();
    }
  }

  // Clean song title if it starts with "Singer - "
  if (detectedSinger && dashParts.length >= 2) {
    if (dashParts[0].toLowerCase().includes(detectedSinger.toLowerCase())) {
      cleanTitle = dashParts.slice(1).join(' - ').trim();
    } else if (
      dashParts[dashParts.length - 1].toLowerCase().includes(detectedSinger.toLowerCase())
    ) {
      cleanTitle = dashParts.slice(0, -1).join(' - ').trim();
    }
  }
  if (pipeParts.length >= 2 && cleanTitle.includes('|')) {
    cleanTitle = pipeParts[0].trim();
  }

  // 6. Determine section if still unset
  if (!detectedSection) {
    if (
      /\b(english|billboard|global pop|synthwave|uk pop|us pop|vevo|7clouds|latinhype|the vibe guide|thegoodvibe|hevabidowntown|invertog|bagonly|cakes|broken angel|car video|midnight resonance|coffee steam|golden hour drive|overdrive canyon)\b/i.test(
        combinedText
      ) ||
      (rawArtist.toLowerCase().endsWith('vevo') && !/india/i.test(rawArtist))
    ) {
      detectedSection = 'english';
      detectedSingerLang = 'Other Country';
      detectedRole = 'Global Pop & Recording Artist';
    } else {
      detectedSection = 'hindi';
    }
  }

  if (!detectedSinger || isGenericChannelOrLabel(detectedSinger)) {
    // Retain the rawArtist if it isn't generic; otherwise use 'Various Artists' instead of blindly forcing Arijit Singh
    if (rawArtist && !isGenericChannelOrLabel(rawArtist)) {
      detectedSinger = rawArtist;
    } else {
      detectedSinger = 'Various Artists';
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
  // Always honor explicit section first if set on the track
  if (
    track.section === 'hindi' ||
    track.section === 'bhojpuri' ||
    track.section === 'bhakti' ||
    track.section === 'english'
  ) {
    // Only override default 'hindi' if the title is unmistakably Bhakti and wasn't explicitly set to another non-hindi section
    const titleAndArtist = `${track.title} ${track.hindiTitle || ''} ${track.artist || ''}`;
    if (
      track.section === 'hindi' &&
      !track.createdAt &&
      (BHAKTI_TITLE_REGEX.test(titleAndArtist) || track.genre === 'Bhakti' || track.language === 'Sanskrit')
    ) {
      return 'bhakti';
    }
    return track.section;
  }

  const titleAndArtist = `${track.title} ${track.hindiTitle || ''} ${track.artist || ''}`;

  if (BHAKTI_TITLE_REGEX.test(titleAndArtist) || track.genre === 'Bhakti' || track.language === 'Sanskrit') {
    return 'bhakti';
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

  const text = `${playlist.name} ${playlist.description || ''} ${playlist.artistName || ''}`;
  if (BHAKTI_TITLE_REGEX.test(text)) {
    return 'bhakti';
  }
  if (BHOJPURI_KEYWORD_REGEX.test(text)) {
    return 'bhojpuri';
  }
  if (
    /\b(english|global pop|billboard|international|synthwave|cyberpunk|lo-fi|lofi|uk|us hits|weeknd|ed sheeran|imagine dragons|dua lipa|chainsmokers|taylor swift|justin bieber)\b/i.test(
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
      if ((art.createdAt || 0) > (existingArt.createdAt || 0)) {
        existingArt.createdAt = art.createdAt;
      }
      if (art.imageUrl && art.imageUrl !== existingArt.imageUrl && art.createdAt) {
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


