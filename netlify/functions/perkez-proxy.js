const TARGET_URL = "https://www.perkez.be/verbondsbladen/";
const UNKNOWN_DATE = "Datum onbekend";
const SCORE_PATTERN = /\b\d{1,2}\s*[-:]\s*\d{1,2}\b/;

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

function extractResultsSummary(sectionHtml) {
    const lineRegex = /<(?:li|p|td|div|span)[^>]*>([\s\S]{0,260})<\/(?:li|p|td|div|span)>/gi;
    const seen = new Set();
    const lines = [];
    let match;

    while ((match = lineRegex.exec(sectionHtml)) !== null) {
        const line = stripHtml(match[1]);
        if (!line) continue;
        if (!SCORE_PATTERN.test(line)) continue;
        if (!/[A-Za-zÀ-ÿ]/.test(line)) continue;

        const normalized = line.replace(/\s+/g, " ").trim();
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        lines.push(normalized);

        if (lines.length >= 8) break;
    }

    return lines;
}

function extractDate(text, num) {
    const byNumber = new RegExp(`Verbondsblad\\s*${num}[\\s\\S]{0,220}?(\\d{1,2}\\s+[A-Za-zÀ-ÿ]+\\s+\\d{4})`, "i");
    const numberMatch = text.match(byNumber);
    if (numberMatch?.[1]) return numberMatch[1].trim();

    const plainMatch = text.match(/(\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+\d{4})/i);
    if (plainMatch?.[1]) return plainMatch[1].trim();

    const slashMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (slashMatch?.[1]) return slashMatch[1].trim();

    return UNKNOWN_DATE;
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
        const linkMatch = section.match(/href=["']([^"']*Nr-\d+\.pdf[^"']*)["']/i);
        const url = normalizePdfUrl(
            linkMatch?.[1] ?? `https://www.perkez.be/website/wp-content/uploads/Nr-${latest.number}.pdf`
        );

        return [
            {
                title: `Verbondsblad ${latest.number}`,
                date,
                url,
                resultsSummary,
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
            resultsSummary: [],
            resultsSummaryText: ""
        }
    ];
}

exports.handler = async (event) => {
    if (event.httpMethod && event.httpMethod !== "GET") {
        return jsonResponse(405, { error: "Method not allowed" });
    }

    try {
        const response = await fetch(TARGET_URL, {
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
        return jsonResponse(200, items);
    } catch (error) {
        return jsonResponse(502, {
            error: "Failed to fetch remote content",
            detail: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
