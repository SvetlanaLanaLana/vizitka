<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Метод не поддерживается']);
    exit;
}

$config = require __DIR__ . '/telegram-config.php';

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Некорректные данные']);
    exit;
}

$name = trim($data['name'] ?? '');
$contactType = $data['contact_type'] ?? 'phone';
$phone = trim($data['phone'] ?? '');
$email = trim($data['email'] ?? '');
$service = trim($data['service'] ?? '');
$message = trim($data['message'] ?? '');
$consent = !empty($data['consent']);

if ($name === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Укажите имя']);
    exit;
}

if (!$consent) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Необходимо согласие на обработку персональных данных']);
    exit;
}

if ($contactType === 'email') {
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Укажите корректный email']);
        exit;
    }
    $contactLine = "📧 Email: {$email}";
} else {
    if ($phone === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Укажите телефон']);
        exit;
    }
    $contactLine = "📱 Телефон: {$phone}";
}

$lines = [
    '🆕 Новая заявка с сайта',
    '',
    "👤 Имя: {$name}",
    $contactLine,
];

if ($service !== '') {
    $lines[] = "🛠 Услуга: {$service}";
}

if ($message !== '') {
    $lines[] = "💬 Комментарий: {$message}";
}

$lines[] = '';
$lines[] = '✅ Согласие на обработку персональных данных: да';

$text = implode("\n", $lines);

$payload = [
    'chat_id' => $config['chatId'],
    'text' => $text,
];

$url = 'https://api.telegram.org/bot' . $config['botToken'] . '/sendMessage';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    CURLOPT_TIMEOUT => 15,
]);

$response = curl_exec($ch);
$curlError = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Не удалось связаться с Telegram: ' . $curlError]);
    exit;
}

$result = json_decode($response, true);

if (empty($result['ok'])) {
    $apiError = $result['description'] ?? 'Неизвестная ошибка Telegram';

    if (stripos($apiError, "can't initiate conversation") !== false) {
        $botName = $config['botUsername'] ?? 'bot';
        $apiError = "Сначала напишите боту @{$botName} команду /start в Telegram, затем отправьте заявку снова.";
    }

    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => $apiError]);
    exit;
}

echo json_encode(['ok' => true]);
