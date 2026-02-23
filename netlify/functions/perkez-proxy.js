const TARGET_URL = "https://www.perkez.be/verbondsbladen/";
const UNKNOWN_DATE = "Datum onbekend";
const SCORE_PATTERN = /\b\d{1,2}\s*[-:]\s*\d{1,2}\b/;
const PERKEZ_HOST = "www.perkez.be";
const JINA_PROXY_PREFIX = "https://r.jina.ai/http://";
const FETCH_TIMEOUT_MS = 12000;
const MAX_SUMMARY_LINES = 12;
const REEKS2_FALLBACK_PDF_URL = "https://www.perkez.be/website/wp-content/uploads/Nr-1599.pdf";

const REEKS1_MARKERS = [/reeks\s*een/i, /reeks\s*1/i];
const REEKS2_MARKERS = [/reeks\s*twee/i, /reeks\s*2/i];
const REEKS1_TEAM_TOKENS = [
    "gistelunited", "vcdemerci", "vkbekegem", "devereniging", "fceernegem",
    "hangover98", "houthandeltavernier", "vvterstraeten", "fcvodevrienden",
    "kvkettelgem78", "kvkettelgem82", "fcbeerst", "kvmiddelkerke",
    "fcedelweiss", "vvgistel", "ettelgem78", "ettelgem82"
];
const REEKS2_TEAM_TOKENS = [
    "oseernegem", "kvkettelgem68", "vkbistrotvliegplein", "vkmarcassou",
    "vkvoegwkvandaele", "rozeveldvrienden", "fcdeengel", "fcdesamis",
    "osbeerst", "fcdenoek", "fcvertex", "fchippo12", "vkcentrumvrienden",
    "ettelgem68"
];

function jsonResponse(statusCode, payload) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=0, s-maxage=600"
        },
        body: JSON.stringify(payload)
    };
}

function stripHtml(input) {
    return input
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizePdfUrl(href) {
    if (/^https?:\/\//i.test(href)) return href;
    return `https://www.perkez.be/${href.replace(/^\/+/, "")}`;
}

function isAllowedPerkezUrl(value) {
    if (typeof value !== "string" || !value) return false;
    try {
        const parsed = new URL(value);
        return (parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.hostname === PERKEZ_HOST;
    } catch {
        return false;
    }
}

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

function extractResultsSummary(sectionHtml) {
    const lineRegex = /<(?:li|p|td|div|span)[^>]*>([\s\S]{0,260})<\/(?:li|p|td|div|span)>/gi;
    const seen = new Set();
    const lines = [];
    let match;

    while ((match = lineRegex.exec(sectionHtml)) !== null) {
        const line = stripHtml(match[1]);
        if (!line) continue;
        if (!SCORE_PATTERN.test(line)) continue;
        if (!/[A-Za-z]/.test(line)) continue;

        const normalized = line.replace(/\s+/g, " ").trim();
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        lines.push(normalized);

        if (lines.length >= MAX_SUMMARY_LINES) break;
    }

    return lines;
}

function filterScoreLine(rawLine) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) return null;
    if (line.length < 8 || line.length > 160) return null;
    if (!SCORE_PATTERN.test(line)) return null;
    if (!/[A-Za-z]/.test(line)) return null;
    if (/^\d{1,2}\s*[-:]\s*\d{1,2}$/.test(line)) return null;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(line)) return null;
    if (/\b(straat|laan|weg|plein|bus|nr\.?|nummer|koekelare|oudenburg)\b/i.test(line)) return null;
    if (/\b\d{4}\b/.test(line)) return null;
    if (!/\b[A-Za-z]{2,}.*\d{1,2}\s*[-:]\s*\d{1,2}(?:\b|$)/.test(line)) return null;
    if (/^(www\.|http|koninklijke|wekelijks|officieel|verbondsorgaan)/i.test(line)) return null;
    return line;
}

