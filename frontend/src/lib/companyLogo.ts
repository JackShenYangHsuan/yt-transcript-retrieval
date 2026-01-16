// Company name to domain mapping for logo fetching
const COMPANY_DOMAINS: Record<string, string> = {
  // Big Tech
  "google": "google.com",
  "meta": "meta.com",
  "facebook": "facebook.com",
  "fb": "facebook.com",
  "instagram": "instagram.com",
  "ig": "instagram.com",
  "whatsapp": "whatsapp.com",
  "apple": "apple.com",
  "amazon": "amazon.com",
  "microsoft": "microsoft.com",
  "netflix": "netflix.com",
  "twitter": "twitter.com",
  "x": "x.com",
  "youtube": "youtube.com",
  "yt": "youtube.com",
  "linkedin": "linkedin.com",
  "nvidia": "nvidia.com",
  "openai": "openai.com",
  "chatgpt": "openai.com",

  // Podcast guests' companies - expanded
  "patreon": "patreon.com",
  "lyft": "lyft.com",
  "uber": "uber.com",
  "airbnb": "airbnb.com",
  "stripe": "stripe.com",
  "figma": "figma.com",
  "miro": "miro.com",
  "notion": "notion.so",
  "slack": "slack.com",
  "dropbox": "dropbox.com",
  "amplitude": "amplitude.com",
  "surveymonkey": "surveymonkey.com",
  "duolingo": "duolingo.com",
  "grammarly": "grammarly.com",
  "chess.com": "chess.com",
  "masterclass": "masterclass.com",
  "faire": "faire.com",
  "wise": "wise.com",
  "snyk": "snyk.io",
  "thumbtack": "thumbtack.com",
  "opendoor": "opendoor.com",
  "calendly": "calendly.com",
  "replit": "replit.com",
  "ramp": "ramp.com",
  "runway": "runwayml.com",
  "launchdarkly": "launchdarkly.com",
  "color": "color.com",
  "optimizely": "optimizely.com",
  "nubank": "nubank.com.br",
  "swiggy": "swiggy.com",
  "flipkart": "flipkart.com",
  "first round capital": "firstround.com",
  "first round": "firstround.com",
  "a16z": "a16z.com",
  "andreessen horowitz": "a16z.com",
  "reforge": "reforge.com",
  "quora": "quora.com",
  "deel": "deel.com",
  "rippling": "rippling.com",
  "profitwell": "profitwell.com",
  "pinterest": "pinterest.com",
  "disney": "disney.com",
  "new york times": "nytimes.com",
  "the new york times": "nytimes.com",
  "nyt": "nytimes.com",
  "gojek": "gojek.com",
  "anthropic": "anthropic.com",
  "imperfect foods": "imperfectfoods.com",
  "imperfect": "imperfectfoods.com",
  "headspace": "headspace.com",
  "vrchat": "vrchat.com",
  "gmail": "gmail.com",
  "stanford": "stanford.edu",
  "hubspot": "hubspot.com",
  "atlassian": "atlassian.com",
  "asana": "asana.com",
  "carta": "carta.com",
  "toast": "toasttab.com",
  "drift": "drift.com",
  "retool": "retool.com",
  "pendo": "pendo.io",
  "greenhouse": "greenhouse.com",
  "pando": "pando.com",
  "wealthfront": "wealthfront.com",
  "reddit": "reddit.com",
  "svpg": "svpg.com",
  "jupiter money": "jupiter.money",
  "jupiter": "jupiter.money",
  "six eastern": "sixeastern.com",
  "mkt1": "mkt1.co",
  "lovable": "lovable.dev",
  "all the hacks": "allthehacks.com",
  // Additional companies
  "canva": "canva.com",
  "intercom": "intercom.com",
  "airtable": "airtable.com",
  "rubrik": "rubrik.com",
  "segment": "segment.com",
  "mixpanel": "mixpanel.com",
  "plaid": "plaid.com",
  "brex": "brex.com",
  "mercury": "mercury.com",
  "gusto": "gusto.com",
  "lattice": "lattice.com",
  "lever": "lever.co",
  "loom": "loom.com",
  "coda": "coda.io",
  "roam": "roamresearch.com",
  "framer": "framer.com",
  "sketch": "sketch.com",
  "invision": "miro.com",  // InVision shut down, redirects to Miro
  "abstract": "abstract.com",
  "discord": "discord.com",
  "tiktok": "tiktok.com",
  "snapchat": "snapchat.com",
  "github": "github.com",
  "gitlab": "gitlab.com",
  "trello": "trello.com",
  "confluence": "atlassian.com",
  "linear": "linear.app",
  "vercel": "vercel.com",
  "supabase": "supabase.com",
  "planetscale": "planetscale.com",
  "neon": "neon.tech",
  "railway": "railway.app",
  // Additional companies from guest mapping
  "lenny's newsletter": "lennysnewsletter.com",
  "product talk": "producttalk.org",
  "fyi": "fyi.co",
  "superhuman": "superhuman.com",
  "gumroad": "gumroad.com",
  "product hunt": "producthunt.com",
  "angellist": "angellist.com",
  "khosla ventures": "khoslaventures.com",
  "color genomics": "color.com",
  "tinder": "tinder.com",
  "inspirit": "inspiritvr.com",
  "google ventures": "gv.com",
  "olsen solutions": "olsensolutions.com",
  "produx labs": "produxlabs.com",
  "eventbrite": "eventbrite.com",
  "jeff patton & associates": "jpattonassociates.com",
  "doordash": "doordash.com",
  "instacart": "instacart.com",
  "robinhood": "robinhood.com",
  // AI Companies & Coding Tools
  "world labs": "worldlabs.ai",
  "surge ai": "surgehq.ai",
  "cursor": "cursor.com",
  "anysphere": "cursor.com",
  "gamma": "gamma.app",
  "stackblitz": "stackblitz.com",
  "bolt.new": "bolt.new",
  "windsurf": "codeium.com",
  "codeium": "codeium.com",
  "cognition": "cognition.ai",
  "devin": "cognition.ai",
  // Y Combinator & VCs
  "y combinator": "ycombinator.com",
  "yc": "ycombinator.com",
  "benchmark": "benchmark.com",
  "floodgate": "floodgate.com",
  // More Startups & Tech Companies
  "notejoy": "notejoy.com",
  "tiny": "tiny.com",
  "every": "every.to",
  "ancestry": "ancestry.com",
  "the browser company": "thebrowser.company",
  "arc": "thebrowser.company",
  "waze": "waze.com",
  "maven": "maven.com",
  "growthhackers": "growthhackers.com",
  "wiz": "wiz.io",
  "sierra": "sierra.ai",
  "block": "block.xyz",
  "square": "block.xyz",
  "revolut": "revolut.com",
  "glean": "glean.com",
  "confluent": "confluent.io",
  "dbt labs": "getdbt.com",
  // Coaches, Consultancies & Research
  "reboot": "reboot.io",
  "mochary method": "mocharymethod.com",
  "microsoft research": "microsoft.com",
  "alliance for decision education": "alliancefordecisioneducation.org",
  "re-wired group": "rewired.com",
  "ambient strategy": "ambientstrategy.com",
  "duarte": "duarte.com",
  "nirandfar": "nirandfar.com",
  "ltse": "ltse.com",
  "the pragmatic engineer": "pragmaticengineer.com",
  "lambda school": "bloomtech.com",
  "bloomtech": "bloomtech.com",
  "two sigma": "twosigma.com",
  // Stanford & Universities
  "ucla anderson": "anderson.ucla.edu",
  "martin strategy": "rogerlmartin.com",
  "strategy capital": "strategyandvalue.com",
  "geoffrey moore consulting": "geoffreyamoore.com",
  // Additional companies (Round 2)
  "liveuramp": "liveramp.com",
  "livamp": "liveramp.com",
  "graphite": "graphitehq.com",
  "invisible technologies": "inv.tech",
  "forget the funnel": "forgetthefunnel.com",
  "saastr": "saastr.com",
  "simon-kucher": "simon-kucher.com",
  "sudden compass": "suddencompass.com",
  "storyworthy": "matthewdicks.com",
  "strong product people": "strongproductpeople.com",
  "ultraspeaking": "ultraspeaking.com",
  "modern elder academy": "modernelderacademy.com",
  "collaborative gain": "collaborativegain.com",
  "daversa partners": "daversa.com",
  "strategic narrative": "andyraskin.com",
  "basecamp": "basecamp.com",
  "gas": "gasapp.co",
  "learn prompting": "learnprompting.org",
  "nervous systems mastery": "jonnymiller.co",
  "jessica hische design": "jessicahische.is",
  "uc berkeley": "berkeley.edu",
  "ai research": "ai.stanford.edu",
  "seo advisor": "elischwartz.co",
  "strategic coach": "donnalichaw.com",
  // Additional companies (Round 3)
  "category pirates": "categorypirates.com",
  "entrepreneur magazine": "entrepreneur.com",
  "37signals": "37signals.com",
  "jjellyfish": "jjellyfish.com",
  "art of accomplishment": "artofaccomplishment.com",
  "enjoy the work": "enjoythework.com",
  "radical candor": "radicalcandor.com",
  "bobbie": "bobbie.com",
  "character vc": "charactervc.com",
  "dynamic reteaming": "heidihelfand.com",
  "etsy": "etsy.com",
  "automattic": "automattic.com",
  "wordpress": "wordpress.com",
  "typeform": "typeform.com",
};

