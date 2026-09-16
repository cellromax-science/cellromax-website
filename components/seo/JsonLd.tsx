/**
 * JSON-LD 구조화 데이터를 <script> 태그로 삽입하는 서버 컴포넌트.
 * 값에 DB 텍스트가 실리므로 "<"를 이스케이프해 "</script>" 조기 종료를 방지한다.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