function extractResultsSummaryFromPdfText(pdfText) {
    if (typeof pdfText !== "string" || !pdfText) return [];

    const lines = pdfText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const collected = [];
    const seen = new Set();
    let inResultSection = false;

    for (const rawLine of lines) {
        const normalized = rawLine.toLowerCase();
        if (normalized.includes("uitslagen")) inResultSection = true;
        if (inResultSection && normalized.includes("klassement")) inResultSection = false;
        if (!inResultSection) continue;

        const scoreLine = filterScoreLine(rawLine);
        if (!scoreLine || seen.has(scoreLine)) continue;
        seen.add(scoreLine);
        collected.push(scoreLine);
        if (collected.length >= MAX_SUMMARY_LINES) return collected;
    }

    // Fallback: scan volledige tekst wanneer "Uitslagen"-kop niet goed herkend wordt.
    for (const rawLine of lines) {
        const scoreLine = filterScoreLine(rawLine);
        if (!scoreLine || seen.has(scoreLine)) continue;
        seen.add(scoreLine);
        collected.push(scoreLine);
        if (collected.length >= MAX_SUMMARY_LINES) break;
    }

    return collected;
}

function normalizeLineForTeamMatch(line) {
    return line
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
}

function classifyLineReeks(line) {
    const normalized = normalizeLineForTeamMatch(line);
    const hasReeks2 = REEKS2_TEAM_TOKENS.some((token) => normalized.includes(token));
    if (hasReeks2) return "reeks2";

    const hasReeks1 = REEKS1_TEAM_TOKENS.some((token) => normalized.includes(token));
    if (hasReeks1) return "reeks1";

    return null;
}

function buildResultsByReeks(lines) {
    const grouped = { reeks1: [], reeks2: [] };
    if (!Array.isArray(lines)) return grouped;
    const seen1 = new Set();
    const seen2 = new Set();

    lines.forEach((line) => {
        if (typeof line !== "string") return;
        const normalized = line.trim();
        if (!normalized) return;

        const reeks = classifyLineReeks(normalized);
        if (reeks === "reeks2") {
            if (!seen2.has(normalized)) {
                seen2.add(normalized);
                grouped.reeks2.push(normalized);
            }
        } else if (reeks === "reeks1") {
            if (!seen1.has(normalized)) {
                seen1.add(normalized);
                grouped.reeks1.push(normalized);
            }
        }
    });

    return grouped;
}

function extractResultsByReeksFromPdfText(pdfText) {
    const grouped = { reeks1: [], reeks2: [] };
    if (typeof pdfText !== "string" || !pdfText) return grouped;

    const lines = pdfText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const seen = { reeks1: new Set(), reeks2: new Set() };
    let inResults = false;
    let activeReeks = null;

    for (const rawLine of lines) {
        const normalized = rawLine.toLowerCase();

        if (normalized.includes("uitslagen")) {
            inResults = true;
            activeReeks = "reeks1";
            continue;
        }
        if (!inResults) continue;
        if (normalized.includes("klassement")) break;

        if (REEKS1_MARKERS.some((marker) => marker.test(normalized))) {
            activeReeks = "reeks1";
            continue;
        }
        if (REEKS2_MARKERS.some((marker) => marker.test(normalized))) {
            activeReeks = "reeks2";
            continue;
        }

        const scoreLine = filterScoreLine(rawLine);
        if (!scoreLine) continue;

        const classifiedReeks = classifyLineReeks(scoreLine);
        const targetReeks = classifiedReeks || activeReeks;
        if (!targetReeks) continue;
        if (seen[targetReeks].has(scoreLine)) continue;
        seen[targetReeks].add(scoreLine);
        grouped[targetReeks].push(scoreLine);

        if (grouped.reeks1.length >= MAX_SUMMARY_LINES && grouped.reeks2.length >= MAX_SUMMARY_LINES) break;
    }

    if (!grouped.reeks1.length && !grouped.reeks2.length) {
        const fallbackAll = extractResultsSummaryFromPdfText(pdfText);
        return buildResultsByReeks(fallbackAll);
    }

    return grouped;
}