// Guest name to company mapping (for guests whose company isn't in the title)
// Use lowercase guest names for matching
const GUEST_COMPANIES: Record<string, string> = {
  // OpenAI
  "kevin weil": "OpenAI",
  "sam altman": "OpenAI",
  "logan kilpatrick": "OpenAI",
  "karina nguyen": "OpenAI",
  "nick turley": "OpenAI",

  // Anthropic
  "dario amodei": "Anthropic",
  "daniela amodei": "Anthropic",
  "mike krieger": "Anthropic",

  // AI Companies & Labs
  "fei-fei li": "World Labs",
  "dr. fei fei li": "World Labs",
  "fei fei": "World Labs",
  "edwin chen": "Surge AI",
  "michael truell": "Cursor",
  "grant lee": "Gamma",
  "eric simons": "StackBlitz",
  "varun mohan": "Windsurf",
  "scott wu": "Cognition",

  // Investors & VCs
  "lenny rachitsky": "Lenny's Newsletter",
  "andrew chen": "a16z",
  "casey winters": "Eventbrite",
  "elena verna": "Amplitude",
  "emily kramer": "MKT1",
  "maggie crowley": "Toast",
  "shreyas doshi": "Stripe",
  "gibson biddle": "Netflix",
  "teresa torres": "Product Talk",
  "marty cagan": "SVPG",
  "jeff patton": "Jeff Patton & Associates",
  "ben horowitz": "a16z",
  "dalton caldwell": "Y Combinator",
  "jessica livingston": "Y Combinator",
  "sarah tavel": "Benchmark",
  "mike maples jr": "Floodgate",

  // Founders & Executives
  "brian chesky": "Airbnb",
  "stewart butterfield": "Slack",
  "des traynor": "Intercom",
  "dharmesh shah": "HubSpot",
  "hiten shah": "FYI",
  "rahul vohra": "Superhuman",
  "sahil lavingia": "Gumroad",
  "david cancel": "Drift",
  "patrick collison": "Stripe",
  "john collison": "Stripe",
  "guillermo rauch": "Vercel",
  "nat friedman": "GitHub",
  "tobi lutke": "Shopify",
  "melanie perkins": "Canva",
  "vlad tenev": "Robinhood",
  "apoorva mehta": "Instacart",
  "tony xu": "DoorDash",
  "ryan hoover": "Product Hunt",
  "naval ravikant": "AngelList",
  "balaji srinivasan": "Coinbase",
  "keith rabois": "Khosla Ventures",
  "elad gil": "Color Genomics",
  "ada chen rekhi": "Notejoy",
  "andrew wilkinson": "Tiny",
  "brian balfour": "Reforge",
  "dan shipper": "Every",
  "deb liu": "Ancestry",
  "josh miller": "The Browser Company",
  "uri levine": "Waze",
  "wes kao": "Maven",
  "sean ellis": "GrowthHackers",
  "raaz herzberg": "Wiz",
  "ivan zhao": "Notion",
  "bret taylor": "Sierra",
  "drew houston": "Dropbox",

  // Product Leaders
  "ravi mehta": "Tinder",
  "paul adams": "Intercom",
  "yuhki yamashita": "Figma",
  "yamashata": "Figma",
  "noah weiss": "Slack",
  "scott belsky": "Adobe",
  "julie zhuo": "Inspirit",
  "ken norton": "Google Ventures",
  "jackie bavaro": "Asana",
  "brandon chu": "Shopify",
  "adam nash": "Wealthfront",
  "dan olsen": "Olsen Solutions",
  "melissa perri": "Produx Labs",
  "christian idiodi": "SVPG",
  "alex komoroske": "Stripe",
  "aparna chennapragada": "Microsoft",
  "gustav söderström": "Spotify",
  "robby stein": "Google",
  "dmitry zlokazov": "Revolut",
  "tomer cohen": "LinkedIn",
  "dhanji r. prasanna": "Block",
  "shaun clowes": "Confluent",
  "tamar yehoshua": "Glean",
  "lane shackleton": "Coda",
  "nan yu": "Linear",
  "karri saarinen": "Linear",

  // Coaches, Authors & Educators
  "jerry colonna": "Reboot",
  "matt mochary": "Mochary Method",
  "nicole forsgren": "Microsoft Research",
  "annie duke": "Alliance for Decision Education",
  "alisa cohn": "Executive Coach",
  "julia schottenstein": "dbt Labs",
  "bob moesta": "Re-Wired Group",
  "april dunford": "Ambient Strategy",
  "geoffrey moore": "Geoffrey Moore Consulting",
  "richard rumelt": "UCLA Anderson",
  "roger martin": "Martin Strategy",
  "hamilton helmer": "Strategy Capital",
  "nancy duarte": "Duarte",
  "carole robin": "Stanford",
  "christina wodtke": "Stanford",
  "jeffrey pfeffer": "Stanford",
  "graham weaver": "Stanford",
  "matt abrahams": "Stanford",
  "nir eyal": "NirAndFar",
  "eric ries": "LTSE",
  "gergely": "The Pragmatic Engineer",
  "gergely orosz": "The Pragmatic Engineer",

  // Other Tech Leaders
  "molly graham": "Lambda School",
  "camille fournier": "Two Sigma",
  "john cutler": "Amplitude",
  "fareed mosavat": "Reforge",

  // Additional Guests (Round 2)
  "adam fishman": "Patreon",
  "andy raskin": "Strategic Narrative",
  "anneka gupta": "LiveRamp",
  "anton osika": "Lovable",
  "anuj rathi": "Swiggy",
  "bangaly kaba": "YouTube",
  "benjamin lauzier": "Thumbtack",
  "brendan foody": "Invisible Technologies",
  "claire vo": "LaunchDarkly",
  "crystal w": "Gojek",
  "crystal widjaja": "Gojek",
  "dan hockenmaier": "Thumbtack",
  "donna lichaw": "Strategic Coach",
  "eli schwartz": "SEO Advisor",
  "ethan smith": "Graphite",
  "geoff charles": "Ramp",
  "gia laudi": "Forget The Funnel",
  "georgiana laudi": "Forget The Funnel",
  "hamel husain": "AI Research",
  "shreya shankar": "UC Berkeley",
  "jason m lemkin": "SaaStr",
  "jason lemkin": "SaaStr",
  "jessica hische": "Jessica Hische Design",
  "jonny miller": "Nervous Systems Mastery",
  "kevin yien": "Stripe",
  "lauren ipsen": "Daversa Partners",
  "lulu cheng meservey": "Substack",
  "madhavan ramanujam": "Simon-Kucher",
  "manik gupta": "Uber",
  "matt lemay": "Sudden Compass",
  "matthew dicks": "Storyworthy",
  "nabeel s. qureshi": "Palantir",
  "nabeel qureshi": "Palantir",
  "nikita bier": "Gas",
  "nikita miller": "Duolingo",
  "paul millerd": "The Pathless Path",
  "pete kazanjy": "Atrium",
  "petra wille": "Strong Product People",
  "phyl terry": "Collaborative Gain",
  "ryan singer": "Basecamp",
  "sahil mansuri": "Bravado",
  "sander schulhoff": "Learn Prompting",
  "sriram and aarthi": "Aarthisriram",
  "tom conrad": "Zero",
  "tristan de montebello": "Ultraspeaking",
  "patrick campbell": "ProfitWell",
  "christine itwaru": "Pendo",
  "chip conley": "Modern Elder Academy",
  "camille hearst": "Patreon",

  // Additional Guests (Round 3)
  "nilan peiris": "Wise",
  "ben williams": "Snyk",
  "christopher lochhead": "Category Pirates",
  "emilie gerber": "Six Eastern",
  "jake knapp": "Character VC",
  "john zeratsky": "Character VC",
  "jason feifer": "Entrepreneur Magazine",
  "jason fried": "37signals",
  "jen abel": "JJELLYFISH",
  "joe hudson": "Art of Accomplishment",
  "jonathan lowenhar": "Enjoy The Work",
  "keith coleman": "X",
  "kim scott": "Radical Candor",
  "laura modi": "Bobbie",
  "laura schaffer": "Amplitude",
  "meltem kuran": "Deel",
  "meltem kuran berkowitz": "Deel",
  "todd jackson": "First Round Capital",
  "varun parmar": "Miro",
  "tim holley": "Etsy",
  "heidi helfand": "Dynamic Reteaming",
  "hilary gridley": "Notion",

  // Final additions
  "matt mullenweg": "Automattic",
  "evan lapointe": "Strategic Coach",
  "peter deng": "Uber",
  "nickey skarstad": "Duolingo",
  "denise tilles": "Produx Labs",
  "archie abrams": "Lyft",
  "alex hardimen": "New York Times",
  "ami vora": "WhatsApp",
  "itamar gilad": "Google",
  "oji udezue": "Typeform",
};

