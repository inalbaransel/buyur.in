// İşletmenin mevcut kategori/ürün kayıtlarına EN/AR/RU çevirilerini yazar.
// Kayıtlar Türkçe `name` alanına göre eşleştirilir; eşleşmeyenler atlanır.
// Var olan çevirilerin üzerine yazar (idempotent, tekrar çalıştırılabilir).
// Kullanım: POCKETBASE_API_URL=... POCKETBASE_ADMIN_TOKEN=... node scripts/seed-translations.mjs [slug]

import PocketBase from "pocketbase";

const PB_URL = process.env.POCKETBASE_API_URL;
const PB_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN;
const SLUG = process.argv[2] ?? "vezirhan";

if (!PB_URL || !PB_TOKEN) {
  console.error("POCKETBASE_API_URL ve POCKETBASE_ADMIN_TOKEN ortam değişkenleri gerekli.");
  process.exit(1);
}

const pb = new PocketBase(PB_URL);
pb.authStore.save(PB_TOKEN, null);

// İşletme açıklaması (isim özel ad olduğu için çevrilmez)
const businessTranslations = {
  en: { description: "Turkish and Middle Eastern cuisine right in front of the Bosphorus Bridge" },
  ar: { description: "مطبخ تركي وشرق أوسطي أمام جسر البوسفور مباشرة" },
  ru: { description: "Турецкая и ближневосточная кухня прямо напротив Босфорского моста" },
};

const categoryTranslations = {
  "Güne Başlarken": {
    en: { name: "Breakfast" },
    ar: { name: "الإفطار" },
    ru: { name: "Завтрак" },
  },
  "Başlangıçlar & Atıştırmalıklar": {
    en: { name: "Starters & Snacks" },
    ar: { name: "المقبلات والوجبات الخفيفة" },
    ru: { name: "Закуски и снеки" },
  },
  "Ana Yemekler": {
    en: { name: "Main Courses" },
    ar: { name: "الأطباق الرئيسية" },
    ru: { name: "Основные блюда" },
  },
  "Salatalar": {
    en: { name: "Salads" },
    ar: { name: "السلطات" },
    ru: { name: "Салаты" },
  },
  "Tatlılar": {
    en: { name: "Desserts" },
    ar: { name: "الحلويات" },
    ru: { name: "Десерты" },
  },
  "Sıcak İçecekler": {
    en: { name: "Hot Drinks" },
    ar: { name: "المشروبات الساخنة" },
    ru: { name: "Горячие напитки" },
  },
  "Soğuk İçecekler": {
    en: { name: "Cold Drinks" },
    ar: { name: "المشروبات الباردة" },
    ru: { name: "Холодные напитки" },
  },
};

