# Buyur AI – Fiziksel Menü Aktarımı ve Otomatik İçerik

Buyur yönetim panelinde AI özelliklerini öne çıkarmak için ana navigasyona **AI** sekmesi ekle. Tüm geliştirmeler tek fazda tamamlanmalı, mevcut proje mimarisi ve tasarım diliyle uyumlu çalışmalıdır.

## 1. AI Merkezi

AI sekmesinde işletme sahibinin fiziksel menüsünü dijitalleştirebileceği sade ve modern bir arayüz oluştur.

Ana özellik:

**Fiziksel Menüyü İçe Aktar**

Kullanıcı fotoğraf veya PDF formatında fiziksel menüsünü yükleyebilmeli. AI, menüyü analiz ederek kategori ve ürünleri tek işlemde çıkarmalı ve Buyur içerisine aktarmaya hazır hale getirmeli.

## 2. Fiziksel Menüden Kategori ve Ürün Aktarımı

AI, yüklenen menüden:

- Kategori isimlerini
- Ürün isimlerini
- Ürün açıklamalarını
- Fiyatları
- Para birimlerini
- Kategori–ürün ilişkilerini

tespit etmeli.

Çıktılar içe aktarma öncesinde önizleme ekranında gösterilmeli. Kullanıcı düzenleme yapabilmeli, hataları kontrol edebilmeli ve onayladıktan sonra tüm kategoriler ve ürünler tek seferde menüsüne eklenmeli.

Okunamayan veya belirsiz bilgiler tahmin edilerek doldurulmamalı; kullanıcıya işaretlenmeli.

## 3. Otomatik Ürün Görseli Bulma

Kullanıcı fiziksel menü aktarırken veya sistem mock data oluştururken, ürün adına göre ücretsiz görsel sağlayıcılarından uygun görsel aranmalı.

Örneğin:

- Pizza Margherita → Pizza görseli
- Mercimek Çorbası → Mercimek çorbası görseli
- Cheeseburger → Cheeseburger görseli

Unsplash, Pexels veya Pixabay gibi uygun API ve lisans koşullarına sahip ücretsiz görsel sağlayıcıları kullanılmalı.

Bulunan görselin URL'si ürün kaydına eklenmeli ve önizlemede gösterilmeli. Kullanıcı görseli değiştirebilmeli, yeniden aratabilmeli veya kendi görselini yükleyebilmeli.

Görsel araması başarısız olursa ürün oluşturma işlemi engellenmemeli.

## 4. Çoklu Dil Desteği

İşletmenin birden fazla aktif dili varsa, fiziksel menüden varsayılan dilde aktarılan kategori ve ürün içerikleri için **"Tüm Dilleri AI ile Oluştur"** özelliği bulunmalı.

AI:

- Kategori adlarını ve açıklamalarını
- Ürün adlarını ve açıklamalarını
- Varsa seçenek ve varyant adlarını

işletmenin aktif dillerine çevirmeli.

Çeviriler kullanıcı onayına sunulmalı. Fiyatlar, sayısal değerler ve doğrulanması gereken bilgiler değiştirilmemeli. Kullanıcı dilleri tek tek seçebilmeli veya tüm aktif dillerde çeviri oluşturabilmeli.

## 5. Uygulama Gereksinimleri

- Tüm özellikler tek fazda tamamlanmalı.
- AI sekmesi, fiziksel menü aktarımı, otomatik görsel bulma, mock data entegrasyonu ve çoklu dil desteği birlikte çalışmalı.
- AI işlemleri backend üzerinden güvenli şekilde yönetilmeli.
- API anahtarları frontend'e gönderilmemeli.
- Oluşturulan içerikler varsayılan olarak taslak statüsünde olmalı.
- Kullanıcı onayı olmadan menü yayına alınmamalı.
- AI kullanım limitleri mevcut Freemium, Premium ve Elite planlarıyla uyumlu olmalı.
- Mevcut Buyur kod yapısı, veritabanı ve API'leri incelenerek geliştirme yapılmalı; gereksiz yeni mimari oluşturulmamalı.

**Hedef:** İşletme sahibi fiziksel menüsünü yüklediğinde, AI tüm kategori ve ürünleri tek seferde çıkarıp görsellerini bulmalı ve seçilen dillerde içerikleri hazırlayarak dijital menüye hızlıca aktarabilmelidir.