// Known company names that appear in titles (for title-based extraction)
const KNOWN_COMPANIES = new Set([
  "replit", "calendly", "stripe", "figma", "uber", "opendoor", "netflix",
  "hubspot", "amazon", "meta", "google", "airbnb", "spotify", "slack",
  "notion", "dropbox", "zoom", "shopify", "twilio", "datadog", "snowflake",
  "coinbase", "robinhood", "doordash", "instacart", "pinterest", "snap",
  "twitter", "linkedin", "salesforce", "adobe", "oracle", "ibm", "intel",
  "new york times", "duolingo", "atlassian", "asana", "monday", "clickup",
  "linear", "vercel", "supabase", "planetscale", "neon", "railway",
  // Additional companies from podcast
  "canva", "intercom", "airtable", "rubrik", "facebook", "whatsapp",
  "youtube", "tiktok", "snapchat", "discord", "telegram", "reddit",
  "github", "gitlab", "bitbucket", "jira", "confluence", "trello",
  "segment", "mixpanel", "heap", "fullstory", "hotjar", "interana",
  "plaid", "brex", "mercury", "gusto", "lattice", "lever", "greenhouse",
  "webflow", "framer", "sketch", "invision", "abstract", "zeplin",
  "loom", "calendly", "typeform", "airtable", "coda", "roam",
  // AI & Coding Tools
  "openai", "anthropic", "cursor", "gamma", "windsurf", "bolt", "reforge",
  "wiz", "revolut", "block", "ancestry", "every", "waze", "maven",
  // VCs & Research
  "y combinator", "a16z", "benchmark", "sequoia", "stanford",
  // Additional tech companies
  "glean", "confluent", "dbt labs", "retool", "superhuman",
]);

