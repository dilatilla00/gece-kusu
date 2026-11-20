# Kibar Hırsız

1920'ler İstanbul'unda geçen, menü tabanlı bir hırsızlık oyunu. Yatay ekran için tasarlandı.

## Çalıştırma

Klasörde bir yerel sunucu başlatıp tarayıcıda `http://localhost:8642` adresini aç:

```bash
python3 -m http.server 8642
```

İlerleme tarayıcının yerel depolamasına kaydedilir. Ayarlar menüsünden yeni oyun başlatılabilir.

## Yapı

| Dosya | Görevi |
|---|---|
| `eras/1920/content.js` | Dönem paketi: hedefler, yetenekler, aletler, görevler, gazete metinleri, bina çizimleri |
| `js/engine.js` | Oyun mantığı: başarı şansı, soygun, seviye, takip, görevler, kayıt. Döneme bağlı metin içermez. |
| `js/ui.js` | Arayüz: ekranlar, modallar, bildirimler |
| `css/style.css` | Görünüm |

## Yeni dönem eklemek

1. `eras/1920/content.js` dosyasını `eras/<dönem>/content.js` olarak kopyala.
2. Aynı yapıyı koruyarak içeriği değiştir (isimler, metinler, sahne çizimleri).
3. `index.html` içindeki dönem paketi satırını yeni dosyaya çevir.

Motor ve arayüz değişmeden çalışır.

## iOS uygulaması

`ios/` klasöründe oyunu iPhone uygulaması olarak paketleyen Xcode projesi var. Oyun internetsiz çalışır; yazı tipleri ve simgeler `vendor/` klasöründe. App Store'a çıkış adımları için [ios/APP_STORE.md](ios/APP_STORE.md) dosyasına bak.
