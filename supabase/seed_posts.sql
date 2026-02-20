-- ============================================================
-- Newsroom Sample Posts (5 notices + 5 news + 5 videos)
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. 공지사항 (notice) x 5
-- ---------------------------------------------------------------------------

INSERT INTO posts (post_type, title_ko, title_en, title_zh, title_vi, content_ko, content_en, thumbnail_url, is_pinned, is_active, published_at)
VALUES
(
  'notice',
  '2026년 셀로맥스사이언스 신년 인사',
  '2026 Cellromax Science New Year Greeting',
  '2026年赛络迈科学新年致辞',
  'Lời chúc năm mới 2026 của Cellromax Science',
  '안녕하세요, 셀로맥스사이언스입니다.

2026년 새해를 맞이하여 고객 여러분께 감사 인사를 드립니다. 올해도 최고 품질의 건강기능식품으로 여러분의 건강한 삶에 기여하겠습니다.

더 나은 제품과 서비스로 보답하겠습니다. 감사합니다.',
  'Hello, this is Cellromax Science.

We would like to extend our gratitude to all customers as we welcome the new year 2026. We will continue to contribute to your healthy lives with the highest quality health functional foods.

Thank you for your continued support.',
  'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&q=80',
  true,
  true,
  '2026-01-02'
),
(
  'notice',
  '홈페이지 리뉴얼 안내',
  'Website Renewal Notice',
  '网站改版通知',
  'Thông báo đổi mới trang web',
  '셀로맥스사이언스 홈페이지가 새롭게 리뉴얼되었습니다.

더욱 편리하고 직관적인 UI로 제품 정보와 회사 소식을 확인하실 수 있습니다. 새로운 홈페이지에서 다양한 콘텐츠를 만나보세요.

이용에 불편사항이 있으시면 고객센터로 문의해 주세요.',
  'The Cellromax Science website has been renewed.

You can now check product information and company news with a more convenient and intuitive UI. Discover various content on our new website.

If you experience any inconvenience, please contact our customer center.',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
  true,
  true,
  '2026-02-15'
),
(
  'notice',
  '2026년 1분기 실적 발표 일정 안내',
  'Q1 2026 Earnings Announcement Schedule',
  '2026年第一季度业绩发布日程通知',
  'Thông báo lịch trình công bố kết quả Q1 2026',
  '2026년 1분기 실적 발표가 아래 일정으로 진행될 예정입니다.

- 일시: 2026년 4월 15일 (수) 오후 2시
- 장소: 서울 본사 대회의실
- 참석 대상: 기관투자자 및 애널리스트

자세한 사항은 IR 담당부서로 문의해 주시기 바랍니다.',
  'The Q1 2026 earnings announcement is scheduled as follows.

- Date: April 15, 2026 (Wed) 2:00 PM
- Location: Seoul HQ Conference Room
- Attendees: Institutional investors and analysts

For more details, please contact our IR department.',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
  false,
  true,
  '2026-02-10'
),
(
  'notice',
  '개인정보 처리방침 변경 안내',
  'Privacy Policy Update Notice',
  '隐私政策变更通知',
  'Thông báo thay đổi chính sách bảo mật',
  '개인정보 처리방침이 2026년 3월 1일부로 변경됩니다.

주요 변경사항:
- 개인정보 보유 기간 명시
- 제3자 제공 항목 상세화
- 개인정보 파기 절차 보완

변경된 처리방침은 홈페이지에서 확인하실 수 있습니다.',
  'Our privacy policy will be updated effective March 1, 2026.

Key changes:
- Specification of personal data retention periods
- Detailed third-party sharing provisions
- Enhanced data destruction procedures

The updated policy can be found on our website.',
  'https://images.unsplash.com/photo-1633265486064-086b219458ec?w=800&q=80',
  false,
  true,
  '2026-02-01'
),
(
  'notice',
  '설 연휴 배송 및 고객센터 운영 안내',
  'Lunar New Year Holiday Delivery & CS Schedule',
  '春节假期配送及客服运营通知',
  'Thông báo lịch giao hàng và CSKH dịp Tết Nguyên đán',
  '설 연휴 기간 배송 및 고객센터 운영 안내드립니다.

- 택배 마감: 2026년 1월 25일 (금) 오후 3시
- 고객센터 휴무: 1월 27일 ~ 1월 30일
- 정상 운영: 2월 2일 (월)부터

연휴 기간 접수된 문의는 순차적으로 답변 드리겠습니다.',
  'Here is the delivery and customer service schedule for the Lunar New Year holiday.

- Delivery cutoff: January 25, 2026 (Fri) 3:00 PM
- CS holiday: January 27 - January 30
- Normal operations resume: February 2 (Mon)

Inquiries received during the holiday will be answered in order.',
  'https://images.unsplash.com/photo-1586880244406-556ebe35f282?w=800&q=80',
  false,
  true,
  '2026-01-20'
);

