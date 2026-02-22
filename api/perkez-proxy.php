<?php
// perkez-proxy.php
// Veilig, beperkt proxy voor: https://www.perkez.be/verbondsbladen/
// - Whitelist origins (pas aan naar je productie-domein)
// - Cache resultaat 10 minuten
// - Return JSON met exact 1 item: het meest recente verbondsblad {title,date,url}
// - Timeouts, size limits, geen forwarding van cookies

// Config - pas dit aan in productie
$allowedOrigins = [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    // voeg hier je productie domein toe, bijv. 'https://www.jouwdomein.be'
];
$targetUrl = 'https://www.perkez.be/verbondsbladen/';
$cacheFile = __DIR__ . '/perkez-cache.json';
$cacheTtl = 600; // 10 minuten
$maxSize = 1.5 * 1024 * 1024; // 1.5 MB
$timeout = 8; // seconds
$defaultPdfBase = 'https://www.perkez.be/website/wp-content/uploads';

function normalizeUrl($href, $base = 'https://www.perkez.be') {
    if (strpos($href, 'http') === 0) {
        return $href;
    }

    return rtrim($base, '/') . '/' . ltrim($href, '/');
}

function extractDateForNumber($text, $num) {
    $safeNum = preg_quote((string)$num, '/');
    if (preg_match('/Verbondsblad\s*' . $safeNum . '.{0,220}?(\d{1,2}\s+\p{L}+\s+\d{4})/uis', $text, $m)) {
        return trim($m[1]);
    }

    if (preg_match('/(\d{1,2}\s+\p{L}+\s+\d{4})/u', $text, $m)) {
        return trim($m[1]);
    }

    if (preg_match('/(\d{1,2}\/\d{1,2}\/\d{4})/u', $text, $m)) {
        return trim($m[1]);
    }

    return null;
}

// Only allow GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// CORS: allow only whitelisted origins (if present)
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : null;
if ($origin) {
    if (in_array($origin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    } else {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Origin not allowed']);
        exit;
    }
} else {
    // No origin (e.g. server-side request), allow generic access for testing
    header('Access-Control-Allow-Origin: *');
}

header('Content-Type: application/json; charset=utf-8');

// Serve from cache when fresh
if (file_exists($cacheFile)) {
    $meta = stat($cacheFile);
    if ($meta && (time() - $meta['mtime'] < $cacheTtl)) {
        $cached = file_get_contents($cacheFile);
        if ($cached !== false) {
            echo $cached;
            exit;
        }
    }
}

// Fetch remote page
$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
curl_setopt($ch, CURLOPT_USERAGENT, 'KVK-Ettelgem-Proxy/1.0');
// Do not send client's cookies or headers to target
curl_setopt($ch, CURLOPT_COOKIE, '');

$content = curl_exec($ch);
$err = curl_error($ch);
$httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($content === false || $httpStatus >= 400) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to fetch remote content', 'detail' => $err]);
    exit;
}

if (strlen($content) > $maxSize) {
    http_response_code(413);
    echo json_encode(['error' => 'Remote response too large']);
    exit;
}

// Parse HTML and extract latest verbondsblad
libxml_use_internal_errors(true);
$dom = new DOMDocument();
$loaded = $dom->loadHTML($content);
libxml_clear_errors();

$xpath = new DOMXPath($dom);
$found = [];

// Primary strategy: parse per verbondsblad heading and nearby date text
$headingNodes = $xpath->query('//h3[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "verbondsblad")]');
foreach ($headingNodes as $heading) {
    $headingText = trim($heading->textContent);
    if (!preg_match('/Verbondsblad\s*(\d+)/i', $headingText, $m)) {
        continue;
    }

    $num = $m[1];
    if (isset($found[$num])) {
        continue;
    }

    $parentText = $heading->parentNode ? trim($heading->parentNode->textContent) : $headingText;
    $date = extractDateForNumber($parentText, $num);

    if (!$date) {
        $scanNode = $heading;
        for ($i = 0; $i < 6 && $scanNode; $i++) {
            $scanNode = $scanNode->nextSibling;
            if (!$scanNode) {
                break;
            }

            $candidate = trim($scanNode->textContent);
            if ($candidate === '') {
                continue;
            }

            $date = extractDateForNumber($candidate, $num);
            if ($date) {
                break;
            }
        }
    }

    $pdfUrl = null;
    $downloadLink = $xpath->query('.//a[contains(@href, ".pdf")]', $heading->parentNode)->item(0);
    if ($downloadLink) {
        $pdfUrl = normalizeUrl($downloadLink->getAttribute('href'));
    }

    if (!$pdfUrl) {
        $pdfUrl = rtrim($defaultPdfBase, '/') . '/Nr-' . $num . '.pdf';
    }

    $found[$num] = [
        'title' => 'Verbondsblad ' . $num,
        'date' => $date ?: 'Datum onbekend',
        'url' => $pdfUrl,
    ];
}

// Fallback: scan links for Nr-XXXX.pdf if heading strategy found nothing
if (count($found) === 0) {
    $pdfNodes = $xpath->query('//a[contains(@href, "Nr-") and contains(@href, ".pdf")]');
    foreach ($pdfNodes as $node) {
        $href = $node->getAttribute('href');
        if (!preg_match('/Nr-(\d+)\.pdf/i', $href, $m)) {
            continue;
        }

        $num = $m[1];
        if (isset($found[$num])) {
            continue;
        }

        $date = 'Datum onbekend';
        $ancestor = $node;
        for ($i = 0; $i < 4 && $ancestor; $i++) {
            $ancestor = $ancestor->parentNode;
            if (!$ancestor) {
                break;
            }

            $candidate = extractDateForNumber(trim($ancestor->textContent), $num);
            if ($candidate) {
                $date = $candidate;
                break;
            }
        }

        $found[$num] = [
            'title' => 'Verbondsblad ' . $num,
            'date' => $date,
            'url' => normalizeUrl($href),
        ];

        if (count($found) >= 1) {
            break;
        }
    }
}

// Prepare result: sort by number desc and take only the latest item
if (count($found) > 0) {
    krsort($found, SORT_NUMERIC);
    $result = array_slice($found, 0, 1, true);
} else {
    $result = [];
}

$output = json_encode(array_values($result), JSON_UNESCAPED_UNICODE);
// Cache output
@file_put_contents($cacheFile, $output, LOCK_EX);

echo $output;
