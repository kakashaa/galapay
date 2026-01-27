-- Update Yemen with all wallets from the images (prioritizing الكريمي، النجم، بنسة first)
UPDATE countries_methods 
SET methods = '[
  {"nameArabic": "الكريمي", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "شبكة النجم", "iconUrl": "star", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "بنسة", "iconUrl": "coins", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "حوالات جيب", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "الشبكة اليمنية للتحويلات", "iconUrl": "globe", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "شبكة المميز", "iconUrl": "award", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "شبكة الهتار", "iconUrl": "globe", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "شبكة مال موني", "iconUrl": "banknote", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "شبكة البرق", "iconUrl": "zap", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "السريع للحوالات", "iconUrl": "send", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "شبكة الناصر", "iconUrl": "shield", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "شبكة المحيط", "iconUrl": "waves", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "شبكة العامري كاش", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "ياه موني", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "شبكة حزمي تحويل", "iconUrl": "send", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "شبكة الامتياز", "iconUrl": "star", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "شبكة يمن اكسبرس", "iconUrl": "truck", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "شبكة الحوشبي (إتش بي)", "iconUrl": "zap", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "شبكة الاكوع", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb,
updated_at = now()
WHERE country_code = 'YE';

-- Update Saudi Arabia with all wallets + MoneyGram + Western Union
UPDATE countries_methods 
SET methods = '[
  {"nameArabic": "STC Pay", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "urpay", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "AlinmaPay", "iconUrl": "credit-card", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Mobily Pay", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Apple Pay", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم الجوال", "type": "text"}]},
  {"nameArabic": "تحويل بنكي", "iconUrl": "building", "requiredFields": [{"name": "bankName", "labelArabic": "اسم البنك", "type": "text"}, {"name": "iban", "labelArabic": "رقم الآيبان", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb,
updated_at = now()
WHERE country_code = 'SA';

-- Update Egypt (top 3 + MoneyGram + Western Union)
UPDATE countries_methods 
SET methods = '[
  {"nameArabic": "فوري", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "فودافون كاش", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "اورنج كاش", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb,
updated_at = now()
WHERE country_code = 'EG';

-- Update UAE (top 3 + MoneyGram + Western Union)
UPDATE countries_methods 
SET methods = '[
  {"nameArabic": "Careem Pay", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "e& money", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "PayBy", "iconUrl": "credit-card", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb,
updated_at = now()
WHERE country_code = 'AE';

-- Update Jordan (top 3 + MoneyGram + Western Union)
UPDATE countries_methods 
SET methods = '[
  {"nameArabic": "زين كاش", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "أورنج موني", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "UWallet", "iconUrl": "credit-card", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb,
updated_at = now()
WHERE country_code = 'JO';

-- Insert new Arab countries

-- Iraq
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('IQ', 'العراق', '+964', '[
  {"nameArabic": "زين كاش", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "آسيا حوالة", "iconUrl": "globe", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "FastPay", "iconUrl": "zap", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Sudan
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('SD', 'السودان', '+249', '[
  {"nameArabic": "بنكك", "iconUrl": "building", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "mBok", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "SyberPay", "iconUrl": "credit-card", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Morocco
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('MA', 'المغرب', '+212', '[
  {"nameArabic": "Cash Plus", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Wafacash", "iconUrl": "banknote", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Barid Pay", "iconUrl": "mail", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Tunisia
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('TN', 'تونس', '+216', '[
  {"nameArabic": "D17", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Viamobile", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Ooredoo Money", "iconUrl": "credit-card", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Algeria
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('DZ', 'الجزائر', '+213', '[
  {"nameArabic": "Baridimob", "iconUrl": "mail", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Wimpay", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "CCP", "iconUrl": "building", "requiredFields": [{"name": "accountNumber", "labelArabic": "رقم الحساب", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Libya
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('LY', 'ليبيا', '+218', '[
  {"nameArabic": "صداد", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "تداول", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مصرفي", "iconUrl": "building", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Lebanon
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('LB', 'لبنان', '+961', '[
  {"nameArabic": "Whish Money", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "OMT", "iconUrl": "send", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Areeba", "iconUrl": "credit-card", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Palestine
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('PS', 'فلسطين', '+970', '[
  {"nameArabic": "جوال باي", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "PalPay", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "معالي", "iconUrl": "credit-card", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Kuwait
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('KW', 'الكويت', '+965', '[
  {"nameArabic": "Ooredoo Money", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "K-Net", "iconUrl": "credit-card", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "KFH Wallet", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Bahrain
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('BH', 'البحرين', '+973', '[
  {"nameArabic": "BenefitPay", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Bwallet", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "MaxWallet", "iconUrl": "credit-card", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Qatar
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('QA', 'قطر', '+974', '[
  {"nameArabic": "Ooredoo Money", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "iPay", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "QNB Mobile", "iconUrl": "building", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Oman
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('OM', 'عُمان', '+968', '[
  {"nameArabic": "Thawani", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "OmanNet", "iconUrl": "globe", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Pocket", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Syria
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('SY', 'سوريا', '+963', '[
  {"nameArabic": "الهرم", "iconUrl": "building", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "سيرياتيل كاش", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "MTN Cash", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Mauritania
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('MR', 'موريتانيا', '+222', '[
  {"nameArabic": "Masrvi", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Mobicash", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Sedad", "iconUrl": "credit-card", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Somalia
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('SO', 'الصومال', '+252', '[
  {"nameArabic": "Hormuud EVC Plus", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Telesom ZAAD", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Dahabshiil", "iconUrl": "building", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Djibouti
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('DJ', 'جيبوتي', '+253', '[
  {"nameArabic": "D-Money", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "CAC Bank", "iconUrl": "building", "requiredFields": [{"name": "accountNumber", "labelArabic": "رقم الحساب", "type": "text"}]},
  {"nameArabic": "Dahabshiil", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);

-- Comoros
INSERT INTO countries_methods (country_code, country_name_arabic, dial_code, methods, is_active)
VALUES ('KM', 'جزر القمر', '+269', '[
  {"nameArabic": "Huri Money", "iconUrl": "smartphone", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Mvola", "iconUrl": "wallet", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "BIC Comores", "iconUrl": "building", "requiredFields": [{"name": "accountNumber", "labelArabic": "رقم الحساب", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "send", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "globe", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb, true);