-- ---------------------------------------------------------------------------
-- 2. 뉴스 (news) x 5
-- ---------------------------------------------------------------------------

INSERT INTO posts (post_type, title_ko, title_en, title_zh, title_vi, content_ko, content_en, thumbnail_url, is_pinned, is_active, published_at)
VALUES
(
  'news',
  '셀로맥스사이언스, 베트남 시장 진출 본격화',
  'Cellromax Science Accelerates Vietnam Market Entry',
  '赛络迈科学正式进军越南市场',
  'Cellromax Science đẩy mạnh tiến vào thị trường Việt Nam',
  '셀로맥스사이언스가 베트남 현지 유통망 구축을 완료하고 본격적인 시장 진출에 나섰습니다.

호치민과 하노이를 중심으로 주요 약국 체인과 파트너십을 체결했으며, 건강기능식품 3종을 우선 출시할 예정입니다.

동남아 시장은 헬스케어 산업의 빠른 성장이 예상되는 핵심 지역으로, 향후 태국과 인도네시아로의 확장도 계획하고 있습니다.',
  'Cellromax Science has completed building its distribution network in Vietnam and has begun full-scale market entry.

Partnerships have been established with major pharmacy chains in Ho Chi Minh City and Hanoi, with three health functional food products planned for initial launch.

The Southeast Asian market is a key region with expected rapid growth in the healthcare industry, and expansion to Thailand and Indonesia is also planned.',
  'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80',
  true,
  true,
  '2026-02-18'
),
(
  'news',
  '신제품 ''프리미엄 오메가3 플러스'' 출시',
  'New Product Launch: Premium Omega-3 Plus',
  '新品"高端欧米伽3 Plus"上市',
  'Ra mắt sản phẩm mới ''Premium Omega-3 Plus''',
  '셀로맥스사이언스가 프리미엄 오메가3 플러스를 새롭게 출시했습니다.

이번 신제품은 기존 대비 EPA/DHA 함량을 30% 높이고, 흡수율을 개선한 rTG 형태의 고농축 오메가3입니다.

특허받은 캡슐 기술로 생선 냄새를 최소화하여 복용 편의성을 크게 개선했습니다.',
  'Cellromax Science has launched Premium Omega-3 Plus.

This new product features 30% higher EPA/DHA content compared to the previous version, and is a highly concentrated rTG form omega-3 with improved absorption.

Patented capsule technology minimizes fish odor, greatly improving ease of consumption.',
  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80',
  false,
  true,
  '2026-02-12'
),
(
  'news',
  '2025년 매출 500억 돌파, 역대 최대 실적',
  'Record Revenue of KRW 50B in 2025',
  '2025年营收突破500亿韩元，创历史新高',
  'Doanh thu năm 2025 vượt 50 tỷ KRW, đạt kỷ lục',
  '셀로맥스사이언스가 2025년 연간 매출 500억 원을 돌파하며 역대 최대 실적을 기록했습니다.

건강기능식품 부문이 전년 대비 25% 성장하며 실적을 견인했고, 해외 매출 비중도 15%로 확대되었습니다.

2026년에는 동남아 시장 확대와 신제품 출시를 통해 600억 원 매출 목표를 달성할 계획입니다.',
  'Cellromax Science achieved record annual revenue of KRW 50 billion in 2025.

The health functional food segment drove performance with 25% year-over-year growth, and overseas revenue share expanded to 15%.

In 2026, the company plans to achieve a revenue target of KRW 60 billion through Southeast Asian market expansion and new product launches.',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
  false,
  true,
  '2026-01-28'
),
(
  'news',
  'GMP 인증 획득 및 제조시설 확장',
  'GMP Certification and Manufacturing Facility Expansion',
  '获得GMP认证并扩建生产设施',
  'Đạt chứng nhận GMP và mở rộng cơ sở sản xuất',
  '셀로맥스사이언스의 제2공장이 식약처 GMP 인증을 획득했습니다.

신규 공장은 기존 대비 생산능력이 2배로 확대되며, 최신 자동화 설비를 도입하여 제품 품질과 생산 효율성을 동시에 향상시켰습니다.

이를 통해 증가하는 국내외 수요에 안정적으로 대응할 수 있게 되었습니다.',
  'Cellromax Science''s second factory has obtained GMP certification from the MFDS.

The new factory doubles production capacity compared to the existing facility and introduces state-of-the-art automated equipment to simultaneously improve product quality and production efficiency.

This enables stable response to growing domestic and international demand.',
  'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80',
  false,
  true,
  '2026-01-15'
),
(
  'news',
  '중국 건강박람회 참가, 현지 파트너십 확대',
  'Participation in China Health Expo, Expanding Local Partnerships',
  '参加中国健康博览会，扩大当地合作',
  'Tham gia Hội chợ Sức khỏe Trung Quốc, mở rộng hợp tác',
  '셀로맥스사이언스가 중국 상하이에서 열린 국제 건강박람회에 참가하여 자사 건강기능식품을 선보였습니다.

전시 기간 동안 중국 현지 유통사 3곳과 MOU를 체결하며 중화권 시장 진출의 기반을 마련했습니다.

중국 소비자들의 높은 관심을 확인할 수 있었으며, 하반기 정식 수출을 목표로 하고 있습니다.',
  'Cellromax Science participated in an international health expo in Shanghai, China, showcasing its health functional food products.

During the exhibition, MOUs were signed with three local Chinese distributors, laying the groundwork for entry into the Greater China market.

Strong interest from Chinese consumers was confirmed, with official exports targeted for the second half of the year.',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
  false,
  true,
  '2025-12-20'
);

