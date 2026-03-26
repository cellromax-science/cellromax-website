import { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 셀로맥스사이언스",
  description: "셀로맥스사이언스 개인정보처리방침",
};

/* ---------------------------------------------------------------------------
   Privacy Policy Data
   --------------------------------------------------------------------------- */

const EFFECTIVE_DATE = "2026년 3월 25일";

const sections = [
  {
    title: "제1조 (총칙)",
    content: `(주)셀로맥스사이언스(이하 "회사")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 및 관련 법령을 준수합니다. 본 개인정보처리방침은 회사가 운영하는 셀로맥스사이언스 웹사이트(이하 "사이트")에 적용됩니다.`,
  },
  {
    title: "제2조 (수집하는 개인정보 항목)",
    content: `회사는 아래와 같은 목적으로 최소한의 개인정보를 수집합니다.`,
    table: {
      headers: ["구분", "수집 항목", "수집 목적", "필수 여부"],
      rows: [
        ["문의 폼", "이름, 이메일, 전화번호", "고객 문의 접수 및 답변", "필수"],
        ["관리자 로그인", "이메일, 비밀번호", "관리자 페이지 인증", "필수"],
        ["위치정보 (GPS)", "단말기 위치", "가까운 약국 찾기 기능 제공", "선택"],
        [
          "자동 수집",
          "접속 로그, IP 주소, 쿠키",
          "서비스 안정성 확보 및 통계 분석",
          "자동 수집",
        ],
      ],
    },
  },
  {
    title: "제3조 (위치정보의 처리)",
    list: [
      '"가까운 약국 찾기" 기능 이용 시, 이용자의 단말기에서 위치정보를 수집합니다. 이는 브라우저의 위치 권한 동의를 통해 이루어지며, 이용자가 "허용"을 선택한 경우에만 수집됩니다.',
      "수집된 위치정보는 가까운 약국을 안내하는 목적으로만 사용되며, 이용자의 브라우저(단말기)에서만 처리됩니다. 회사 서버에 전송되거나 저장되지 않습니다.",
      "이용자는 브라우저 설정에서 언제든지 위치 권한을 해제할 수 있습니다.",
    ],
  },
  {
    title: "제4조 (쿠키의 사용)",
    list: [
      "회사는 서비스 개선 및 이용 통계 분석을 위해 쿠키를 사용할 수 있습니다.",
      "쿠키는 이용자의 컴퓨터를 식별하지만 이용자 개인을 식별하지는 않습니다.",
      "이용자는 웹브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있습니다. 다만, 쿠키 저장을 거부할 경우 일부 서비스 이용에 어려움이 있을 수 있습니다.",
    ],
  },
  {
    title: "제5조 (개인정보의 보유 및 파기)",
    content: `문의 폼을 통해 수집된 개인정보는 문의 처리 완료 후 3년간 보유한 뒤 지체 없이 파기합니다. 접속 로그 등 자동 수집 정보는 수집일로부터 최대 1년간 보유한 후 파기합니다. 파기 시에는 복구가 불가능한 방법을 사용합니다.`,
  },
  {
    title: "제6조 (개인정보의 제3자 제공)",
    content:
      "회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.",
    list: [
      "이용자가 사전에 동의한 경우",
      "법령에 의하여 요구되는 경우",
    ],
  },
  {
    title: "제7조 (개인정보 처리 위탁)",
    table: {
      headers: ["수탁업체", "위탁 업무"],
      rows: [
        ["Vercel Inc.", "웹사이트 호스팅 및 콘텐츠 전송"],
        ["Supabase Inc.", "데이터베이스 및 인증 서비스 제공"],
        ["카카오(주)", "지도 API 제공 (약국 위치 표시)"],
      ],
    },
  },
  {
    title: "제8조 (이용자의 권리)",
    content:
      "이용자는 언제든지 개인정보의 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다. 문의 폼을 통해 제출한 개인정보의 삭제를 원하시는 경우, 아래 개인정보 보호책임자에게 연락해 주시기 바랍니다. 브라우저의 쿠키 삭제 및 위치 권한 해제는 이용자가 직접 관리하실 수 있습니다.",
  },
  {
    title: "제9조 (만 14세 미만 아동의 개인정보)",
    content:
      "회사는 만 14세 미만 아동의 개인정보를 별도로 수집하지 않습니다. 만 14세 미만임을 알게 된 경우 해당 개인정보를 지체 없이 파기합니다.",
  },
  {
    title: "제10조 (개인정보 보호책임자)",
    content:
      "회사는 이용자의 개인정보를 보호하고 관련 불만을 처리하기 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.",
    info: [
      { label: "개인정보 보호책임자", value: "양인규" },
      { label: "소속/직위", value: "(주)셀로맥스사이언스 / 전무" },
      { label: "전화", value: "031-662-1395" },
      { label: "이메일", value: "health1395@kshp.co.kr" },
    ],
  },
  {
    title: "제11조 (권익침해 구제 방법)",
    content:
      "이용자는 개인정보 침해에 대한 신고나 상담이 필요하신 경우 아래 기관에 문의하실 수 있습니다.",
    info: [
      {
        label: "개인정보분쟁조정위원회",
        value: "(국번없이) 1833-6972 / www.kopico.go.kr",
      },
      {
        label: "개인정보침해신고센터",
        value: "(국번없이) 118 / privacy.kisa.or.kr",
      },
      {
        label: "대검찰청 사이버수사과",
        value: "(국번없이) 1301 / www.spo.go.kr",
      },
      {
        label: "경찰청 사이버수사국",
        value: "(국번없이) 182 / ecrm.police.go.kr",
      },
    ],
  },
  {
    title: "제12조 (방침의 변경)",
    content: `본 개인정보처리방침은 법령 및 회사 정책의 변경에 따라 수정될 수 있으며, 변경 시 사이트 공지를 통해 안내합니다.`,
  },
];

/* ---------------------------------------------------------------------------
   Section rendering helpers
   --------------------------------------------------------------------------- */

interface InfoItem {
  label: string;
  value: string;
}

interface TableData {
  headers: string[];
  rows: string[][];
}

interface Section {
  title: string;
  content?: string;
  list?: string[];
  table?: TableData;
  info?: InfoItem[];
}

function SectionBlock({ section, index }: { section: Section; index: number }) {
  return (
    <article className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>

      {section.content && (
        <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
          {section.content}
        </p>
      )}

      {section.list && (
        <ul className="space-y-2 pl-1">
          {section.list.map((item, i) => (
            <li
              key={i}
              className="text-sm leading-relaxed text-gray-700 flex gap-2"
            >
              <span className="text-gray-400 shrink-0">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {section.table && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {section.table.headers.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, ri) => (
                <tr
                  key={ri}
                  className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-4 py-3 text-gray-700 border-b border-gray-100"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section.info && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          {section.info.map((item, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <span className="font-medium text-gray-600 shrink-0 min-w-[140px]">
                {item.label}:
              </span>
              <span className="text-gray-700">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

/* ---------------------------------------------------------------------------
   Page Component
   --------------------------------------------------------------------------- */

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            개인정보처리방침
          </h1>
          <p className="text-sm text-gray-500">시행일: {EFFECTIVE_DATE}</p>
        </header>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map((section, index) => (
            <SectionBlock key={index} section={section} index={index} />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            본 방침은 {EFFECTIVE_DATE}부터 시행됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
