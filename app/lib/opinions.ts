const opinionCache = new Map<string, string>();

export async function fetchOpinionText(
  justiaUrl: string,
): Promise<string> {
  const cached = opinionCache.get(justiaUrl);
  if (cached) return cached;

  const res = await fetch(justiaUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SCOTUSTracker/1.0; +https://github.com)",
    },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch opinion: ${res.status}`);
  }

  const html = await res.text();
  const text = parseJustiaHtml(html);

  if (text) {
    opinionCache.set(justiaUrl, text);
  }

  return text;
}

function parseJustiaHtml(html: string): string {
  // Justia opinion pages have the opinion text in a <div id="opinion"> or
  // within specific tab panes. We extract meaningful text content.

  // Try to find the main opinion content area
  // Justia wraps opinion text in <div id="tab-opinion-X"> blocks
  // or a single <div id="opinion"> block
  let opinionHtml = "";

  // Try #opinion first (single-opinion pages)
  const opinionMatch = html.match(
    /<div[^>]*id="opinion"[^>]*>([\s\S]*?)<\/div>\s*(?:<div[^>]*id="(?:footer|sidebar)|<footer)/i
  );
  if (opinionMatch) {
    opinionHtml = opinionMatch[1];
  }

  // Try tab-opinion content blocks
  if (!opinionHtml) {
    const tabMatches = html.match(
      /<div[^>]*class="[^"]*tab-pane[^"]*"[^>]*id="tab-opinion[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi
    );
    if (tabMatches) {
      opinionHtml = tabMatches.join("\n\n---\n\n");
    }
  }

  // Broad fallback: look for <p> blocks within the main content area
  if (!opinionHtml) {
    // Try to grab everything between the case header and footer
    const contentMatch = html.match(
      /<div[^>]*class="[^"]*(?:case-body|opinion-content|col-sm-9)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>\s*)*(?:<div[^>]*class="[^"]*(?:footer|sidebar)|<footer)/i
    );
    if (contentMatch) {
      opinionHtml = contentMatch[1];
    }
  }

  // Last resort: extract all paragraphs
  if (!opinionHtml) {
    opinionHtml = html;
  }

  return cleanHtml(opinionHtml);
}

function cleanHtml(html: string): string {
  let text = html;

  // Remove script and style tags entirely
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, "");

  // Convert common block elements to newlines
  text = text.replace(/<\/?(p|div|br|h[1-6]|blockquote|li|tr)[^>]*>/gi, "\n");
  text = text.replace(/<hr[^>]*>/gi, "\n---\n");

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&mdash;/g, "\u2014");
  text = text.replace(/&ndash;/g, "\u2013");
  text = text.replace(/&lsquo;/g, "\u2018");
  text = text.replace(/&rsquo;/g, "\u2019");
  text = text.replace(/&ldquo;/g, "\u201C");
  text = text.replace(/&rdquo;/g, "\u201D");
  text = text.replace(/&sect;/g, "\u00A7");
  text = text.replace(/&#\d+;/g, "");

  // Collapse whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n[ \t]+/g, "\n");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}