-- ---------------------------------------------------------------------------
-- 3. 홍보영상 (video) x 5
-- ---------------------------------------------------------------------------

INSERT INTO posts (post_type, title_ko, title_en, title_zh, title_vi, content_ko, content_en, youtube_id, is_pinned, is_active, published_at)
VALUES
(
  'video',
  '셀로맥스사이언스 기업 소개 영상',
  'Cellromax Science Corporate Introduction',
  '赛络迈科学企业介绍视频',
  'Video giới thiệu doanh nghiệp Cellromax Science',
  '셀로맥스사이언스의 기업 비전과 핵심 가치를 소개하는 공식 영상입니다.',
  'Official video introducing the corporate vision and core values of Cellromax Science.',
  'dQw4w9WgXcQ',
  true,
  true,
  '2026-02-01'
),
(
  'video',
  '프리미엄 건강기능식품 제조 과정',
  'Premium Health Supplement Manufacturing Process',
  '高端健康功能食品生产过程',
  'Quy trình sản xuất thực phẩm chức năng cao cấp',
  'GMP 인증 시설에서 최고 품질의 건강기능식품이 만들어지는 전 과정을 공개합니다.',
  'Discover the complete process of creating the highest quality health supplements at our GMP-certified facility.',
  'jNQXAC9IVRw',
  false,
  true,
  '2026-01-25'
),
(
  'video',
  '2025 셀로맥스사이언스 하이라이트',
  '2025 Cellromax Science Highlights',
  '2025赛络迈科学精彩回顾',
  'Điểm nhấn Cellromax Science 2025',
  '2025년 한 해 동안 셀로맥스사이언스의 주요 성과와 활동을 정리한 영상입니다.',
  'A recap of Cellromax Science''s key achievements and activities throughout 2025.',
  '9bZkp7q19f0',
  false,
  true,
  '2026-01-10'
),
(
  'video',
  '베트남 시장 진출 현장 스케치',
  'Vietnam Market Entry Behind the Scenes',
  '越南市场进军现场花絮',
  'Phác thảo hiện trường tiến vào thị trường Việt Nam',
  '베트남 호치민과 하노이 현지에서 진행된 파트너십 체결 및 시장 조사 현장을 담은 영상입니다.',
  'Behind-the-scenes footage of partnership agreements and market research in Ho Chi Minh City and Hanoi, Vietnam.',
  'kJQP7kiw5Fk',
  false,
  true,
  '2025-12-15'
),
(
  'video',
  '고객 인터뷰 - 건강한 일상의 시작',
  'Customer Interview - Starting a Healthy Daily Life',
  '客户采访 - 健康日常的开始',
  'Phỏng vấn khách hàng - Khởi đầu cuộc sống khỏe mạnh',
  '셀로맥스사이언스 제품을 꾸준히 복용하고 계신 고객님들의 생생한 후기를 담았습니다.',
  'Real testimonials from customers who consistently take Cellromax Science products.',
  'RgKAFK5djSk',
  false,
  true,
  '2025-11-28'
);
