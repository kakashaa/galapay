-- Update countries_methods with wallet logo URLs for all countries

-- اليمن
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "الكريمي", "iconUrl": "/wallets/kuraimi.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "شبكة النجم", "iconUrl": "/wallets/najm.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "بنسة", "iconUrl": "/wallets/binse.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "جيب", "iconUrl": "/wallets/jaib.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "ون كاش", "iconUrl": "/wallets/one-cash.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "م-فلوس", "iconUrl": "/wallets/m-floos.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "آسيا حوالة", "iconUrl": "/wallets/asia-hawala.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'اليمن';

-- السعودية  
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "STC Pay", "iconUrl": "/wallets/stc-pay.svg", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "urpay", "iconUrl": "/wallets/urpay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "AlinmaPay", "iconUrl": "/wallets/alinmapay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Mobily Pay", "iconUrl": "/wallets/mobily-pay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Apple Pay", "iconUrl": "/wallets/apple-pay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم الجوال", "type": "text"}]},
  {"nameArabic": "تحويل بنكي", "iconUrl": "/wallets/bank-transfer.png", "requiredFields": [{"name": "bankName", "labelArabic": "اسم البنك", "type": "text"}, {"name": "iban", "labelArabic": "رقم الآيبان", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'السعودية';

-- مصر
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "فودافون كاش", "iconUrl": "/wallets/vodafone-cash.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "فوري", "iconUrl": "/wallets/fawry.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "انستاباي", "iconUrl": "/wallets/instapay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'مصر';

-- الأردن
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "زين كاش", "iconUrl": "/wallets/zain-cash.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "أورنج موني", "iconUrl": "/wallets/orange-money.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "UWallet", "iconUrl": "/wallets/uwallet.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'الأردن';

-- العراق
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "زين كاش", "iconUrl": "/wallets/zain-cash.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "آسيا حوالة", "iconUrl": "/wallets/asia-hawala.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "فاست باي", "iconUrl": "/wallets/sadapay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'العراق';

-- الإمارات
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "Careem Pay", "iconUrl": "/wallets/careem-pay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "e& money", "iconUrl": "/wallets/e-money.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Apple Pay", "iconUrl": "/wallets/apple-pay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم الجوال", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'الإمارات';

-- الكويت
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "KNET", "iconUrl": "/wallets/knet.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Ooredoo Money", "iconUrl": "/wallets/ooredoo.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "زين كاش", "iconUrl": "/wallets/zain-cash.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'الكويت';

-- البحرين
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "BenefitPay", "iconUrl": "/wallets/benefitpay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Bwallet", "iconUrl": "/wallets/bwallet.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "زين كاش", "iconUrl": "/wallets/zain-cash.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'البحرين';

-- قطر
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "Ooredoo Money", "iconUrl": "/wallets/ooredoo.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Vodafone Cash", "iconUrl": "/wallets/vodafone-cash.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Apple Pay", "iconUrl": "/wallets/apple-pay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم الجوال", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'قطر';

-- عمان
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "Ooredoo Money", "iconUrl": "/wallets/ooredoo.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "تحويل بنكي", "iconUrl": "/wallets/bank-transfer.png", "requiredFields": [{"name": "bankName", "labelArabic": "اسم البنك", "type": "text"}, {"name": "iban", "labelArabic": "رقم الآيبان", "type": "text"}]},
  {"nameArabic": "Apple Pay", "iconUrl": "/wallets/apple-pay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم الجوال", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'عمان';

-- الجزائر
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "Baridimob", "iconUrl": "/wallets/baridimob.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "CCP", "iconUrl": "/wallets/bank-transfer.png", "requiredFields": [{"name": "accountNumber", "labelArabic": "رقم الحساب", "type": "text"}]},
  {"nameArabic": "Ooredoo Money", "iconUrl": "/wallets/ooredoo.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'الجزائر';

-- المغرب
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "Orange Money", "iconUrl": "/wallets/orange-money.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Inwi Money", "iconUrl": "/wallets/sadapay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "تحويل بنكي", "iconUrl": "/wallets/bank-transfer.png", "requiredFields": [{"name": "bankName", "labelArabic": "اسم البنك", "type": "text"}, {"name": "iban", "labelArabic": "رقم الآيبان", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'المغرب';

-- تونس
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "Ooredoo Money", "iconUrl": "/wallets/ooredoo.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Orange Money", "iconUrl": "/wallets/orange-money.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "تحويل بنكي", "iconUrl": "/wallets/bank-transfer.png", "requiredFields": [{"name": "bankName", "labelArabic": "اسم البنك", "type": "text"}, {"name": "iban", "labelArabic": "رقم الآيبان", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'تونس';

-- ليبيا
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "صدارة", "iconUrl": "/wallets/sadapay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "تحويل بنكي", "iconUrl": "/wallets/bank-transfer.png", "requiredFields": [{"name": "bankName", "labelArabic": "اسم البنك", "type": "text"}, {"name": "accountNumber", "labelArabic": "رقم الحساب", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'ليبيا';

-- السودان
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "بنكك", "iconUrl": "/wallets/bank-transfer.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "mBok", "iconUrl": "/wallets/sadapay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "فوري", "iconUrl": "/wallets/fawry.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'السودان';

-- لبنان
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "OMT", "iconUrl": "/wallets/sadapay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Whish Money", "iconUrl": "/wallets/uwallet.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "تحويل بنكي", "iconUrl": "/wallets/bank-transfer.png", "requiredFields": [{"name": "bankName", "labelArabic": "اسم البنك", "type": "text"}, {"name": "iban", "labelArabic": "رقم الآيبان", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'لبنان';

-- سوريا
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "الهرم", "iconUrl": "/wallets/asia-hawala.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "تحويل بنكي", "iconUrl": "/wallets/bank-transfer.png", "requiredFields": [{"name": "bankName", "labelArabic": "اسم البنك", "type": "text"}, {"name": "accountNumber", "labelArabic": "رقم الحساب", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'سوريا';

-- فلسطين
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "جوال باي", "iconUrl": "/wallets/jawwal-pay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "تحويل بنكي", "iconUrl": "/wallets/bank-transfer.png", "requiredFields": [{"name": "bankName", "labelArabic": "اسم البنك", "type": "text"}, {"name": "accountNumber", "labelArabic": "رقم الحساب", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'فلسطين';

-- الصومال
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "Hormuud EVC Plus", "iconUrl": "/wallets/sadapay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Telesom ZAAD", "iconUrl": "/wallets/uwallet.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Dahabshiil", "iconUrl": "/wallets/asia-hawala.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'الصومال';

-- جيبوتي
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "D-Money", "iconUrl": "/wallets/sadapay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "تحويل بنكي", "iconUrl": "/wallets/bank-transfer.png", "requiredFields": [{"name": "bankName", "labelArabic": "اسم البنك", "type": "text"}, {"name": "accountNumber", "labelArabic": "رقم الحساب", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'جيبوتي';

-- موريتانيا
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "Bankily", "iconUrl": "/wallets/bank-transfer.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "Sedad", "iconUrl": "/wallets/sadapay.png", "requiredFields": [{"name": "walletNumber", "labelArabic": "رقم المحفظة", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'موريتانيا';

-- جزر القمر
UPDATE public.countries_methods 
SET methods = '[
  {"nameArabic": "تحويل بنكي", "iconUrl": "/wallets/bank-transfer.png", "requiredFields": [{"name": "bankName", "labelArabic": "اسم البنك", "type": "text"}, {"name": "accountNumber", "labelArabic": "رقم الحساب", "type": "text"}]},
  {"nameArabic": "مونيجرام", "iconUrl": "/wallets/moneygram.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]},
  {"nameArabic": "ويسترن يونيون", "iconUrl": "/wallets/western-union.png", "requiredFields": [{"name": "city", "labelArabic": "المدينة", "type": "text"}]}
]'::jsonb
WHERE country_name_arabic = 'جزر القمر';