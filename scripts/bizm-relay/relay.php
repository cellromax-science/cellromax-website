<?php
/**
 * BizM SMS 중계 스크립트 (카페24 웹호스팅용)
 *
 * Vercel(유동 IP) → 이 스크립트(카페24 고정 IP) → 비즈엠 API 로 발송 요청을 전달한다.
 * 비즈엠에는 이 스크립트가 올라간 카페24 서버 IP만 등록하면 된다.
 *
 * 설치:
 *   1. 아래 RELAY_TOKEN 값을 충분히 긴 무작위 문자열로 교체 (예: openssl rand -hex 32)
 *   2. 카페24 웹 루트(www/)에 업로드
 *   3. Vercel 환경변수 BIZM_PROXY_URL 에 이 파일의 전체 URL,
 *      BIZM_PROXY_TOKEN 에 같은 토큰 값을 설정
 *
 * 비즈엠 계정명(userid)과 프로필키는 이 서버에 저장하지 않는다.
 * Vercel 쪽에서 요청 헤더/바디로 전달된 값을 그대로 포워딩만 한다.
 *
 * 요구사항: PHP 5.6 이상 + curl 확장 (카페24 호스팅 관리에서 PHP 7 이상 권장)
 */

// ★ 반드시 교체할 것: Vercel의 BIZM_PROXY_TOKEN 과 동일한 값
const RELAY_TOKEN = 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET';

// 비즈엠 운영 서버 (호출자가 임의 URL로 바꿀 수 없도록 여기 고정)
const BIZM_ENDPOINT = 'https://alimtalk-api.bizmsg.kr/v2/sender/send';

header('Content-Type: application/json; charset=utf-8');

function respond_error($status, $message)
{
    http_response_code($status);
    echo json_encode(array('relay_error' => $message));
    exit;
}

// --- 토큰 검증 -------------------------------------------------------------
$token = isset($_SERVER['HTTP_X_RELAY_TOKEN']) ? $_SERVER['HTTP_X_RELAY_TOKEN'] : '';
if (RELAY_TOKEN === 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET') {
    respond_error(500, 'RELAY_TOKEN is not configured.');
}
if (!is_string($token) || !hash_equals(RELAY_TOKEN, $token)) {
    respond_error(403, 'invalid relay token');
}

// --- GET: 서버 IP 확인용 (비즈엠 IP 등록 시 참고) ---------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(array(
        'ok' => true,
        'server_addr' => isset($_SERVER['SERVER_ADDR']) ? $_SERVER['SERVER_ADDR'] : null,
    ));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error(405, 'method not allowed');
}

// --- 포워딩 ----------------------------------------------------------------
$userid = isset($_SERVER['HTTP_USERID']) ? trim($_SERVER['HTTP_USERID']) : '';
if ($userid === '') {
    respond_error(400, 'missing userid header');
}

$body = file_get_contents('php://input');
if ($body === false || $body === '') {
    respond_error(400, 'empty request body');
}

$ch = curl_init(BIZM_ENDPOINT);
curl_setopt_array($ch, array(
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => array(
        'Content-Type: application/json',
        'Accept: application/json',
        'userid: ' . $userid,
    ),
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 20,
));

$response = curl_exec($ch);
if ($response === false) {
    $err = curl_error($ch);
    curl_close($ch);
    respond_error(502, 'bizm request failed: ' . $err);
}

$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// 비즈엠 응답을 상태코드 포함 그대로 반환
http_response_code($status);
echo $response;
