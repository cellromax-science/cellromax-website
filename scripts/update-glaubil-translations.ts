/**
 * 글라우빌 — 다국어 번역 업데이트 (탭 콘텐츠 + HTML 상세페이지)
 *
 * 실행: npx tsx scripts/update-glaubil-translations.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// ENV
// ---------------------------------------------------------------------------

function loadEnv() {
  const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// ---------------------------------------------------------------------------
// Translation Map — [ko, en, zh, vi]
// 순서 중요: 긴 문자열 먼저 (부분 매칭 방지)
// ---------------------------------------------------------------------------

const translations: [string, string, string, string][] = [
  // ===== HEAD / META =====
  [
    '<html lang="ko">',
    '<html lang="en">',
    '<html lang="zh">',
    '<html lang="vi">',
  ],
  [
    '<title>셀로맥스 글라우빌 | CELLROMAX GLAUBIL</title>',
    '<title>CELLROMAX Glaubil | Premium Eye Health Solution</title>',
    '<title>CELLROMAX Glaubil | 微循环专业护眼方案</title>',
    '<title>CELLROMAX Glaubil | Giải pháp sức khỏe mắt cao cấp</title>',
  ],
  [
    'content="미세순환 특화 프리미엄 눈 건강 솔루션 - 셀로맥스 글라우빌"',
    'content="Premium eye health solution specialized in microcirculation - CELLROMAX Glaubil"',
    'content="微循环专业高端护眼方案 - CELLROMAX Glaubil"',
    'content="Giải pháp sức khỏe mắt cao cấp chuyên về vi tuần hoàn - CELLROMAX Glaubil"',
  ],

  // ===== SECTION 1: HERO =====
  [
    '<span class="gold-gradient">글라우빌</span>\n    </h1>\n    <p class="text-xl md:text-2xl font-extralight text-gray-300 tracking-[0.2em] mb-5 animate-in" id="heroEng">GLAUBIL</p>\n    <p class="text-lg md:text-xl text-gray-500 font-normal mb-10 animate-in" id="heroSub">미세순환 특화 프리미엄 눈 건강 솔루션</p>',
    '<span class="gold-gradient">Glaubil</span>\n    </h1>\n    <p class="text-xl md:text-2xl font-extralight text-gray-300 tracking-[0.2em] mb-5 animate-in" id="heroEng">GLAUBIL</p>\n    <p class="text-lg md:text-xl text-gray-500 font-normal mb-10 animate-in" id="heroSub">Premium Eye Health Solution for Microcirculation</p>',
    '<span class="gold-gradient">Glaubil</span>\n    </h1>\n    <p class="text-xl md:text-2xl font-extralight text-gray-300 tracking-[0.2em] mb-5 animate-in" id="heroEng">GLAUBIL</p>\n    <p class="text-lg md:text-xl text-gray-500 font-normal mb-10 animate-in" id="heroSub">微循环专业高端护眼方案</p>',
    '<span class="gold-gradient">Glaubil</span>\n    </h1>\n    <p class="text-xl md:text-2xl font-extralight text-gray-300 tracking-[0.2em] mb-5 animate-in" id="heroEng">GLAUBIL</p>\n    <p class="text-lg md:text-xl text-gray-500 font-normal mb-10 animate-in" id="heroSub">Giải pháp sức khỏe mắt cao cấp chuyên về vi tuần hoàn</p>',
  ],
  [
    '눈은 말이 없습니다. 천천히 지쳐가고, 조용히 흐려져도, 아프다고 소리치지 않습니다. 셀로맥스 글라우빌은 그 침묵에 응답하기 위해 만들어졌습니다.',
    'Eyes never speak. They grow weary slowly and blur quietly, yet never cry out in pain. CELLROMAX Glaubil was created to answer that silence.',
    '眼睛从不说话。它们慢慢疲劳、悄悄模糊，却从不喊痛。CELLROMAX Glaubil正是为了回应这份沉默而诞生。',
    'Đôi mắt không bao giờ lên tiếng. Chúng mệt mỏi từ từ, mờ dần trong im lặng, nhưng chẳng bao giờ kêu đau. CELLROMAX Glaubil được tạo ra để đáp lại sự im lặng đó.',
  ],
  [
    '이탈리아, 스위스, 이란. 세 대륙의 프리미엄 원료를 하나의 정에 담았습니다.',
    'Italy, Switzerland, Iran. Premium ingredients from three continents, in one tablet.',
    '意大利、瑞士、伊朗。三大洲的顶级原料，浓缩于一粒。',
    'Ý, Thụy Sĩ, Iran. Nguyên liệu cao cấp từ ba châu lục, gói gọn trong một viên.',
  ],
  [
    'alt="셀로맥스 글라우빌 120정 패키지"',
    'alt="CELLROMAX Glaubil 120 Tablets Package"',
    'alt="CELLROMAX Glaubil 120片装"',
    'alt="CELLROMAX Glaubil Gói 120 viên"',
  ],
  [
    '건강기능식품 · 700mg × 120정',
    'Health Functional Food · 700mg × 120 Tablets',
    '保健功能食品 · 700mg × 120片',
    'Thực phẩm chức năng · 700mg × 120 viên',
  ],

  // ===== SECTION 2: STATEMENT =====
  [
    '눈에 영양을 채우는 시대에서,',
    'From the era of nourishing eyes,',
    '从补充眼部营养的时代，',
    'Từ thời đại bổ sung dinh dưỡng cho mắt,',
  ],
  [
    '<span class="gold-gradient">흐름을 관리하는 시대</span>로.',
    'to the era of <span class="gold-gradient">managing flow</span>.',
    '迈向<span class="gold-gradient">管理循环的时代</span>。',
    'đến thời đại <span class="gold-gradient">quản lý tuần hoàn</span>.',
  ],
  [
    '우리 눈에는 머리카락보다 가는 혈관들이 촘촘하게 얽혀 있습니다. 이 미세한 통로가 산소와 영양을 전달하고, 노폐물을 거둬갑니다. 이 흐름이 느려지면, 눈은 서서히 기능을 잃어갑니다.',
    'Our eyes contain an intricate network of blood vessels thinner than hair. These microscopic pathways deliver oxygen and nutrients while removing waste. When this flow slows down, the eyes gradually lose function.',
    '我们的眼睛中布满了比头发还细的微血管网络。这些微小的通道输送氧气和营养，同时清除废物。当这些循环减慢时，眼睛会逐渐失去功能。',
    'Mắt chúng ta chứa một mạng lưới mạch máu mỏng hơn sợi tóc. Những con đường vi mô này vận chuyển oxy và dinh dưỡng, đồng thời loại bỏ chất thải. Khi dòng chảy này chậm lại, mắt dần mất chức năng.',
  ],
  [
    '기존 눈 건강 제품 대부분은 \'무엇을 채울 것인가\'에 집중합니다. 글라우빌은 다른 질문에서 출발했습니다. <span class="text-gray-800 font-medium">\'채운 것이 제대로 도착하고 있는가.\'</span>',
    'Most existing eye health products focus on \'what to supplement.\' Glaubil started from a different question: <span class="text-gray-800 font-medium">\'Is what we supplement actually reaching its destination?\'</span>',
    '大多数现有的眼部健康产品关注的是"补充什么"。Glaubil从一个不同的问题出发：<span class="text-gray-800 font-medium">"补充的东西真的到达了目的地吗？"</span>',
    'Hầu hết các sản phẩm sức khỏe mắt hiện có đều tập trung vào \'bổ sung gì.\' Glaubil bắt đầu từ một câu hỏi khác: <span class="text-gray-800 font-medium">\'Liệu những gì chúng ta bổ sung có thực sự đến đích?\'</span>',
  ],

  // ===== SECTION 3: PROBLEM =====
  [
    '당신의 눈, 지금 안녕하십니까?',
    'How Are Your Eyes Doing Right Now?',
    '您的眼睛，现在还好吗？',
    'Đôi mắt của bạn, hiện tại có khỏe không?',
  ],
  [
    '국내 녹내장 환자 수',
    'Glaucoma Patients in Korea',
    '韩国青光眼患者数',
    'Số bệnh nhân tăng nhãn áp tại Hàn Quốc',
  ],
  [
    '만+',
    '0,000+',
    '万+',
    '.000+',
  ],
  [
    '건강보험심사평가원',
    'HIRA Korea',
    '健康保险审查评价院',
    'HIRA Hàn Quốc',
  ],
  [
    '성인 백내장 유병률',
    'Adult Cataract Prevalence',
    '成人白内障患病率',
    'Tỷ lệ đục thủy tinh thể ở người lớn',
  ],
  [
    '국민건강영양조사',
    'National Health Survey',
    '国民健康营养调查',
    'Khảo sát Sức khỏe Quốc gia',
  ],
  [
    '70대 이상 유병률',
    'Prevalence in 70+',
    '70岁以上患病率',
    'Tỷ lệ mắc ở người trên 70',
  ],
  [
    '한국인의 하루 평균 스크린 노출 시간은 10시간을 넘어섰습니다. 깨어 있는 시간의 대부분을 디스플레이 앞에서 보내는 셈입니다. 블루라이트, 자외선, 건조한 실내 공기. 눈은 하루 종일 쉴 틈 없이 일합니다.',
    'The average daily screen time now exceeds 10 hours. We spend most of our waking hours in front of displays. Blue light, UV rays, dry indoor air — our eyes work non-stop all day long.',
    '人均日均屏幕使用时间已超过10小时。醒着的大部分时间都花在屏幕前。蓝光、紫外线、干燥的室内空气——眼睛整天都在不停地工作。',
    'Thời gian tiếp xúc màn hình trung bình mỗi ngày đã vượt quá 10 giờ. Chúng ta dành phần lớn thời gian thức trước màn hình. Ánh sáng xanh, tia UV, không khí khô trong nhà — đôi mắt làm việc không ngừng cả ngày.',
  ],
  [
    '녹내장은 \'소리 없는 시력 도둑\'이라 불립니다. 초기에 자각 증상이 거의 없고, 시야가 좁아지고 있다는 사실을 뇌가 보정해버리기 때문입니다. 환자의 절반 이상이 이미 시신경 손상이 상당히 진행된 뒤에야 병원을 찾습니다.',
    'Glaucoma is called the \'silent thief of sight.\' In its early stages, there are almost no symptoms, and the brain compensates for the narrowing visual field. More than half of patients seek medical attention only after significant optic nerve damage has already occurred.',
    '青光眼被称为"无声的视力窃贼"。早期几乎没有自觉症状，大脑会自动弥补视野变窄的事实。超过一半的患者在视神经严重受损后才去就医。',
    'Glaucoma được gọi là \'kẻ cắp thị lực thầm lặng.\' Ở giai đoạn đầu, hầu như không có triệu chứng, và não bộ tự bù đắp cho thị trường bị thu hẹp. Hơn một nửa bệnh nhân chỉ đến bệnh viện sau khi dây thần kinh thị giác đã bị tổn thương nghiêm trọng.',
  ],
  [
    '잃어버린 시신경은 현재 의학으로 되돌릴 수 없습니다. 그래서 관리의 시작은 빠를수록 의미가 있습니다.',
    'Lost optic nerves cannot be restored with current medicine. That is why the earlier you start managing, the more meaningful it becomes.',
    '失去的视神经目前医学无法恢复。因此，管理开始得越早越有意义。',
    'Dây thần kinh thị giác đã mất không thể phục hồi bằng y học hiện tại. Vì vậy, bắt đầu quản lý càng sớm càng có ý nghĩa.',
  ],

  // ===== SECTION 4: SOLUTION =====
  [
    '영양이 아닌, <span class="gold-gradient">흐름</span>에 집중한 새로운 설계',
    'A New Design Focused on <span class="gold-gradient">Flow</span>, Not Just Nutrition',
    '不是营养，而是专注于<span class="gold-gradient">循环</span>的全新设计',
    'Thiết kế mới tập trung vào <span class="gold-gradient">dòng chảy</span>, không chỉ dinh dưỡng',
  ],
  [
    '셀로맥스 글라우빌은 안구 미세순환에 집중합니다',
    'CELLROMAX Glaubil focuses on ocular microcirculation',
    'CELLROMAX Glaubil专注于眼部微循环',
    'CELLROMAX Glaubil tập trung vào vi tuần hoàn mắt',
  ],
  [
    '비유하자면, 기존 눈 건강 보충제는 \'좋은 비료를 준비하는 것\'에 해당합니다. 하지만 밭으로 가는 수로가 막혀 있다면, 비료는 도착하지 못합니다. 글라우빌은 수로 자체를 관리하는 데 집중합니다.',
    'By analogy, conventional eye health supplements are like \'preparing good fertilizer.\' But if the irrigation channels to the field are blocked, the fertilizer never arrives. Glaubil focuses on managing the channels themselves.',
    '打个比方，传统的眼部保健品相当于"准备好的肥料"。但如果通往田地的水渠被堵塞，肥料就无法送达。Glaubil专注于管理水渠本身。',
    'Ví von thì các sản phẩm bổ sung sức khỏe mắt truyền thống giống như \'chuẩn bị phân bón tốt.\' Nhưng nếu kênh dẫn nước đến ruộng bị tắc, phân bón sẽ không đến nơi. Glaubil tập trung vào việc quản lý chính các kênh dẫn.',
  ],
  [
    '빌베리가 혈류의 길을 넓히고, 피크노제놀이 혈관벽을 이완시키며, 사프란이 배출 통로의 세포를 보호합니다. 하나의 원료가 아닌, 세 원료의 역할 분담. 이것이 글라우빌의 설계 의도입니다.',
    'Bilberry widens blood flow pathways, Pycnogenol relaxes vessel walls, and Saffron protects drainage channel cells. Not one ingredient, but three with distinct roles — this is the design philosophy of Glaubil.',
    '越橘拓宽血流通道，碧萝芷舒张血管壁，藏红花保护排液通道细胞。不是单一原料，而是三种原料的分工协作——这就是Glaubil的设计理念。',
    'Bilberry mở rộng đường máu lưu thông, Pycnogenol thư giãn thành mạch, và Saffron bảo vệ tế bào kênh thoát dịch. Không phải một, mà ba nguyên liệu với vai trò riêng biệt — đó là triết lý thiết kế của Glaubil.',
  ],
  [
    '안구 미세순환 개선',
    'Ocular Microcirculation',
    '眼部微循环改善',
    'Cải thiện vi tuần hoàn mắt',
  ],
  [
    '눈에 산소와 영양을 공급하는 미세 혈류의 흐름을 원활하게 도와줍니다',
    'Supports smooth flow of microcirculation that delivers oxygen and nutrients to the eyes',
    '帮助促进向眼睛输送氧气和营养的微血流循环',
    'Hỗ trợ lưu thông vi tuần hoàn giúp cung cấp oxy và dinh dưỡng cho mắt',
  ],
  [
    '시신경 보호',
    'Optic Nerve Protection',
    '视神经保护',
    'Bảo vệ dây thần kinh thị giác',
  ],
  [
    '산화 스트레스로부터 민감한 시신경 세포를 보호하는 데 도움을 줄 수 있습니다',
    'May help protect sensitive optic nerve cells from oxidative stress',
    '有助于保护敏感的视神经细胞免受氧化应激',
    'Có thể giúp bảo vệ tế bào thần kinh thị giác nhạy cảm khỏi stress oxy hóa',
  ],
  [
    '방수 배출 정상화',
    'Aqueous Humor Drainage',
    '房水排出正常化',
    'Bình thường hóa thoát dịch thủy',
  ],
  [
    '안구 내 방수(房水)의 자연스러운 배출을 돕는 섬유주 세포 건강에 기여합니다',
    'Contributes to trabecular cell health that supports natural drainage of aqueous humor',
    '有助于纤维柱细胞健康，支持房水的自然排出',
    'Đóng góp cho sức khỏe tế bào lưới sợi giúp hỗ trợ thoát dịch thủy tự nhiên',
  ],

  // ===== SECTION: SHOWCASE =====
  [
    '하나의 정에 담긴 <span class="gold-gradient">6가지 설계</span>',
    '<span class="gold-gradient">6 Components</span> in One Tablet',
    '一粒中的<span class="gold-gradient">6种设计</span>',
    '<span class="gold-gradient">6 thành phần</span> trong một viên',
  ],
  [
    '서양 임상과학의 프리미엄 원료 3종과 동양 전통 본초 3종이<br class="hidden md:block"> 하나의 정 안에서 만납니다.',
    '3 premium ingredients from Western clinical science and 3 traditional Eastern herbs<br class="hidden md:block"> meet in a single tablet.',
    '西方临床科学的3种顶级原料与东方传统草药3种<br class="hidden md:block">在一粒中相遇。',
    '3 nguyên liệu cao cấp từ khoa học lâm sàng phương Tây và 3 thảo dược truyền thống phương Đông<br class="hidden md:block"> hội tụ trong một viên.',
  ],
  [
    '빌베리 추출물',
    'Bilberry Extract',
    '越橘提取物',
    'Chiết xuất Việt quất',
  ],
  [
    '안토시아노사이드 36% 표준화',
    'Anthocyanoside 36% standardized',
    '花青素苷36%标准化',
    'Anthocyanoside 36% tiêu chuẩn hóa',
  ],
  [
    '피크노제놀',
    'Pycnogenol',
    '碧萝芷',
    'Pycnogenol',
  ],
  [
    '프로시아니딘 85% 농축',
    'Procyanidin 85% concentrated',
    '原花青素85%浓缩',
    'Procyanidin nồng độ 85%',
  ],
  [
    '사프란 추출물',
    'Saffron Extract',
    '藏红花提取物',
    'Chiết xuất nghệ tây',
  ],
  [
    '크로세틴 · 크로신 표준화',
    'Crocetin · Crocin standardized',
    '藏红花酸·藏红花素标准化',
    'Crocetin · Crocin tiêu chuẩn hóa',
  ],
  [
    'alt="셀로맥스 글라우빌 정제"',
    'alt="CELLROMAX Glaubil Tablets"',
    'alt="CELLROMAX Glaubil 片剂"',
    'alt="CELLROMAX Glaubil Viên nén"',
  ],
  [
    '6가지 원료 · 1정',
    '6 Ingredients · 1 Tablet',
    '6种原料 · 1粒',
    '6 thành phần · 1 viên',
  ],
  // Traditional herbs
  [
    '감국 <span class="text-xs font-normal text-gray-400">(甘菊)</span>',
    'Sweet Chrysanthemum <span class="text-xs font-normal text-gray-400">(甘菊)</span>',
    '甘菊 <span class="text-xs font-normal text-gray-400">(Sweet Chrysanthemum)</span>',
    'Cúc ngọt <span class="text-xs font-normal text-gray-400">(甘菊)</span>',
  ],
  [
    '>충혈 · 피로 완화</p>\n          <p class="text-xs text-gray-400 mt-0.5">본초강목 수록',
    '>Relieves congestion & fatigue</p>\n          <p class="text-xs text-gray-400 mt-0.5">Recorded in Bencao Gangmu',
    '>缓解充血·疲劳</p>\n          <p class="text-xs text-gray-400 mt-0.5">收录于本草纲目',
    '>Giảm xung huyết · mệt mỏi</p>\n          <p class="text-xs text-gray-400 mt-0.5">Ghi nhận trong Bản Thảo Cương Mục',
  ],
  [
    '석결명 <span class="text-xs font-normal text-gray-400">(石決明)</span>',
    'Abalone Shell <span class="text-xs font-normal text-gray-400">(石決明)</span>',
    '石决明 <span class="text-xs font-normal text-gray-400">(Abalone Shell)</span>',
    'Thạch quyết minh <span class="text-xs font-normal text-gray-400">(石決明)</span>',
  ],
  [
    '>간열 해소 · 시력 보호</p>\n          <p class="text-xs text-gray-400 mt-0.5">동의보감 수록',
    '>Clears liver heat · Protects vision</p>\n          <p class="text-xs text-gray-400 mt-0.5">Recorded in Donguibogam',
    '>清肝热·保护视力</p>\n          <p class="text-xs text-gray-400 mt-0.5">收录于东医宝鉴',
    '>Thanh nhiệt gan · Bảo vệ thị lực</p>\n          <p class="text-xs text-gray-400 mt-0.5">Ghi nhận trong Đông Y Bảo Giám',
  ],
  [
    '결명자 <span class="text-xs font-normal text-gray-400">(決明子)</span>',
    'Cassia Seed <span class="text-xs font-normal text-gray-400">(決明子)</span>',
    '决明子 <span class="text-xs font-normal text-gray-400">(Cassia Seed)</span>',
    'Thảo quyết minh <span class="text-xs font-normal text-gray-400">(決明子)</span>',
  ],
  [
    '>건조 · 열감 완화</p>\n          <p class="text-xs text-gray-400 mt-0.5">본초강목 수록',
    '>Relieves dryness & heat</p>\n          <p class="text-xs text-gray-400 mt-0.5">Recorded in Bencao Gangmu',
    '>缓解干燥·热感</p>\n          <p class="text-xs text-gray-400 mt-0.5">收录于本草纲目',
    '>Giảm khô · nóng rát</p>\n          <p class="text-xs text-gray-400 mt-0.5">Ghi nhận trong Bản Thảo Cương Mục',
  ],
  [
    '임상 검증 원료 3종',
    '3 Clinically Proven Ingredients',
    '3种临床验证原料',
    '3 nguyên liệu đã được kiểm chứng lâm sàng',
  ],
  [
    '전통 본초 3종',
    '3 Traditional Herbs',
    '3种传统草药',
    '3 thảo dược truyền thống',
  ],

  // ===== SECTION 5: BILBERRY =====
  [
    '>빌베리 추출물</h2>',
    '>Bilberry Extract</h2>',
    '>越橘提取物</h2>',
    '>Chiết xuất Việt quất</h2>',
  ],
  [
    '>안토시아노사이드 36% 표준화 프리미엄 빌베리</p>',
    '>Premium bilberry standardized to 36% anthocyanosides</p>',
    '>花青素苷36%标准化优质越橘</p>',
    '>Việt quất cao cấp tiêu chuẩn hóa 36% anthocyanoside</p>',
  ],
  [
    'alt="빌베리"',
    'alt="Bilberry"',
    'alt="越橘"',
    'alt="Việt quất"',
  ],
  [
    '이탈리아 북부, 해발 1,000m 이상의 산간 지대. 그곳에서 야생 빌베리는 강렬한 자외선과 혹한을 견디며 자랍니다. 재배가 아닌 야생 채집. 스스로를 지키기 위해 축적한 안토시아닌의 농도가 일반 재배 블루베리와는 차원이 다릅니다.',
    'In the mountain regions of Northern Italy, above 1,000m altitude, wild bilberries grow enduring intense UV and bitter cold. Not cultivated but wild-harvested — the anthocyanin concentration they accumulate for self-protection is incomparable to ordinary cultivated blueberries.',
    '意大利北部海拔1000米以上的山区，野生越橘在强烈的紫外线和严寒中生长。不是人工栽培，而是野生采集——它们为自我保护而积累的花青素浓度远超普通栽培蓝莓。',
    'Ở vùng núi Bắc Ý, trên 1.000m so với mực nước biển, việt quất hoang dã phát triển chịu đựng tia UV khắc nghiệt và giá lạnh. Không phải trồng trọt mà thu hái hoang dã — nồng độ anthocyanin tích lũy để tự bảo vệ vượt xa việt quất trồng thông thường.',
  ],
  [
    'Mirtoselect는 이탈리아 Indena사가 50년 이상 연구해온 빌베리 추출물의 세계 표준입니다. 안토시아노사이드 함량을 36%로 표준화했다는 것은, 한 정(錠)마다 동일한 효능을 보장한다는 뜻입니다.',
    'Mirtoselect is the world standard for bilberry extract, researched by Italy\'s Indena for over 50 years. Standardizing anthocyanoside content to 36% means every tablet guarantees the same efficacy.',
    'Mirtoselect是意大利Indena公司研究50多年的越橘提取物世界标准。将花青素苷含量标准化为36%，意味着每片都保证相同的功效。',
    'Mirtoselect là tiêu chuẩn thế giới về chiết xuất việt quất, được Indena của Ý nghiên cứu hơn 50 năm. Tiêu chuẩn hóa hàm lượng anthocyanoside ở mức 36% nghĩa là mỗi viên đều đảm bảo hiệu quả như nhau.',
  ],
  [
    '빌베리 안토시아닌이 주목받는 결정적 이유가 있습니다. <span class="text-gray-800 font-medium">혈액-망막 장벽(BRB)을 통과할 수 있다는 것입니다.</span> 이 장벽은 눈을 외부 물질로부터 보호하는 관문인데, 대부분의 영양소는 이 문을 통과하지 못합니다.',
    'There is a crucial reason bilberry anthocyanins attract attention: <span class="text-gray-800 font-medium">they can cross the blood-retinal barrier (BRB).</span> This barrier protects the eyes from foreign substances, and most nutrients cannot pass through it.',
    '越橘花青素受到关注有一个关键原因：<span class="text-gray-800 font-medium">它能穿过血-视网膜屏障（BRB）。</span>这个屏障保护眼睛免受外来物质侵害，大多数营养素都无法通过。',
    'Có một lý do quan trọng khiến anthocyanin việt quất được chú ý: <span class="text-gray-800 font-medium">chúng có thể vượt qua hàng rào máu-võng mạc (BRB).</span> Hàng rào này bảo vệ mắt khỏi các chất lạ, và hầu hết các chất dinh dưỡng không thể đi qua.',
  ],
  // Bilberry mechanism cards
  [
    '강력한 항산화',
    'Powerful Antioxidant',
    '强效抗氧化',
    'Chống oxy hóa mạnh mẽ',
  ],
  [
    '안토시아노사이드가 안구 내 산화 스트레스를 줄여줍니다',
    'Anthocyanosides help reduce oxidative stress in the eye',
    '花青素苷帮助减少眼内氧化应激',
    'Anthocyanoside giúp giảm stress oxy hóa trong mắt',
  ],
  [
    '시홍소 재생 촉진',
    'Rhodopsin Regeneration',
    '视紫红质再生促进',
    'Thúc đẩy tái tạo Rhodopsin',
  ],
  [
    '빛을 감지하는 시각 색소의 재합성을 도와줍니다',
    'Helps re-synthesize visual pigments that detect light',
    '帮助重新合成感知光线的视觉色素',
    'Giúp tái tổng hợp sắc tố thị giác nhận diện ánh sáng',
  ],
  [
    '혈액-망막 장벽 통과',
    'Crosses Blood-Retinal Barrier',
    '穿过血-视网膜屏障',
    'Vượt qua hàng rào máu-võng mạc',
  ],
  [
    '유효 성분이 눈 조직에 직접 도달할 수 있습니다',
    'Active compounds can reach eye tissue directly',
    '有效成分能够直接到达眼部组织',
    'Hoạt chất có thể đến trực tiếp mô mắt',
  ],
  [
    '>안구 미세순환 개선</h5><p class="text-sm text-gray-500">눈 속 미세혈관의 혈류 흐름을 개선하는 데 도움을 줍니다',
    '>Ocular Microcirculation</h5><p class="text-sm text-gray-500">Helps improve blood flow in the eye\'s microvessels',
    '>眼部微循环改善</h5><p class="text-sm text-gray-500">帮助改善眼内微血管的血流',
    '>Cải thiện vi tuần hoàn mắt</h5><p class="text-sm text-gray-500">Giúp cải thiện lưu thông máu trong vi mạch mắt',
  ],
  // Bilberry clinical
  [
    '인체적용연구 결과',
    'Clinical Study Results',
    '人体应用研究结果',
    'Kết quả nghiên cứu lâm sàng',
  ],
  [
    '정상안압 녹내장(NTG) 환자 38명, 6개월, 3개월 시점 p&lt;0.05',
    '38 NTG patients, 6 months, p&lt;0.05 at 3 months',
    '正常眼压性青光眼(NTG)患者38名，6个月，3个月时p&lt;0.05',
    '38 bệnh nhân NTG, 6 tháng, p&lt;0.05 tại thời điểm 3 tháng',
  ],

  // ===== SECTION 6: PYCNOGENOL =====
  [
    '>피크노제놀</h2>',
    '>Pycnogenol</h2>',
    '>碧萝芷</h2>',
    '>Pycnogenol</h2>',
  ],
  [
    '>프로시아니딘 85%, 혈관 건강 분야의 세계적 원료</p>',
    '>Procyanidin 85%, a world-leading ingredient for vascular health</p>',
    '>原花青素85%，血管健康领域的世界级原料</p>',
    '>Procyanidin 85%, nguyên liệu hàng đầu thế giới cho sức khỏe mạch máu</p>',
  ],
  [
    'alt="소나무 껍질"',
    'alt="Pine Bark"',
    'alt="松树皮"',
    'alt="Vỏ thông"',
  ],
  [
    '프랑스 남서부, 대서양을 마주한 랑드 숲. 강한 해풍과 염분, 자외선을 견디며 수십 년을 버텨온 해안송이 자랍니다. Pycnogenol은 이 나무의 껍질에서 추출한 프로시아니딘을 85%까지 농축한 스위스 Horphag Research의 특허 원료입니다.',
    'In southwestern France, the Landes forest faces the Atlantic. Maritime pines grow here, enduring strong sea winds, salt, and UV for decades. Pycnogenol is a patented ingredient by Swiss Horphag Research, concentrating procyanidins from this bark to 85%.',
    '法国西南部，面朝大西洋的朗德森林。海岸松在这里生长，承受着数十年的海风、盐分和紫外线。Pycnogenol是瑞士Horphag Research的专利原料，将树皮中的原花青素浓缩至85%。',
    'Tây nam nước Pháp, rừng Landes đối diện Đại Tây Dương. Thông biển mọc ở đây, chịu đựng gió biển mạnh, muối và tia UV suốt hàng chục năm. Pycnogenol là nguyên liệu được cấp bằng sáng chế của Horphag Research Thụy Sĩ, cô đặc procyanidin từ vỏ thông lên 85%.',
  ],
  [
    '전 세계 400건 이상의 연구논문, 160건 이상의 임상시험. Pycnogenol은 단일 식물 추출물로서 세계에서 가장 많이 연구된 원료 중 하나입니다.',
    'Over 400 research papers and 160+ clinical trials worldwide. Pycnogenol is one of the most researched single plant extracts in the world.',
    '全球400多篇研究论文，160多项临床试验。Pycnogenol是世界上研究最多的单一植物提取物之一。',
    'Hơn 400 bài nghiên cứu và 160+ thử nghiệm lâm sàng trên toàn thế giới. Pycnogenol là một trong những chiết xuất thực vật đơn lẻ được nghiên cứu nhiều nhất thế giới.',
  ],
  [
    '피크노제놀의 핵심 기전은 <span class="text-gray-800 font-medium">eNOS(혈관내피 산화질소 합성효소)의 활성화</span>입니다. NO가 분비되면 혈관 근육이 이완되고, 좁아진 혈관이 넓어집니다.',
    'The core mechanism of Pycnogenol is <span class="text-gray-800 font-medium">activation of eNOS (endothelial nitric oxide synthase)</span>. When NO is released, vascular muscles relax and narrowed vessels widen.',
    '碧萝芷的核心机制是<span class="text-gray-800 font-medium">激活eNOS（血管内皮一氧化氮合酶）</span>。当NO释放时，血管肌肉松弛，狭窄的血管扩张。',
    'Cơ chế cốt lõi của Pycnogenol là <span class="text-gray-800 font-medium">kích hoạt eNOS (enzyme tổng hợp nitric oxide nội mô)</span>. Khi NO được giải phóng, cơ mạch máu giãn ra và mạch hẹp mở rộng.',
  ],
  // Pycnogenol mechanism cards
  [
    '혈관 확장 (eNOS→NO)',
    'Vasodilation (eNOS→NO)',
    '血管扩张 (eNOS→NO)',
    'Giãn mạch (eNOS→NO)',
  ],
  [
    '산화질소 생성을 촉진하여 혈관을 자연스럽게 이완시킵니다',
    'Promotes nitric oxide production to naturally relax blood vessels',
    '促进一氧化氮生成，自然舒张血管',
    'Thúc đẩy sản xuất nitric oxide để giãn mạch máu tự nhiên',
  ],
  [
    '>항산화</h5><p class="text-sm text-gray-500">프로시아니딘이 눈 조직의 산화적 손상을 줄여줍니다',
    '>Antioxidant</h5><p class="text-sm text-gray-500">Procyanidins help reduce oxidative damage to eye tissue',
    '>抗氧化</h5><p class="text-sm text-gray-500">原花青素帮助减少眼部组织的氧化损伤',
    '>Chống oxy hóa</h5><p class="text-sm text-gray-500">Procyanidin giúp giảm tổn thương oxy hóa ở mô mắt',
  ],
  [
    '혈소판 응집 억제',
    'Platelet Aggregation Inhibition',
    '抑制血小板聚集',
    'Ức chế kết tập tiểu cầu',
  ],
  [
    '미세혈관 내 원활한 혈류 유지를 도와줍니다',
    'Helps maintain smooth blood flow in microvessels',
    '帮助维持微血管内的顺畅血流',
    'Giúp duy trì lưu thông máu trơn tru trong vi mạch',
  ],
  [
    '망막 모세혈관 보호',
    'Retinal Capillary Protection',
    '视网膜毛细血管保护',
    'Bảo vệ mao mạch võng mạc',
  ],
  [
    '눈 가장 깊은 곳의 모세혈관 건강을 지켜줍니다',
    'Protects capillary health in the deepest part of the eye',
    '守护眼睛最深处的毛细血管健康',
    'Bảo vệ sức khỏe mao mạch ở phần sâu nhất của mắt',
  ],
  // Pycnogenol clinical
  [
    '3그룹 비교 임상 결과',
    '3-Group Comparative Clinical Results',
    '3组对比临床结果',
    'Kết quả lâm sàng so sánh 3 nhóm',
  ],
  [
    'Mirtogenol (빌베리+피크노제놀)',
    'Mirtogenol (Bilberry+Pycnogenol)',
    'Mirtogenol（越橘+碧萝芷）',
    'Mirtogenol (Việt quất+Pycnogenol)',
  ],
  [
    'Latanoprost (약물단독)',
    'Latanoprost (Drug Only)',
    'Latanoprost（单独药物）',
    'Latanoprost (Chỉ dùng thuốc)',
  ],
  [
    '병용 (Mirtogenol+약물)',
    'Combined (Mirtogenol+Drug)',
    '联合（Mirtogenol+药物）',
    'Kết hợp (Mirtogenol+Thuốc)',
  ],
  [
    '안압 감소',
    'IOP Reduction',
    '眼压降低',
    'Giảm nhãn áp',
  ],
  [
    '빌베리 + 피크노제놀 = Mirtogenol® 시너지',
    'Bilberry + Pycnogenol = Mirtogenol® Synergy',
    '越橘 + 碧萝芷 = Mirtogenol® 协同效应',
    'Việt quất + Pycnogenol = Mirtogenol® Hiệp đồng',
  ],
  [
    '39.5% 감소 — 눈이 받는 압력 부담이 그만큼 줄었다는 의미입니다.',
    '39.5% reduction — meaning the pressure burden on the eyes was reduced by that much.',
    '降低39.5%——这意味着眼睛承受的压力负担减少了这么多。',
    'Giảm 39.5% — nghĩa là gánh nặng áp lực lên mắt đã giảm bấy nhiêu.',
  ],

  // ===== SECTION 7: SAFFRON =====
  [
    '>사프란 추출물</h2>',
    '>Saffron Extract</h2>',
    '>藏红花提取物</h2>',
    '>Chiết xuất nghệ tây</h2>',
  ],
  [
    '>크로세틴 · 크로신 표준화, 세계에서 가장 귀한 향신료의 눈 건강 활성 성분</p>',
    '>Crocetin · Crocin standardized — eye health actives from the world\'s most precious spice</p>',
    '>藏红花酸·藏红花素标准化，世界上最珍贵香料的护眼活性成分</p>',
    '>Crocetin · Crocin tiêu chuẩn hóa — hoạt chất sức khỏe mắt từ gia vị quý nhất thế giới</p>',
  ],
  [
    'alt="사프란"',
    'alt="Saffron"',
    'alt="藏红花"',
    'alt="Nghệ tây"',
  ],
  [
    '1g의 사프란을 얻기 위해 약 150송이의 크로커스 꽃에서, 한 송이당 세 가닥의 암술을 손으로 채취해야 합니다. 새벽, 꽃이 열리기 전에 수확해야 향과 성분이 보존됩니다. 세계에서 가장 비싼 향신료. 그 안에 눈 건강의 열쇠가 있습니다.',
    'To obtain 1g of saffron, three stigmas must be hand-picked from each of about 150 crocus flowers. Harvested at dawn before the flowers open to preserve aroma and compounds. The world\'s most expensive spice — and within it lies the key to eye health.',
    '要获得1克藏红花，需要从约150朵番红花中手工采集每朵花的三根柱头。必须在黎明花朵开放前采收，以保持香气和成分。世界上最昂贵的香料——其中蕴藏着护眼的关键。',
    'Để có 1g nghệ tây, cần hái bằng tay ba nhụy hoa từ khoảng 150 bông crocus. Thu hoạch lúc bình minh trước khi hoa nở để bảo toàn hương thơm và hoạt chất. Gia vị đắt nhất thế giới — và bên trong ẩn chứa chìa khóa cho sức khỏe mắt.',
  ],
  [
    '사프란의 활성 성분인 크로세틴과 크로신이 안과 연구자들의 주목을 받기 시작한 것은 비교적 최근입니다. 특히 <span class="text-gray-800 font-medium">크로세틴은 분자 크기가 작아 혈액-망막 장벽을 통과할 수 있습니다.</span>',
    'Saffron\'s active compounds, crocetin and crocin, have only recently drawn attention from ophthalmology researchers. Notably, <span class="text-gray-800 font-medium">crocetin\'s small molecular size allows it to cross the blood-retinal barrier.</span>',
    '藏红花的活性成分——藏红花酸和藏红花素——引起眼科研究者关注是比较近期的事。特别是，<span class="text-gray-800 font-medium">藏红花酸由于分子体积小，能够穿过血-视网膜屏障。</span>',
    'Hoạt chất của nghệ tây, crocetin và crocin, chỉ gần đây mới thu hút sự chú ý của các nhà nghiên cứu nhãn khoa. Đặc biệt, <span class="text-gray-800 font-medium">kích thước phân tử nhỏ của crocetin cho phép nó vượt qua hàng rào máu-võng mạc.</span>',
  ],
  [
    '사프란이 보호하는 핵심 구조는 섬유주(Trabecular Meshwork)입니다. 이 배수구의 세포가 손상되거나 막히면, 눈 안에 체액이 고이고 안압이 올라갑니다.',
    'The key structure saffron protects is the Trabecular Meshwork. When this drainage system\'s cells are damaged or blocked, fluid accumulates in the eye and intraocular pressure rises.',
    '藏红花保护的核心结构是小梁网（Trabecular Meshwork）。当这个排水结构的细胞受损或堵塞时，眼内液体积聚，眼压升高。',
    'Cấu trúc quan trọng mà nghệ tây bảo vệ là Lưới sợi (Trabecular Meshwork). Khi tế bào hệ thống thoát dịch này bị tổn thương hoặc tắc nghẽn, dịch tích tụ trong mắt và nhãn áp tăng.',
  ],
  // Saffron mechanism cards
  [
    '>항산화</h5>\n      <p class="text-sm text-gray-500">크로신 · 크로세틴이 눈 조직의 산화적 스트레스를 완화합니다',
    '>Antioxidant</h5>\n      <p class="text-sm text-gray-500">Crocin and crocetin alleviate oxidative stress in eye tissue',
    '>抗氧化</h5>\n      <p class="text-sm text-gray-500">藏红花素·藏红花酸缓解眼部组织的氧化应激',
    '>Chống oxy hóa</h5>\n      <p class="text-sm text-gray-500">Crocin và crocetin giảm stress oxy hóa ở mô mắt',
  ],
  [
    '>시신경 보호</h5>\n      <p class="text-sm text-gray-500">민감한 시신경 세포를 손상으로부터 보호합니다',
    '>Optic Nerve Protection</h5>\n      <p class="text-sm text-gray-500">Protects sensitive optic nerve cells from damage',
    '>视神经保护</h5>\n      <p class="text-sm text-gray-500">保护敏感的视神经细胞免受损伤',
    '>Bảo vệ thần kinh thị giác</h5>\n      <p class="text-sm text-gray-500">Bảo vệ tế bào thần kinh thị giác nhạy cảm khỏi tổn thương',
  ],
  [
    '섬유주 세포 보호',
    'Trabecular Cell Protection',
    '纤维柱细胞保护',
    'Bảo vệ tế bào lưới sợi',
  ],
  [
    '방수 배출 통로의 세포를 보호합니다',
    'Protects cells in the aqueous humor drainage pathway',
    '保护房水排出通道的细胞',
    'Bảo vệ tế bào trong đường thoát dịch thủy',
  ],
  // Saffron clinical
  [
    '이중맹검 무작위 대조시험 결과',
    'Double-Blind Randomized Controlled Trial Results',
    '双盲随机对照试验结果',
    'Kết quả thử nghiệm ngẫu nhiên có đối chứng mù đôi',
  ],
  [
    '사프란 섭취군',
    'Saffron Group',
    '藏红花摄入组',
    'Nhóm dùng nghệ tây',
  ],
  [
    '대조군',
    'Control Group',
    '对照组',
    'Nhóm đối chứng',
  ],
  [
    '통계적으로 유의미한 차이',
    'Statistically significant difference',
    '统计学上有显著差异',
    'Sự khác biệt có ý nghĩa thống kê',
  ],
  [
    'p값 0.001은 이 차이가 우연일 확률이 1,000분의 1에 불과하다는 뜻입니다. 불과 4주 만에 확인된 결과입니다.',
    'A p-value of 0.001 means the probability of this difference being due to chance is only 1 in 1,000. Results confirmed in just 4 weeks.',
    'p值0.001意味着这种差异出于偶然的概率仅为千分之一。仅4周即确认的结果。',
    'Giá trị p=0.001 nghĩa là xác suất sự khác biệt này là do ngẫu nhiên chỉ 1/1.000. Kết quả được xác nhận chỉ trong 4 tuần.',
  ],

  // ===== SECTION 8: SUPPORTING INGREDIENTS =====
  [
    '전통 본초의 지혜를 더하다',
    'Adding the Wisdom of Traditional Herbs',
    '融入传统草药的智慧',
    'Thêm trí tuệ từ thảo dược truyền thống',
  ],
  [
    '한의학에서는 눈을 간(肝)의 창(窓)이라 봅니다. 간의 기운이 눈으로 통한다는 오래된 지혜입니다.',
    'In traditional Korean medicine, the eyes are considered the window of the liver. An ancient wisdom that the liver\'s energy flows to the eyes.',
    '在韩医学中，眼睛被视为肝脏之窗。肝气通于目，这是古老的智慧。',
    'Trong y học cổ truyền Hàn Quốc, mắt được coi là cửa sổ của gan. Trí tuệ cổ xưa cho rằng khí của gan thông đến mắt.',
  ],
  // Supporting herbs - dark section
  [
    '>감국</h4>\n        <p class="text-sm text-gray-500 mb-1">(甘菊)</p>\n        <p class="text-sm text-brand-400 font-medium mb-3">충혈 · 피로 완화</p>\n        <p class="text-sm text-gray-400 leading-relaxed">본초강목에 기록된 국화꽃. 간열을 식히고 눈을 맑게 하며, 눈의 열감과 충혈을 다스립니다.',
    '>Sweet Chrysanthemum</h4>\n        <p class="text-sm text-gray-500 mb-1">(甘菊)</p>\n        <p class="text-sm text-brand-400 font-medium mb-3">Relieves Congestion & Fatigue</p>\n        <p class="text-sm text-gray-400 leading-relaxed">Chrysanthemum recorded in Bencao Gangmu. Cools liver heat, clears the eyes, and soothes eye redness and heat.',
    '>甘菊</h4>\n        <p class="text-sm text-gray-500 mb-1">(Sweet Chrysanthemum)</p>\n        <p class="text-sm text-brand-400 font-medium mb-3">缓解充血·疲劳</p>\n        <p class="text-sm text-gray-400 leading-relaxed">本草纲目记载的菊花。清肝热，明目，缓解眼睛热感和充血。',
    '>Cúc ngọt</h4>\n        <p class="text-sm text-gray-500 mb-1">(甘菊)</p>\n        <p class="text-sm text-brand-400 font-medium mb-3">Giảm xung huyết · mệt mỏi</p>\n        <p class="text-sm text-gray-400 leading-relaxed">Hoa cúc được ghi chép trong Bản Thảo Cương Mục. Thanh nhiệt gan, sáng mắt, làm dịu nóng rát và xung huyết mắt.',
  ],
  [
    '>석결명</h4>\n        <p class="text-sm text-gray-500 mb-1">(石決明)</p>\n        <p class="text-sm text-brand-400 font-medium mb-3">간열 해소 · 시력 보호</p>\n        <p class="text-sm text-gray-400 leading-relaxed">동의보감에 수록된 전복 껍질. 간을 진정시켜 눈의 충혈과 압박을 다스리는 데 사용되어 왔습니다.',
    '>Abalone Shell</h4>\n        <p class="text-sm text-gray-500 mb-1">(石決明)</p>\n        <p class="text-sm text-brand-400 font-medium mb-3">Clears Liver Heat · Protects Vision</p>\n        <p class="text-sm text-gray-400 leading-relaxed">Abalone shell recorded in Donguibogam. Used to calm the liver and manage eye congestion and pressure.',
    '>石决明</h4>\n        <p class="text-sm text-gray-500 mb-1">(Abalone Shell)</p>\n        <p class="text-sm text-brand-400 font-medium mb-3">清肝热·保护视力</p>\n        <p class="text-sm text-gray-400 leading-relaxed">东医宝鉴收录的鲍鱼壳。用于镇肝，缓解眼睛充血和压迫。',
    '>Thạch quyết minh</h4>\n        <p class="text-sm text-gray-500 mb-1">(石決明)</p>\n        <p class="text-sm text-brand-400 font-medium mb-3">Thanh nhiệt gan · Bảo vệ thị lực</p>\n        <p class="text-sm text-gray-400 leading-relaxed">Vỏ bào ngư được ghi chép trong Đông Y Bảo Giám. Được sử dụng để làm dịu gan, giảm xung huyết và áp lực mắt.',
  ],
  [
    '>결명자</h4>\n        <p class="text-sm text-gray-500 mb-1">(決明子)</p>\n        <p class="text-sm text-brand-400 font-medium mb-3">건조 · 열감 완화</p>\n        <p class="text-sm text-gray-400 leading-relaxed">본초강목에 기록된 결명자. 눈의 건조함과 열감을 편안하게 다스립니다.',
    '>Cassia Seed</h4>\n        <p class="text-sm text-gray-500 mb-1">(決明子)</p>\n        <p class="text-sm text-brand-400 font-medium mb-3">Relieves Dryness & Heat</p>\n        <p class="text-sm text-gray-400 leading-relaxed">Cassia seed recorded in Bencao Gangmu. Gently soothes eye dryness and heat sensation.',
    '>决明子</h4>\n        <p class="text-sm text-gray-500 mb-1">(Cassia Seed)</p>\n        <p class="text-sm text-brand-400 font-medium mb-3">缓解干燥·热感</p>\n        <p class="text-sm text-gray-400 leading-relaxed">本草纲目记载的决明子。舒缓眼睛干燥和热感。',
    '>Thảo quyết minh</h4>\n        <p class="text-sm text-gray-500 mb-1">(決明子)</p>\n        <p class="text-sm text-brand-400 font-medium mb-3">Giảm khô · nóng rát</p>\n        <p class="text-sm text-gray-400 leading-relaxed">Thảo quyết minh được ghi chép trong Bản Thảo Cương Mục. Nhẹ nhàng làm dịu khô mắt và cảm giác nóng.',
  ],
  [
    '서양 임상과학의 프리미엄 원료 3종 + 동양 전통 본초 3종. 수백 년의 경험과 현대 임상의 근거가 하나의 정 안에서 만납니다.',
    '3 premium ingredients from Western clinical science + 3 traditional Eastern herbs. Centuries of wisdom and modern clinical evidence meet in a single tablet.',
    '西方临床科学的3种顶级原料+东方传统草药3种。数百年的经验与现代临床证据在一粒中汇合。',
    '3 nguyên liệu cao cấp từ khoa học lâm sàng phương Tây + 3 thảo dược truyền thống phương Đông. Trí tuệ hàng thế kỷ và bằng chứng lâm sàng hiện đại hội tụ trong một viên.',
  ],

  // ===== SECTION 9: DIFFERENTIATION =====
  [
    '글라우빌이 다른 이유',
    'Why Glaubil Is Different',
    'Glaubil与众不同的原因',
    'Tại sao Glaubil khác biệt',
  ],
  [
    '시중 대부분의 눈 건강 보충제는 루테인과 지아잔틴 중심입니다. 황반 색소를 보충하는 데는 도움이 되지만, 안압이나 미세순환의 영역까지 도달하지는 못합니다.',
    'Most eye health supplements on the market are centered on lutein and zeaxanthin. While they help replenish macular pigments, they don\'t address intraocular pressure or microcirculation.',
    '市场上大多数眼部保健品以叶黄素和玉米黄质为主。虽然有助于补充黄斑色素，但无法涉及眼压或微循环领域。',
    'Hầu hết các sản phẩm bổ sung sức khỏe mắt trên thị trường tập trung vào lutein và zeaxanthin. Dù giúp bổ sung sắc tố hoàng điểm, chúng không giải quyết được nhãn áp hay vi tuần hoàn.',
  ],
  // Comparison table
  [
    '일반 눈 건강 제품',
    'General Eye Products',
    '一般护眼产品',
    'Sản phẩm mắt thông thường',
  ],
  [
    '셀로맥스 글라우빌',
    'CELLROMAX Glaubil',
    'CELLROMAX Glaubil',
    'CELLROMAX Glaubil',
  ],
  [
    '핵심 타겟',
    'Core Target',
    '核心目标',
    'Mục tiêu cốt lõi',
  ],
  [
    '황반 건강 / 눈 피로',
    'Macular Health / Eye Fatigue',
    '黄斑健康 / 眼疲劳',
    'Sức khỏe hoàng điểm / Mỏi mắt',
  ],
  [
    '원료 수준',
    'Ingredient Level',
    '原料水平',
    'Cấp nguyên liệu',
  ],
  [
    '일반 빌베리 · 루테인',
    'Standard Bilberry · Lutein',
    '普通越橘·叶黄素',
    'Việt quất thường · Lutein',
  ],
  [
    '글로벌 프리미엄 브랜드 원료 3종',
    '3 Global Premium Brand Ingredients',
    '3种全球高端品牌原料',
    '3 nguyên liệu thương hiệu cao cấp toàn cầu',
  ],
  [
    '과학적 근거',
    'Scientific Evidence',
    '科学依据',
    'Bằng chứng khoa học',
  ],
  [
    '일반 영양 기능',
    'General Nutritional Function',
    '一般营养功能',
    'Chức năng dinh dưỡng chung',
  ],
  [
    '인체적용연구 게재 원료',
    'Clinically Published Ingredients',
    '发表人体应用研究的原料',
    'Nguyên liệu có nghiên cứu lâm sàng công bố',
  ],
  [
    '조합 설계',
    'Formula Design',
    '配方设计',
    'Thiết kế công thức',
  ],
  [
    '개별 원료 나열',
    'Individual Ingredients Listed',
    '单独罗列原料',
    'Liệt kê nguyên liệu riêng lẻ',
  ],
  [
    '시너지 설계 (Mirtogenol® 조합)',
    'Synergy Design (Mirtogenol® Combination)',
    '协同设计（Mirtogenol®组合）',
    'Thiết kế hiệp đồng (Kết hợp Mirtogenol®)',
  ],
  [
    '\'근거 기반 뉴트라슈티컬.\' 글라우빌이 지향하는 카테고리입니다. 마케팅 문구가 아닌 임상 데이터로 말하고, 구체적 기전으로 설명하는 제품.',
    '\'Evidence-based nutraceutical.\' This is the category Glaubil aspires to. A product that speaks through clinical data, not marketing copy, and explains through specific mechanisms.',
    '"循证营养保健品"——这是Glaubil所追求的品类。不是用营销语言，而是用临床数据说话，用具体机制来解释的产品。',
    '\'Nutraceutical dựa trên bằng chứng.\' Đây là danh mục Glaubil hướng tới. Sản phẩm nói bằng dữ liệu lâm sàng, không phải ngôn ngữ marketing, và giải thích bằng cơ chế cụ thể.',
  ],

  // ===== SECTION 10: TARGET =====
  [
    '이런 분께 글라우빌을 권합니다',
    'Who We Recommend Glaubil For',
    '我们向这些人推荐Glaubil',
    'Chúng tôi khuyên dùng Glaubil cho ai',
  ],
  [
    '하루 8시간 이상 디스플레이를 보는 분',
    'Those who view displays 8+ hours daily',
    '每天看屏幕超过8小时的人',
    'Những người nhìn màn hình hơn 8 giờ mỗi ngày',
  ],
  [
    '장시간 화면 노출로 눈의 미세혈관에 부담이 쌓이는 분',
    'Those experiencing microvascular strain from prolonged screen exposure',
    '长时间屏幕暴露导致眼部微血管负担积累的人',
    'Những người tích tụ gánh nặng vi mạch mắt do tiếp xúc màn hình lâu',
  ],
  [
    '녹내장 가족력이 있는 분',
    'Those with family history of glaucoma',
    '有青光眼家族史的人',
    'Những người có tiền sử gia đình bị tăng nhãn áp',
  ],
  [
    '가족 중 녹내장 이력이 있어 눈 건강 관리에 신경 쓰시는 분',
    'Those concerned about eye health due to family glaucoma history',
    '因家族有青光眼病史而注重眼部健康管理的人',
    'Những người quan tâm đến sức khỏe mắt vì gia đình có tiền sử tăng nhãn áp',
  ],
  [
    '안압 수치가 신경 쓰이는 분',
    'Those concerned about IOP levels',
    '担心眼压数值的人',
    'Những người lo lắng về chỉ số nhãn áp',
  ],
  [
    '정기 검진에서 안압 관리의 필요성을 느끼시는 분',
    'Those who feel the need for IOP management during regular checkups',
    '在定期检查中感到需要管理眼压的人',
    'Những người cảm thấy cần quản lý nhãn áp trong các lần khám định kỳ',
  ],
  [
    '기존 눈 영양제가 부족했던 분',
    'Those unsatisfied with existing eye supplements',
    '对现有眼部营养品不满足的人',
    'Những người chưa hài lòng với thực phẩm bổ sung mắt hiện có',
  ],
  [
    '루테인만으로는 만족스럽지 않았던 분',
    'Those who found lutein alone insufficient',
    '仅靠叶黄素无法满足需求的人',
    'Những người thấy chỉ lutein thôi là chưa đủ',
  ],
  [
    '글라우빌은 모든 사람을 위한 제품이 아닙니다. 눈 건강에 대해 진지하게 고민하기 시작한 분, 정말 필요한 분에게 제대로 된 선택지가 되고자 합니다.',
    'Glaubil is not a product for everyone. We aim to be the right choice for those who have started seriously thinking about eye health — for those who truly need it.',
    'Glaubil并非面向所有人的产品。我们希望为那些开始认真思考眼部健康、真正需要的人提供正确的选择。',
    'Glaubil không phải sản phẩm cho tất cả mọi người. Chúng tôi mong muốn trở thành lựa chọn đúng đắn cho những ai bắt đầu nghiêm túc nghĩ về sức khỏe mắt — cho những ai thực sự cần.',
  ],
  [
    '눈 건강 관리에서 가장 큰 후회는 \'좀 더 일찍 시작할걸\'이라는 말입니다.',
    'The biggest regret in eye health management is saying \'I wish I had started sooner.\'',
    '眼部健康管理中最大的遗憾就是"要是早点开始就好了"。',
    'Điều hối tiếc lớn nhất trong quản lý sức khỏe mắt là câu nói \'Giá mà tôi bắt đầu sớm hơn.\'',
  ],

  // ===== SECTION 11: CTA =====
  [
    'alt="셀로맥스 글라우빌 60정 패키지"',
    'alt="CELLROMAX Glaubil 60 Tablets Package"',
    'alt="CELLROMAX Glaubil 60片装"',
    'alt="CELLROMAX Glaubil Gói 60 viên"',
  ],
  [
    // CTA hero title
    '<span class="gold-gradient">글라우빌</span></h2>\n    <p class="text-xl text-gray-500 mb-8 animate-in">눈 속 흐름이 바뀌면, 내일의 시야가 달라집니다.</p>',
    '<span class="gold-gradient">Glaubil</span></h2>\n    <p class="text-xl text-gray-500 mb-8 animate-in">When the flow within your eyes changes, tomorrow\'s vision transforms.</p>',
    '<span class="gold-gradient">Glaubil</span></h2>\n    <p class="text-xl text-gray-500 mb-8 animate-in">当眼内循环改变时，明天的视野也将不同。</p>',
    '<span class="gold-gradient">Glaubil</span></h2>\n    <p class="text-xl text-gray-500 mb-8 animate-in">Khi dòng chảy trong mắt thay đổi, tầm nhìn ngày mai sẽ khác.</p>',
  ],
  [
    '이탈리아 산간의 야생 빌베리, 프랑스 해안의 소나무 껍질, 이란 고원의 사프란 암술. 세 대륙의 원료가 하나의 목적을 위해 모였습니다.',
    'Wild bilberry from Italian mountains, pine bark from the French coast, saffron stigma from the Iranian plateau. Ingredients from three continents, united for one purpose.',
    '意大利山区的野生越橘、法国海岸的松树皮、伊朗高原的藏红花柱头。三大洲的原料为同一个目标汇聚。',
    'Việt quất hoang dã từ núi Ý, vỏ thông từ bờ biển Pháp, nhụy nghệ tây từ cao nguyên Iran. Nguyên liệu từ ba châu lục, hợp nhất vì một mục đích.',
  ],
  [
    '>글라우빌 시작하기</button>',
    '>Start with Glaubil</button>',
    '>开始使用Glaubil</button>',
    '>Bắt đầu với Glaubil</button>',
  ],
];

// ---------------------------------------------------------------------------
// Translate HTML
// ---------------------------------------------------------------------------

function translateHtml(koHtml: string, langIndex: 1 | 2 | 3): string {
  let result = koHtml;

  // Sort by Korean text length descending to prevent partial matches
  const sorted = [...translations].sort((a, b) => b[0].length - a[0].length);

  for (const tuple of sorted) {
    const koText = tuple[0];
    const targetText = tuple[langIndex];
    result = result.split(koText).join(targetText);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[ERROR] 환경변수가 설정되지 않았습니다.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Fetch Korean HTML
  const { data: product, error: fetchErr } = await supabase
    .from("products")
    .select("detail_html_ko")
    .eq("slug", "글라우빌")
    .single();

  if (fetchErr || !product?.detail_html_ko) {
    console.error("[ERROR] 글라우빌 제품을 찾을 수 없거나 detail_html_ko가 없습니다.", fetchErr?.message);
    process.exit(1);
  }

  const koHtml = product.detail_html_ko as string;

  // 2. Generate translated HTML
  console.log("[INFO] Generating translated HTML...");
  const enHtml = translateHtml(koHtml, 1);
  const zhHtml = translateHtml(koHtml, 2);
  const viHtml = translateHtml(koHtml, 3);

  // 3. Count remaining Korean text (simple check)
  const koPattern = /[\uac00-\ud7af]/g;
  const enKoCount = (enHtml.match(koPattern) || []).length;
  const zhKoCount = (zhHtml.match(koPattern) || []).length;
  const viKoCount = (viHtml.match(koPattern) || []).length;
  console.log(`[INFO] Remaining Korean chars - EN: ${enKoCount}, ZH: ${zhKoCount}, VI: ${viKoCount}`);

  // 4. Update database
  const { data, error } = await supabase
    .from("products")
    .update({
      // --- 제품명 ---
      name_en: "Glaubil",
      name_zh: "Glaubil",
      name_vi: "Glaubil",

      // --- 주요성분 (Ingredients) ---
      ingredients_en: "Bilberry Extract, Pycnogenol (French Maritime Pine Bark Extract), Saffron Stigma Extract",
      ingredients_zh: "越橘提取物、碧萝芷（法国海岸松树皮提取物）、藏红花柱头提取物",
      ingredients_vi: "Chiết xuất Việt quất, Pycnogenol (Chiết xuất vỏ thông biển Pháp), Chiết xuất nhụy hoa nghệ tây",

      // --- 기능성 (Functionality) ---
      functionality_en: "May help improve eye fatigue",
      functionality_zh: "有助于改善眼睛疲劳",
      functionality_vi: "Có thể giúp cải thiện mỏi mắt",

      // --- 섭취방법 (How to Use) ---
      how_to_use_en: "Take 1 tablet twice daily with water.",
      how_to_use_zh: "每日2次，每次1片，用水送服。",
      how_to_use_vi: "Uống 1 viên mỗi ngày 2 lần với nước.",

      // --- HTML 상세페이지 ---
      detail_html_en: enHtml,
      detail_html_zh: zhHtml,
      detail_html_vi: viHtml,
    })
    .eq("slug", "글라우빌")
    .select("slug, name_ko");

  if (error) {
    console.error("[ERROR]", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error("[ERROR] '글라우빌' 제품을 찾을 수 없습니다.");
    process.exit(1);
  }

  console.log("[OK] 다국어 번역 업데이트 완료:", data[0].name_ko);
  console.log("  - name_en/zh/vi ✓");
  console.log("  - ingredients_en/zh/vi ✓");
  console.log("  - functionality_en/zh/vi ✓");
  console.log("  - how_to_use_en/zh/vi ✓");
  console.log("  - detail_html_en/zh/vi ✓");
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