// Roles and titles to filter out
const ROLE_PATTERNS = [
  "cpo", "ceo", "cto", "coo", "cfo", "cmo", "cro", "evp", "svp", "vp",
  "head of", "co-founder", "cofounder", "founder", "author", "professor",
  "coach", "speaker", "advisor", "creator", "pro poker", "former",
  "director", "partner", "investor", "executive", "manager", "chief",
  "president", "chairman", "board member", "consultant", "strategist",
  "expert", "thought leader", "entrepreneur", "host", "editor",
  "first pm", "first gtm", "group pm", "product lead", "product at",
  "analytics", "retention team", "core product", "growth at", "eng",
  "designer", "writer", "scaling", "marketplaces", "podcast product",
  "working", "gc", "one", "more", "of",
];

// Book titles and other non-company strings to exclude
const EXCLUDE_PATTERNS = new Set([
  // Common book titles from podcast
  "touchy feely", '"touchy feely"', "working backwards", "thinking in bets", "obviously awesome",
  "play bigger", "sales pitch", "make time", "storyworthy", "niche down",
  "monetizing innovation", "dynamic reteaming", "founding sales", "strong product people",
  "the beautiful mess", "the pathless path", "the pragmatic engineer", "chatprd",
  "accomplishment", "nervous systems mastery", "forget the funnel", "enjoy the work",
  // Generic words that aren't companies
  "growth", "product", "zero", "character vc", "silicon valley product group",
  "co-creator of the framework", "jjellyfish", "altmba", "section4",
  "thrive digital", "outpace", "bravado", "alchemy", "graphite",
  // Duplicates or extended product names (keep just the base company)
  "jira product discovery", "google docs", "the new york times", "jupiter money",
]);

