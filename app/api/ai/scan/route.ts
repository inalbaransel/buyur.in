import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerPB } from "@/lib/pocketbase";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  }

  const pb = createServerPB();
  pb.authStore.save(authHeader, null);
  try {
    await pb.collection("menuva_users").authRefresh();
  } catch {
    return NextResponse.json({ error: "Oturum geçersiz." }, { status: 401 });
  }
  const userId = pb.authStore.record?.id;

  const { images, businessId } = await req.json();

  if (!images || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: "Görsel bulunamadı." }, { status: 400 });
  }

  if (images.length > 10) {
    return NextResponse.json({ error: "Tek seferde en fazla 10 sayfa menü tarayabilirsiniz." }, { status: 400 });
  }
  
  if (typeof businessId !== "string") {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  try {
    const business = await pb.collection("menuva_businesses").getOne(businessId);
    if (business.owner !== userId) {
      return NextResponse.json({ error: "Bu işletmeye erişiminiz yok." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "İşletme bulunamadı." }, { status: 404 });
  }

  if (!process.env.OPENAI_API_KEY) {
     return NextResponse.json({ error: "Sistemde OpenAI API Key tanımlı değil. Lütfen .env.local dosyasına OPENAI_API_KEY ekleyin." }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const content = [
      {
        type: "text",
        text: "Sen bir menü veri çıkarma asistanısın. Eklenen menü fotoğraflarını inceleyerek kategorileri ve bu kategoriler altındaki ürünleri (isim, açıklama, fiyat) çıkar. Fiyatlardan para birimini temizle, sadece sayı olarak ver. Eğer açıklamada alerjen, kalori veya süre varsa bunları açıklama içine metin olarak ekle. Yanıtı mutlaka aşağıdaki JSON formatında ver: { \"categories\": [{ \"name\": \"string\", \"products\": [{ \"name\": \"string\", \"description\": \"string\", \"price\": number }] }] }"
      }
    ];

    for (const image of images) {
      content.push({
        type: "image_url",
        image_url: {
          url: image
        }
      } as any);
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: content as any,
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const resultText = response.choices[0].message.content;
    const json = JSON.parse(resultText || "{}");

    return NextResponse.json(json);
  } catch (error: any) {
    console.error("OpenAI Error:", error);
    return NextResponse.json({ error: "Yapay zeka tarama yaparken bir hata oluştu." }, { status: 500 });
  }
}