function extractDate(text, num) {
    const byNumber = new RegExp(`Verbondsblad\\s*${num}[\\s\\S]{0,220}?(\\d{1,2}\\s+[A-Za-z]+\\s+\\d{4})`, "i");
    const numberMatch = text.match(byNumber);
    if (numberMatch?.[1]) return numberMatch[1].trim();

    const plainMatch = text.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
    if (plainMatch?.[1]) return plainMatch[1].trim();

    const slashMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (slashMatch?.[1]) return slashMatch[1].trim();

    return UNKNOWN_DATE;
}

function extractPublishedDateFromPostHtml(postHtml) {
    const match = postHtml.match(/<meta\s+property=["']article:published_time["']\s+content=["']([^"']+)["']/i);
    if (!match?.[1]) return UNKNOWN_DATE;

    const publishedAt = new Date(match[1]);
    if (Number.isNaN(publishedAt.getTime())) return UNKNOWN_DATE;

    return new Intl.DateTimeFormat("nl-BE", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Brussels"
    }).format(publishedAt);
}

function extractPostUrl(section) {
    const postUrlMatch = section.match(/href=["'](https?:\/\/www\.perkez\.be\/verbondsblad[^"']+)["']/i);
    if (!postUrlMatch?.[1]) return null;
    return isAllowedPerkezUrl(postUrlMatch[1]) ? postUrlMatch[1] : null;
}

function parseLatestVerbondsblad(html) {
    const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
    const headings = [];
    let h3Match;

    while ((h3Match = h3Regex.exec(html)) !== null) {
        const headingText = stripHtml(h3Match[1]);
        const numberMatch = headingText.match(/Verbondsblad\s*(\d+)/i);
        if (!numberMatch?.[1]) continue;

        headings.push({
            number: Number(numberMatch[1]),
            index: h3Match.index
        });
    }

    headings.sort((a, b) => b.number - a.number);

    if (headings.length > 0) {
        const latest = headings[0];
        const nextHeadingIndex = headings
            .filter((item) => item.index > latest.index)
            .map((item) => item.index)
            .sort((a, b) => a - b)[0];

        const section = html.slice(latest.index, nextHeadingIndex ?? latest.index + 4000);
        const text = stripHtml(section);
        const date = extractDate(text, latest.number);
        const resultsSummary = extractResultsSummary(section);
        const postUrl = extractPostUrl(section);
        const linkMatch = section.match(/href=["']([^"']*Nr-\d+\.pdf[^"']*)["']/i);
        const url = normalizePdfUrl(
            linkMatch?.[1] ?? `https://www.perkez.be/website/wp-content/uploads/Nr-${latest.number}.pdf`
        );

        return [
            {
                title: `Verbondsblad ${latest.number}`,
                date,
                url,
                postUrl,
                resultsSummary,
                resultsByReeks: buildResultsByReeks(resultsSummary),
                resultsSummaryText: resultsSummary.join(" | ")
            }
        ];
    }

    const pdfMatches = [...html.matchAll(/href=["']([^"']*Nr-(\d+)\.pdf[^"']*)["']/gi)];
    if (pdfMatches.length === 0) return [];

    const best = pdfMatches
        .map((match) => ({ url: match[1], number: Number(match[2]) }))
        .sort((a, b) => b.number - a.number)[0];

    return [
        {
            title: `Verbondsblad ${best.number}`,
            date: UNKNOWN_DATE,
            url: normalizePdfUrl(best.url),
            postUrl: null,
            resultsSummary: [],
            resultsByReeks: { reeks1: [], reeks2: [] },
            resultsSummaryText: ""
        }
    ];
}

async function extractPdfTextViaJina(pdfUrl) {
    if (!isAllowedPerkezUrl(pdfUrl)) return "";

    const pathWithoutProtocol = pdfUrl.replace(/^https?:\/\//i, "");
    const jinaUrl = `${JINA_PROXY_PREFIX}${pathWithoutProtocol}`;
    const response = await fetchWithTimeout(jinaUrl, {
        headers: {
            "User-Agent": "KVK-Ettelgem-NetlifyProxy/1.0"
        }
    });
    if (!response.ok) return "";
    return response.text();
}

async function enrichLatestItem(item) {
    if (!item) return item;
    const enriched = { ...item };

    if (enriched.postUrl && enriched.date === UNKNOWN_DATE) {
        try {
            const postResponse = await fetchWithTimeout(enriched.postUrl, {
                headers: {
                    "User-Agent": "KVK-Ettelgem-NetlifyProxy/1.0"
                }
            });
            if (postResponse.ok) {
                const postHtml = await postResponse.text();
                const publishedDate = extractPublishedDateFromPostHtml(postHtml);
                if (publishedDate !== UNKNOWN_DATE) {
                    enriched.date = publishedDate;
                }

                if ((!enriched.url || !isAllowedPerkezUrl(enriched.url))) {
                    const inlinePdf = postHtml.match(/href=["'](https?:\/\/www\.perkez\.be\/website\/wp-content\/uploads\/Nr-\d+\.pdf)["']/i);
                    if (inlinePdf?.[1]) enriched.url = inlinePdf[1];
                }
            }
        } catch {
            // Keep existing values when detail page fetch fails.
        }
    }

    if (isAllowedPerkezUrl(enriched.url)) {
        try {
            const pdfText = await extractPdfTextViaJina(enriched.url);
            const extractedSummary = extractResultsSummaryFromPdfText(pdfText);
            const extractedByReeks = extractResultsByReeksFromPdfText(pdfText);
            if (extractedSummary.length) {
                enriched.resultsSummary = extractedSummary;
                enriched.resultsSummaryText = extractedSummary.join(" | ");
            }
            if (extractedByReeks.reeks1.length || extractedByReeks.reeks2.length) {
                enriched.resultsByReeks = extractedByReeks;
            }
        } catch {
            // Keep empty summary if PDF text extraction fails.
        }
    }

    if (
        !enriched.resultsByReeks
        || (
            !Array.isArray(enriched.resultsByReeks.reeks1)
            || !Array.isArray(enriched.resultsByReeks.reeks2)
            || (!enriched.resultsByReeks.reeks1.length && !enriched.resultsByReeks.reeks2.length)
        )
    ) {
        enriched.resultsByReeks = buildResultsByReeks(enriched.resultsSummary);
    }

    if (!enriched.resultsByReeks.reeks2.length) {
        try {
            const fallbackPdfText = await extractPdfTextViaJina(REEKS2_FALLBACK_PDF_URL);
            const fallbackByReeks = extractResultsByReeksFromPdfText(fallbackPdfText);
            if (fallbackByReeks.reeks2.length) {
                enriched.resultsByReeks.reeks2 = fallbackByReeks.reeks2;
            }
        } catch {
            // Keep reeks2 empty if fallback PDF cannot be parsed.
        }
    }

    return enriched;
}

exports.handler = async (event) => {
    if (event.httpMethod && event.httpMethod !== "GET") {
        return jsonResponse(405, { error: "Method not allowed" });
    }

    try {
        const response = await fetchWithTimeout(TARGET_URL, {
            headers: {
                "User-Agent": "KVK-Ettelgem-NetlifyProxy/1.0"
            }
        });

        if (!response.ok) {
            return jsonResponse(502, { error: "Failed to fetch remote content", detail: `HTTP ${response.status}` });
        }

        const html = await response.text();
        if (html.length > 1.5 * 1024 * 1024) {
            return jsonResponse(413, { error: "Remote response too large" });
        }

        const items = parseLatestVerbondsblad(html);
        if (!items.length) return jsonResponse(200, items);

        const latest = await enrichLatestItem(items[0]);
        return jsonResponse(200, [latest]);
    } catch (error) {
        return jsonResponse(502, {
            error: "Failed to fetch remote content",
            detail: error instanceof Error ? error.message : "Unknown error"
        });
    }
};




