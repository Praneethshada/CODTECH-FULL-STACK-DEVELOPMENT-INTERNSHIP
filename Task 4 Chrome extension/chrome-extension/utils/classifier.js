/**
 * classifier.js
 * ─────────────────────────────────────────────────────────────────
 * Classifies websites into three productivity categories:
 *   • PRODUCTIVE   – coding, learning, work tools
 *   • UNPRODUCTIVE – social media, entertainment, distractions
 *   • NEUTRAL      – everything else (news, shopping, etc.)
 *
 * Each domain is matched against known lists; if no match is found
 * the site defaults to NEUTRAL.
 * ─────────────────────────────────────────────────────────────────
 */

export const CATEGORIES = {
  PRODUCTIVE: "productive",
  UNPRODUCTIVE: "unproductive",
  NEUTRAL: "neutral",
};

/** Domains classified as PRODUCTIVE */
const PRODUCTIVE_DOMAINS = [
  // Version Control & Code Hosting
  "github.com",
  "gitlab.com",
  "bitbucket.org",
  "codeberg.org",

  // Coding Practice & Challenges
  "leetcode.com",
  "hackerrank.com",
  "codewars.com",
  "codeforces.com",
  "atcoder.jp",
  "exercism.org",
  "projecteuler.net",

  // Online IDEs & Sandboxes
  "codepen.io",
  "codesandbox.io",
  "replit.com",
  "stackblitz.com",
  "jsfiddle.net",
  "glitch.com",

  // Documentation & References
  "developer.mozilla.org",
  "mdn.io",
  "devdocs.io",
  "w3schools.com",
  "css-tricks.com",
  "web.dev",

  // Q&A & Communities (Dev-focused)
  "stackoverflow.com",
  "stackexchange.com",
  "superuser.com",
  "serverfault.com",

  // Learning Platforms
  "coursera.org",
  "udemy.com",
  "edx.org",
  "pluralsight.com",
  "linkedin.com/learning",
  "frontendmasters.com",
  "egghead.io",
  "scrimba.com",
  "freecodecamp.org",
  "theodinproject.com",
  "cs50.harvard.edu",
  "khanacademy.org",

  // AI / Research Tools
  "claude.ai",
  "chat.openai.com",
  "perplexity.ai",
  "arxiv.org",
  "scholar.google.com",
  "semanticscholar.org",
  "researchgate.net",

  // Productivity & Work Tools
  "notion.so",
  "trello.com",
  "asana.com",
  "linear.app",
  "jira.atlassian.com",
  "confluence.atlassian.com",
  "figma.com",
  "miro.com",
  "docs.google.com",
  "sheets.google.com",
  "slides.google.com",
  "calendar.google.com",
  "mail.google.com",
  "outlook.live.com",
  "office.com",

  // Cloud Platforms & DevOps
  "console.aws.amazon.com",
  "cloud.google.com",
  "portal.azure.com",
  "vercel.com",
  "netlify.com",
  "heroku.com",
  "render.com",
  "railway.app",
  "digitalocean.com",
];

/** Domains classified as UNPRODUCTIVE */
const UNPRODUCTIVE_DOMAINS = [
  // Social Media
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "snapchat.com",
  "pinterest.com",
  "tumblr.com",
  "mastodon.social",
  "threads.net",

  // Video Entertainment
  "netflix.com",
  "primevideo.com",
  "hotstar.com",
  "hulu.com",
  "disneyplus.com",
  "hbomax.com",
  "crunchyroll.com",

  // Gaming & Leisure
  "twitch.tv",
  "roblox.com",
  "miniclip.com",
  "poki.com",

  // Messaging / Chat (leisure)
  "discord.com",
  "telegram.org",
  "web.whatsapp.com",

  // Content Aggregators (time-sink)
  "reddit.com",
  "9gag.com",
  "buzzfeed.com",
  "distractify.com",
  "boredpanda.com",

  // Streaming Music (when browsing, not working)
  "open.spotify.com",
  "soundcloud.com",
];

/**
 * Extracts the root domain from a full URL.
 * e.g. "https://docs.github.com/en/rest" → "github.com"
 *
 * @param {string} url - Full URL string
 * @returns {string} Root hostname (e.g. "github.com")
 */
export function extractDomain(url) {
  try {
    const { hostname } = new URL(url);
    // Remove "www." prefix for cleaner matching
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Checks whether a given domain matches (or is a subdomain of) any
 * domain in the provided list.
 *
 * @param {string} domain  - e.g. "docs.github.com"
 * @param {string[]} list  - Array of root domains
 * @returns {boolean}
 */
function matchesList(domain, list) {
  return list.some(
    (entry) => domain === entry || domain.endsWith(`.${entry}`)
  );
}

/**
 * Classifies a URL into a productivity category.
 *
 * @param {string} url - Full URL to classify
 * @returns {{ category: string, domain: string }}
 */
export function classifyURL(url) {
  const domain = extractDomain(url);

  if (!domain || url.startsWith("chrome://") || url.startsWith("about:")) {
    return { category: CATEGORIES.NEUTRAL, domain: "browser" };
  }

  if (matchesList(domain, PRODUCTIVE_DOMAINS)) {
    return { category: CATEGORIES.PRODUCTIVE, domain };
  }

  if (matchesList(domain, UNPRODUCTIVE_DOMAINS)) {
    return { category: CATEGORIES.UNPRODUCTIVE, domain };
  }

  // YouTube is special-cased: watching coding tutorials vs. entertainment
  // We keep it NEUTRAL by default since intent is hard to detect
  return { category: CATEGORIES.NEUTRAL, domain };
}

/**
 * Returns a human-readable label and colour for each category.
 *
 * @param {string} category
 * @returns {{ label: string, color: string, emoji: string }}
 */
export function getCategoryMeta(category) {
  const meta = {
    [CATEGORIES.PRODUCTIVE]: {
      label: "Productive",
      color: "#22c55e",
      bg: "rgba(34,197,94,0.12)",
      emoji: "🚀",
    },
    [CATEGORIES.UNPRODUCTIVE]: {
      label: "Unproductive",
      color: "#ef4444",
      bg: "rgba(239,68,68,0.12)",
      emoji: "📵",
    },
    [CATEGORIES.NEUTRAL]: {
      label: "Neutral",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.12)",
      emoji: "⚖️",
    },
  };
  return meta[category] || meta[CATEGORIES.NEUTRAL];
}
