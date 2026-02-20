-- =============================================================
-- 추가 서브카테고리 시드 데이터
-- 일반의약품(medicine), 코스메틱(cosmetic), 기타(other)
-- =============================================================

INSERT INTO product_subcategories (parent_category, slug, name_ko, name_en, name_zh, name_vi, sort_order)
VALUES
  -- 일반의약품 (medicine)
  ('medicine', 'cold',              '감기',         'Cold Medicine',        '感冒药',       'Thuoc cam',            1),
  ('medicine', 'pain-fever',        '진통소염해열', 'Pain & Fever Relief',  '镇痛消炎退热', 'Giam dau ha sot',      2),
  ('medicine', 'herbal',            '한방제제',     'Herbal Medicine',      '韩方制剂',     'Thuoc dong y',         3),
  ('medicine', 'topical',           '피부외용제',   'Topical Medicine',     '皮肤外用药',   'Thuoc boi ngoai da',   4),
  ('medicine', 'digestive',         '소화기계',     'Digestive System',     '消化系统',     'He tieu hoa',          5),

  -- 코스메틱 (cosmetic)
  ('cosmetic', 'functional',        '기능성화장품', 'Functional Cosmetics', '功能性化妆品', 'My pham chuc nang',    1),
  ('cosmetic', 'derma',             '더마코스메틱', 'Derma Cosmetics',      '皮肤科化妆品', 'My pham da lieu',      2),
  ('cosmetic', 'skincare',          '스킨케어',     'Skincare',             '护肤',         'Cham soc da',          3),
  ('cosmetic', 'cleansing',         '클렌징',       'Cleansing',            '清洁',         'Lam sach',             4),
  ('cosmetic', 'body-hair',         '바디&헤어케어','Body & Hair Care',     '身体护理',     'Cham soc co the & toc',5),
  ('cosmetic', 'secret-care',       '시크릿케어',   'Secret Care',          '私密护理',     'Cham soc vung kin',    6),
  ('cosmetic', 'homme',             '옴므',         'Homme',                '男士',         'Nam gioi',             7),

  -- 기타 (other)
  ('other',    'medical-device',    '의료기기',     'Medical Device',       '医疗器械',     'Thiet bi y te',        1),
  ('other',    'quasi-drug',        '의약외품',     'Quasi-Drug',           '医药外品',     'San pham y duoc',      2)
ON CONFLICT ON CONSTRAINT uq_subcategory_parent_slug DO NOTHING;
