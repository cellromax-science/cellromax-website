# BizM 문자 발송 고정 IP 중계 (카페24)

비즈엠(BizM)은 **등록된 IP에서만** 문자 발송 API 호출을 허용한다 (미등록 시 `M140` 오류).
Vercel 서버리스는 고정 IP가 없으므로, 고정 IP를 가진 카페24 웹호스팅에 `relay.php` 를
올려 두고 발송 요청을 경유시킨다.

```
Vercel (유동 IP) → relay.php (카페24 고정 IP) → 비즈엠 API
```

비즈엠 계정명·프로필키는 카페24 서버에 저장하지 않는다. Vercel 이 보낸 요청을
토큰 검증 후 그대로 포워딩만 한다.

## 설치 순서

1. **토큰 생성** — 충분히 긴 무작위 문자열을 만든다.

   ```bash
   openssl rand -hex 32
   ```

2. **relay.php 수정** — 파일 상단의 `RELAY_TOKEN` 값을 위 토큰으로 교체한다.
   (교체하지 않으면 스크립트가 500 오류로 동작을 거부한다)

3. **카페24 업로드** — FTP 또는 파일관리자로 `/kshpnew/www/plugin/bizm-relay/` 에
   `relay.php` 업로드. 호스팅 관리에서 PHP 버전이 7 이상인지 확인 (5.6 이상이면 동작은 함).

4. **서버 IP 확인** — 아래 요청으로 카페24 서버 IP를 확인한다.

   ```bash
   curl -H "X-Relay-Token: <토큰>" https://<내도메인>/plugin/bizm-relay/relay.php
   ```

   응답의 `server_addr` 이 서버 IP. (카페24 호스팅 관리 페이지의 서버 정보에서도 확인 가능)

5. **비즈엠 IP 등록** — 비즈엠 관리자 페이지의 문자발송 IP 관리에 위 IP를 등록한다.

6. **Vercel 환경변수 설정** 후 재배포한다.

   | 변수 | 값 |
   | --- | --- |
   | `BIZM_PROXY_URL` | `https://<내도메인>/plugin/bizm-relay/relay.php` |
   | `BIZM_PROXY_TOKEN` | 1번에서 만든 토큰 |

   두 변수를 지우면 다시 비즈엠 직접 호출로 돌아간다 (`lib/sms/bizm.ts` 참고).

## 주의

- 카페24 웹호스팅은 공유 IP라서 같은 서버의 다른 고객과 IP를 공유한다.
  비즈엠 계정 정보 없이는 발송이 불가능하므로 실질적 위험은 낮다.
- 카페24가 서버를 이전하면 IP가 바뀔 수 있다. 공지가 오면 비즈엠에 새 IP를 재등록할 것.
- `RELAY_TOKEN` 이 들어간 relay.php 는 저장소에 커밋하지 말 것 (이 폴더의 원본은 placeholder 상태 유지).
