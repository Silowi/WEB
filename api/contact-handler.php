<?php
// contact-handler.php
// Veilige contact formulier handler voor KVK Ettelgem
// Valideert input, voorkomt spam, en verstuurt e-mail

header('Content-Type: application/json; charset=utf-8');

// Configuratie
$toEmail = 'drukkerij.devlieghere@skynet.be';
$fromName = 'KVK Ettelgem Website';
$allowedOrigins = [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    // Voeg hier je productie domein toe, bijv. 'https://www.kvkettelgem.be'
];

// CORS headers
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : null;
if ($origin && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: *');
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Rate limiting (simpel - check laatste verzending tijd via sessie)
session_start();
$lastSubmit = isset($_SESSION['last_contact_submit']) ? $_SESSION['last_contact_submit'] : 0;
$timeSinceLastSubmit = time() - $lastSubmit;
$minWaitTime = 60; // 1 minuut tussen submissions

if ($timeSinceLastSubmit < $minWaitTime) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'message' => 'Te snel verzonden. Wacht even en probeer opnieuw.'
    ]);
    exit;
}

// Input validatie
$name = isset($_POST['name']) ? trim($_POST['name']) : '';
$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$subject = isset($_POST['subject']) ? trim($_POST['subject']) : '';
$message = isset($_POST['message']) ? trim($_POST['message']) : '';

$errors = [];

if (empty($name) || strlen($name) < 2) {
    $errors[] = 'Naam moet minimaal 2 karakters bevatten';
}

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Ongeldig e-mailadres';
}

if (empty($subject) || strlen($subject) < 3) {
    $errors[] = 'Onderwerp moet minimaal 3 karakters bevatten';
}

if (empty($message) || strlen($message) < 10) {
    $errors[] = 'Bericht moet minimaal 10 karakters bevatten';
}

// Spam check (simpele honeypot of keywords)
$spamKeywords = ['viagra', 'cialis', 'casino', 'lottery', 'prize'];
$messageL = strtolower($message);
foreach ($spamKeywords as $keyword) {
    if (strpos($messageL, $keyword) !== false) {
        $errors[] = 'Bericht bevat verdachte inhoud';
        break;
    }
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => implode(', ', $errors)
    ]);
    exit;
}

// Sanitize input (voorkom XSS in email body)
$name = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
$email = filter_var($email, FILTER_SANITIZE_EMAIL);
$subject = htmlspecialchars($subject, ENT_QUOTES, 'UTF-8');
$message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');

// Bouw e-mail
$emailSubject = "Contact formulier: " . $subject;
$emailBody = "Nieuw bericht van het KVK Ettelgem contact formulier:\n\n";
$emailBody .= "Naam: " . $name . "\n";
$emailBody .= "E-mail: " . $email . "\n";
$emailBody .= "Onderwerp: " . $subject . "\n\n";
$emailBody .= "Bericht:\n" . $message . "\n\n";
$emailBody .= "---\n";
$emailBody .= "Verzonden op: " . date('d-m-Y H:i:s') . "\n";
$emailBody .= "IP adres: " . ($_SERVER['REMOTE_ADDR'] ?? 'onbekend') . "\n";

// E-mail headers
$headers = "From: " . $fromName . " <noreply@" . $_SERVER['HTTP_HOST'] . ">\r\n";
$headers .= "Reply-To: " . $email . "\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

// Verstuur e-mail
$mailSent = @mail($toEmail, $emailSubject, $emailBody, $headers);

if ($mailSent) {
    // Update laatste verzend tijd
    $_SESSION['last_contact_submit'] = time();
    
    echo json_encode([
        'success' => true,
        'message' => 'Bericht succesvol verzonden!'
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'E-mail verzenden mislukt. Probeer het later opnieuw of mail direct naar ' . $toEmail
    ]);
}
?>