/**
 * Check if a string is primarily a role/title
 */
function isRoleOrTitle(str: string): boolean {
  const lower = str.toLowerCase().trim();
  // Pure role check
  if (ROLE_PATTERNS.some(role => lower === role || lower.startsWith(role + " "))) {
    return true;
  }
  // Check for role patterns
  if (ROLE_PATTERNS.some(role => lower.includes(role))) {
    // But not if it contains "of" or "at" followed by a company
    if (!lower.match(/\b(of|at)\s+\w/)) {
      return true;
    }
  }
  return false;
}

/**
 * Extract company from "role of/at Company" pattern
 */
function extractCompanyFromRolePattern(str: string): string | null {
  // Match patterns like "CPO of Wise", "Head of Product at Opendoor", "ex-COO of Stripe"
  const match = str.match(/(?:of|at)\s+([A-Z][A-Za-z0-9\s]+?)(?:,|$)/);
  if (match) {
    return match[1].trim();
  }
  return null;
}

/**
 * Clean and normalize a company name
 */
function cleanCompanyName(name: string): string {
  return name
    .replace(/^ex-/i, "")
    .replace(/^former\s+/i, "")
    .replace(/\s*(inc|llc|ltd|co|corp)\.?$/i, "")
    // Strip all quote types using Unicode escapes for reliability
    // U+0022 " U+0027 ' U+201C " U+201D " U+2018 ' U+2019 ' U+201E „ U+201F ‟ U+2039 ‹ U+203A › U+00AB « U+00BB »
    .replace(/^[\u0022\u0027\u201C\u201D\u2018\u2019\u201E\u201F\u2039\u203A\u00AB\u00BB]|[\u0022\u0027\u201C\u201D\u2018\u2019\u201E\u201F\u2039\u203A\u00AB\u00BB]$/g, "")
    .trim();
}

