/**
 * JSON-LD 구조화 데이터를 <script> 태그로 삽입하는 서버 컴포넌트.
 * 서버에서 생성된 schema.org 데이터만 사용하므로 XSS 위험 없음.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // 서버 생성 구조화 데이터 — 사용자 입력 아님
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