const productTranslations = {
  "Mini Kahvaltı": {
    en: { name: "Mini Breakfast", description: "A light, practical and filling small breakfast plate. Ideal for a quick start to the day." },
    ar: { name: "فطور صغير", description: "طبق فطور صغير خفيف وعملي ومشبع. مثالي لبداية سريعة لليوم." },
    ru: { name: "Мини-завтрак", description: "Лёгкая, удобная и сытная тарелка для завтрака. Идеально для быстрого начала дня." },
  },
  "Menemen": {
    en: { name: "Menemen", description: "Tomatoes, peppers, eggs, spices" },
    ar: { name: "منيمن", description: "طماطم وفلفل وبيض وتوابل" },
    ru: { name: "Менемен", description: "Помидоры, перец, яйца, специи" },
  },
  "Avokadolu Tost": {
    en: { name: "Avocado Toast", description: "Avocado, cheese, arugula, whole-wheat bread" },
    ar: { name: "توست بالأفوكادو", description: "أفوكادو وجبن وجرجير وخبز القمح الكامل" },
    ru: { name: "Тост с авокадо", description: "Авокадо, сыр, руккола, цельнозерновой хлеб" },
  },
  "Patates Kızartması": {
    en: { name: "French Fries", description: "Crispy cut, with special spices" },
    ar: { name: "بطاطس مقلية", description: "تقطيع مقرمش مع توابل خاصة" },
    ru: { name: "Картофель фри", description: "Хрустящая нарезка со специями" },
  },
  "Soğan Halkası": {
    en: { name: "Onion Rings", description: "Crispy coated, with BBQ sauce" },
    ar: { name: "حلقات البصل", description: "مقرمشة تُقدم مع صلصة الباربكيو" },
    ru: { name: "Луковые кольца", description: "В хрустящей панировке, с соусом барбекю" },
  },
  "Humus Tabağı": {
    en: { name: "Hummus Plate", description: "Chickpea purée, olive oil, warm pita" },
    ar: { name: "طبق حمص", description: "حمص بزيت الزيتون مع خبز ساخن" },
    ru: { name: "Хумус", description: "Нутовое пюре, оливковое масло, тёплая пита" },
  },
  "Izgara Köfte": {
    en: { name: "Grilled Meatballs", description: "Handmade, with roasted peppers and rice" },
    ar: { name: "كفتة مشوية", description: "كفتة يدوية مع فلفل مشوي وأرز" },
    ru: { name: "Кёфте на гриле", description: "Домашние котлеты с печёным перцем и рисом" },
  },
  "Tavuk Şiş": {
    en: { name: "Chicken Shish", description: "Marinated chicken breast, bulgur pilaf, roasted vegetables" },
    ar: { name: "شيش طاووق", description: "صدر دجاج متبل مع برغل وخضار مشوية" },
    ru: { name: "Куриный шашлык", description: "Маринованная куриная грудка, булгур, овощи гриль" },
  },
  "Mantarlı Risotto": {
    en: { name: "Mushroom Risotto", description: "Button mushrooms, parmesan, fresh thyme" },
    ar: { name: "ريزوتو بالفطر", description: "فطر وبارميزان وزعتر طازج" },
    ru: { name: "Ризотто с грибами", description: "Шампиньоны, пармезан, свежий тимьян" },
  },
  "Özel Burger": {
    en: { name: "Signature Burger", description: "Beef patty, cheddar, lettuce, tomato, special sauce" },
    ar: { name: "برجر خاص", description: "لحم بقري وشيدر وخس وطماطم وصلصة خاصة" },
    ru: { name: "Фирменный бургер", description: "Говядина, чеддер, салат, томаты, фирменный соус" },
  },
  "Mevsim Salatası": {
    en: { name: "Seasonal Salad", description: "Arugula, pomegranate, walnuts, goat cheese" },
    ar: { name: "سلطة الموسم", description: "جرجير ورمان وجوز وجبن الماعز" },
    ru: { name: "Сезонный салат", description: "Руккола, гранат, грецкий орех, козий сыр" },
  },
  "Sezar Salata": {
    en: { name: "Caesar Salad", description: "Grilled chicken, parmesan, croutons, Caesar dressing" },
    ar: { name: "سلطة سيزر", description: "دجاج مشوي وبارميزان وخبز محمص وصلصة سيزر" },
    ru: { name: "Салат Цезарь", description: "Курица гриль, пармезан, гренки, соус цезарь" },
  },
  "San Sebastian": {
    en: { name: "San Sebastian Cheesecake", description: "Basque burnt cheesecake, slice" },
    ar: { name: "تشيز كيك سان سيباستيان", description: "شريحة تشيز كيك محروق" },
    ru: { name: "Сан-Себастьян", description: "Ломтик баскского чизкейка" },
  },
  "Sufle": {
    en: { name: "Soufflé", description: "Warm chocolate soufflé with vanilla ice cream" },
    ar: { name: "سوفليه", description: "سوفليه شوكولاتة ساخن مع آيس كريم الفانيليا" },
    ru: { name: "Суфле", description: "Тёплое шоколадное суфле с ванильным мороженым" },
  },
  "Türk Kahvesi": {
    en: { name: "Turkish Coffee", description: "Double roasted, served with Turkish delight" },
    ar: { name: "قهوة تركية", description: "محمصة مرتين وتُقدم مع راحة الحلقوم" },
    ru: { name: "Кофе по-турецки", description: "Двойной обжарки, подаётся с лукумом" },
  },
  "Filtre Kahve": {
    en: { name: "Filter Coffee", description: "Freshly ground daily" },
    ar: { name: "قهوة مقطرة", description: "طحن طازج يوميًا" },
    ru: { name: "Фильтр-кофе", description: "Свежий помол каждый день" },
  },
  "Elma Çayı": {
    en: { name: "Apple Tea", description: "Homemade" },
    ar: { name: "شاي التفاح", description: "صنع منزلي" },
    ru: { name: "Яблочный чай", description: "Домашнего приготовления" },
  },
  "Taze Sıkılmış Portakal Suyu": {
    en: { name: "Fresh Orange Juice", description: "Freshly squeezed daily" },
    ar: { name: "عصير برتقال طازج", description: "معصور طازجًا يوميًا" },
    ru: { name: "Свежевыжатый апельсиновый сок", description: "Отжимается каждый день" },
  },
  "Limonata": {
    en: { name: "Lemonade", description: "Homemade, with mint" },
    ar: { name: "ليموناضة", description: "منزلية بالنعناع" },
    ru: { name: "Лимонад", description: "Домашний, с мятой" },
  },
  "Ice Latte": {
    en: { name: "Iced Latte", description: "Cold milk, espresso" },
    ar: { name: "لاتيه مثلج", description: "حليب بارد وإسبريسو" },
    ru: { name: "Айс латте", description: "Холодное молоко, эспрессо" },
  },
};

async function main() {
  const business = await pb.collection("buyur_businesses").getFirstListItem(pb.filter("slug = {:slug}", { slug: SLUG }));
  console.log(`İşletme bulundu: ${business.name} (${business.id})`);

  await pb.collection("buyur_businesses").update(business.id, { translations: businessTranslations });
  console.log("~ İşletme açıklaması çevirileri yazıldı");

  const categories = await pb.collection("buyur_categories").getFullList({
    filter: pb.filter("business = {:id}", { id: business.id }),
  });
  for (const cat of categories) {
    const tr = categoryTranslations[cat.name];
    if (!tr) {
      console.log(`? Kategori çevirisi yok, atlandı: ${cat.name}`);
      continue;
    }
    await pb.collection("buyur_categories").update(cat.id, { translations: tr });
    console.log(`~ Kategori: ${cat.name}`);
  }

  const products = await pb.collection("buyur_products").getFullList({
    filter: pb.filter("business = {:id}", { id: business.id }),
  });
  let missing = 0;
  for (const p of products) {
    const tr = productTranslations[p.name];
    if (!tr) {
      console.log(`? Ürün çevirisi yok, atlandı: ${p.name}`);
      missing++;
      continue;
    }
    await pb.collection("buyur_products").update(p.id, { translations: tr });
    console.log(`~ Ürün: ${p.name}`);
  }

  console.log(`\nTamamlandı. ${products.length - missing}/${products.length} ürün çevirisi yazıldı.`);
}

main().catch((err) => {
  console.error("Hata:", err?.response ?? err);
  process.exit(1);
});