/**
 * Extract company names from episode title
 * Handles multiple patterns:
 * - "Title | Guest Name (Company1, Company2)"
 * - "Title | Guest Name (CPO of Company)"
 * - "Behind the product: Company | Guest"
 * - "How Company built..."
 */
export function extractCompaniesFromTitle(episodeTitle: string): string[] {
  const companies: string[] = [];
  const seenLower = new Set<string>();

  const addCompany = (name: string) => {
    const cleaned = cleanCompanyName(name);
    const lower = cleaned.toLowerCase();
    // Skip if too short, already seen, is a role/title, or in exclude list
    if (cleaned.length <= 2 || seenLower.has(lower) || isRoleOrTitle(cleaned) || EXCLUDE_PATTERNS.has(lower)) {
      return;
    }
    seenLower.add(lower);
    companies.push(cleaned);
  };

  // 1. Extract from parentheses after pipe: "| Guest (Company1, Company2)"
  const parenMatch = episodeTitle.match(/\|\s*[^(]+\(([^)]+)\)?/);
  if (parenMatch) {
    const parenContent = parenMatch[1];

    // Split by comma
    const parts = parenContent.split(",").map(p => p.trim());

    for (const part of parts) {
      // Check for "role of/at Company" pattern
      const companyFromRole = extractCompanyFromRolePattern(part);
      if (companyFromRole) {
        addCompany(companyFromRole);
        continue;
      }

      // Check if it's a pure role
      if (isRoleOrTitle(part)) {
        continue;
      }

      // Handle "ex-Company" pattern
      if (part.toLowerCase().startsWith("ex-")) {
        addCompany(part.substring(3));
        continue;
      }

      // Likely a company name
      if (part.length > 1) {
        addCompany(part);
      }
    }
  }

  // 2. Extract known companies from the title itself
  const titleLower = episodeTitle.toLowerCase();
  for (const company of KNOWN_COMPANIES) {
    // Match whole word boundaries
    const regex = new RegExp(`\\b${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(titleLower) && !seenLower.has(company)) {
      // Find the original case version
      const match = episodeTitle.match(regex);
      if (match) {
        addCompany(match[0]);
      }
    }
  }

  // 3. Look for "Behind the product: Company" pattern
  const behindMatch = episodeTitle.match(/Behind the (?:product|scenes)[:\s]+([A-Z][A-Za-z0-9]+)/i);
  if (behindMatch) {
    addCompany(behindMatch[1]);
  }

  // 4. Look for "'s" possessive pattern indicating company: "Calendly's rapid growth"
  const possessiveMatch = episodeTitle.match(/([A-Z][A-Za-z0-9]+)'s\s+(?:rapid|growth|unique|journey|story|culture)/i);
  if (possessiveMatch) {
    addCompany(possessiveMatch[1]);
  }

  // 5. Look for "How X built" or "Lessons from scaling X" patterns
  const howBuiltMatch = episodeTitle.match(/How\s+([A-Z][A-Za-z0-9]+)\s+(?:built|builds|created|scaled)/i);
  if (howBuiltMatch) {
    addCompany(howBuiltMatch[1]);
  }

  const scalingMatch = episodeTitle.match(/(?:scaling|Lessons from)\s+([A-Z][A-Za-z0-9]+)/i);
  if (scalingMatch && scalingMatch[1].toLowerCase() !== 'your') {
    addCompany(scalingMatch[1]);
  }

  // 6. "Inside X:" pattern - e.g., "Inside Canva: Coaches not managers"
  const insideMatch = episodeTitle.match(/Inside\s+([A-Z][A-Za-z0-9]+)[:\s]/i);
  if (insideMatch) {
    addCompany(insideMatch[1]);
  }

  // 7. "How X rose/transformed/became" pattern - e.g., "How Intercom rose from the ashes"
  const howRoseMatch = episodeTitle.match(/How\s+([A-Z][A-Za-z0-9]+)\s+(?:rose|transformed|became|grew|went|is|does)/i);
  if (howRoseMatch) {
    addCompany(howRoseMatch[1]);
  }

  // 8. "at X)" or "at X," at end of parentheses - e.g., "(Head of Growth at Airtable)"
  const atEndMatch = episodeTitle.match(/at\s+([A-Z][A-Za-z0-9]+)\s*[,)]/gi);
  if (atEndMatch) {
    for (const match of atEndMatch) {
      const company = match.match(/at\s+([A-Z][A-Za-z0-9]+)/i);
      if (company) {
        addCompany(company[1]);
      }
    }
  }

  // 9. "from X" pattern for alumni - but only if X is a known company
  // Avoid matching person names like "from Alex Komoroske"
  const titleBeforePipe = episodeTitle.split('|')[0] || '';
  for (const company of KNOWN_COMPANIES) {
    const fromCompanyRegex = new RegExp(`from\\s+${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (fromCompanyRegex.test(titleBeforePipe) && !seenLower.has(company)) {
      addCompany(company.charAt(0).toUpperCase() + company.slice(1));
    }
  }

  return companies;
}

/**
 * Get domain for a company name
 */
export function getCompanyDomain(companyName: string): string | null {
  const normalized = companyName.toLowerCase().trim();

  // Direct match
  if (COMPANY_DOMAINS[normalized]) {
    return COMPANY_DOMAINS[normalized];
  }

  // Try removing common suffixes
  const withoutSuffix = normalized.replace(/\s*(inc|llc|ltd|co|corp)\.?$/i, "").trim();
  if (COMPANY_DOMAINS[withoutSuffix]) {
    return COMPANY_DOMAINS[withoutSuffix];
  }

  // Fallback: assume company name is the domain (works for many tech companies)
  const guessedDomain = normalized.replace(/\s+/g, "") + ".com";
  return guessedDomain;
}

/**
 * Get logo URL for a company using Google's favicon service
 * (Clearbit logo API was deprecated)
 */
export function getCompanyLogoUrl(companyName: string): string {
  const domain = getCompanyDomain(companyName);
  if (!domain) return "";
  // Google favicon service - reliable and free, supports sizes up to 256
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/**
 * Get the first company from an episode title
 */
export function getFirstCompanyFromTitle(episodeTitle: string): string | null {
  const companies = extractCompaniesFromTitle(episodeTitle);
  return companies.length > 0 ? companies[0] : null;
}

/**
 * Get logo URL from episode title
 */
export function getLogoUrlFromTitle(episodeTitle: string): string | null {
  const company = getFirstCompanyFromTitle(episodeTitle);
  if (!company) return null;
  return getCompanyLogoUrl(company);
}

/**
 * Clean guest name by removing version numbers like "2.0", "3.0", etc.
 * These often appear when a guest has been on the podcast multiple times.
 */
export function cleanGuestName(name: string): string {
  if (!name) return name;
  return name
    .replace(/\s+\d+(\.\d+)?$/, "") // Remove trailing "2.0", "3", etc.
    .replace(/\s+[IVX]+$/, "")      // Remove trailing roman numerals like "II", "III"
    .trim();
}

/**
 * Get company for a guest from the guest-company mapping
 */
export function getCompanyForGuest(guestName: string): string | null {
  if (!guestName) return null;
  const cleaned = cleanGuestName(guestName).toLowerCase();
  return GUEST_COMPANIES[cleaned] || null;
}

/**
 * Get the best company for display - tries title first, then guest mapping
 */
export function getBestCompany(episodeTitle: string, guestName?: string): string | null {
  // First try to extract from title
  const fromTitle = getFirstCompanyFromTitle(episodeTitle);
  if (fromTitle) return fromTitle;

  // Fall back to guest mapping
  if (guestName) {
    return getCompanyForGuest(guestName);
  }

  return null;
}

/**
 * Get logo URL using both episode title and guest name
 */
export function getBestLogoUrl(episodeTitle: string, guestName?: string): string | null {
  const company = getBestCompany(episodeTitle, guestName);
  if (!company) return null;
  return getCompanyLogoUrl(company);
}
