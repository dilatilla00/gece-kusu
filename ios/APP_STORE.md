# Kibar Hırsız: App Store'a çıkış rehberi

Bu klasörde App Store için gerekenlerin hepsi hazır: Xcode projesi, uygulama simgesi, açılış ekranı, gizlilik bildirimi, ekran görüntüleri ve mağaza metinleri. Aşağıdaki adımları senin yapman gerekiyor, çünkü bunlar senin Apple hesabınla yapılıyor.

## 1. Gerekenler

- **Mac'e Xcode kur.** Mac App Store'dan ücretsiz indirilir. Kurduktan sonra bir kez aç ve ek bileşenleri yüklemesine izin ver.
- **Apple Developer Program üyeliği.** https://developer.apple.com/programs/ adresinden yıllık 99 USD karşılığında alınır. Onaylanması 1–2 gün sürebilir.

## 2. Projeyi Xcode'da aç

1. `ios/GeceKusu.xcodeproj` dosyasına çift tıkla.
2. Soldan **GeceKusu** projesini, ardından **Signing & Capabilities** sekmesini seç.
3. **Team** kısmından kendi geliştirici hesabını seç.
4. **Bundle Identifier** şu an `com.dilatilla.kibarhirsiz`. İstersen değiştirebilirsin, ama App Store'a yükledikten sonra değiştirilemez.
5. Üstten bir iPhone simülatörü seçip ▶ düğmesine bas ve oyunun açıldığını gör.

Oyunun web dosyaları her derlemede `ios/sync-web.sh` ile kendiliğinden uygulamanın içine kopyalanır. Oyunda bir değişiklik yaptığında ayrıca bir şey yapman gerekmez.

## 3. App Store Connect'te uygulamayı oluştur

https://appstoreconnect.apple.com → **Uygulamalar** → **+** → **Yeni Uygulama**

| Alan | Değer |
|---|---|
| Platform | iOS |
| Ad | Kibar Hırsız (alınmışsa: "Kibar Hırsız: İstanbul 1924") |
| Birincil dil | Türkçe |
| Paket kimliği | com.dilatilla.kibarhirsiz |
| SKU | kibarhirsiz-001 |

## 4. Mağaza metinleri

**Alt başlık** (en fazla 30 karakter)
> 1920'ler İstanbul'unda soygun

**Tanıtım metni** (en fazla 170 karakter)
> Küçük evlerden saray hazinesine, İstanbul'dan Monte Carlo kumarhanesine uzanan centilmen bir hırsızın hikâyesi. Planla, ekibini kur, iz bırakma.

**Açıklama**
> 1924 İstanbul'u. Geceler uzun, konaklar sessiz, müzeler korunaksız sanılır. Sen Kibar Hırsız'sın: kimseye zarar vermeyen, ama hiçbir kilidin de önünde duramadığı centilmen bir hırsız.
>
> KÜÇÜKTEN BAŞLA, EFSANE OL
> Fatih'teki bir kunduracının evinden başla; dükkânlara, mağazalara, müzelere ve sonunda Saray Hazinesi'ne uzan. Her hedefin bir başarı şansı var ve bu şansı sen değiştirirsin.
>
> GERÇEK ZAMANLI SOYGUNLAR
> Sessiz giriş, soygun ve kaçış gerçek zamanlı ilerler. Yolda bir köpek havlar, bekçi düdük çalar, kasanın şifresi tutmaz. Ne yapacağına sen karar verirsin: risk mi alırsın, geri mi çekilirsin?
>
> EKİBİNİ KUR
> Gözcü, kilitçi, şoför, kaçakçı... Her ekip üyesinin kendi yeteneği ve kendi payı var. Onları eğit, birlikte büyüyün.
>
> YETENEKLER VE ALETLER
> Maymuncuktan sahte kimliğe, onlarca alet ve yetenekle her yeni kapıyı aç. Ustalık sistemiyle sınırları aş.
>
> DÜNYAYA AÇIL
> İstanbul sana dar gelince Atina, Kahire, Paris ve Monte Carlo seni bekler. En büyük vurgun: Monte Carlo kumarhanesi.
>
> EFSANE KOLEKSİYONU
> Bizans tacı, firavun maskesi, prenses mücevherleri... Setleri tamamla, kalıcı güçler kazan.
>
> SONU OLMAYAN BİR YOLCULUK
> Oyun bitmez: güvenlik her soygunla artar, her şehirde yeni bir meydan okuma vardır.
>
> İnternet gerekmez, reklam yoktur, hiçbir veri toplanmaz.

**Anahtar kelimeler** (en fazla 100 karakter)
> hırsız,soygun,istanbul,strateji,idle,tycoon,ekip,müze,kasa,1920,menü,simülasyon,centilmen

| Alan | Değer |
|---|---|
| Kategori | Oyunlar → Simülasyon (ikincil: Strateji) |
| Destek URL'si | https://dilatilla00.github.io/kibar-hirsiz/support.html |
| Gizlilik politikası URL'si | https://dilatilla00.github.io/kibar-hirsiz/privacy.html |
| Pazarlama URL'si (isteğe bağlı) | https://dilatilla00.github.io/kibar-hirsiz/ |
| Telif hakkı | 2026 (senin adın) |
| Fiyat | Ücretsiz (ya da sen nasıl istersen) |

## 5. Ekran görüntüleri

`ios/store/screenshots-6.9/` klasöründe 6 adet 2868×1320 yatay görüntü var. Bunları **iPhone 6.9" ekran** bölümüne yükle. Apple bu boyuttan diğer iPhone boyutlarını kendisi türetir.

## 6. Uygulama gizliliği

App Store Connect → **Uygulama Gizliliği** → **Veri toplamıyoruz** ("Data Not Collected") seç. Oyun hiçbir veri toplamıyor ve göndermiyor. Uygulamanın içindeki `PrivacyInfo.xcprivacy` dosyası da bunu bildiriyor.

## 7. Yaş derecelendirmesi

Ankette şu cevaplar uygundur:

- **Seyrek/hafif gerçekçi şiddet:** Yok.
- **Seyrek/hafif yetişkin temaları:** "Seyrek/hafif" seçilebilir (konu hırsızlık).
- **Simüle kumar:** Yok. Kumarhane yalnızca soyulan bir hedef; oyunda kumar oynanmıyor.
- **Diğer tüm başlıklar:** Yok.

Sonuç büyük ihtimalle **9+** ya da **12+** olur.

## 8. Şifreleme sorusu

`ITSAppUsesNonExemptEncryption = NO` Info.plist'e eklendi. App Store Connect bu soruyu bir daha sormaz.

## 9. Yükle ve incelemeye gönder

1. Xcode'da üstteki cihaz seçiminden **Any iOS Device (arm64)** seç.
2. **Product → Archive** menüsünü kullan.
3. Açılan pencerede **Distribute App → App Store Connect → Upload**.
4. 10–30 dakika sonra yüklenen sürüm App Store Connect'te görünür. Sürümü seç, bilgileri doldur ve **İncelemeye Gönder**.
5. İnceleme genelde 1–3 gün sürer.

**İnceleme notu** (App Review Information → Notes):
> Tek oyunculu, çevrimdışı çalışan bir strateji oyunudur. Giriş ya da hesap gerekmez. Soygunlar gerçek zamanlıdır; beklemeyi kısaltmak için soygun ekranındaki "Hızlandır" düğmesi oyun içi elmas kullanır (gerçek para ile satın alma yoktur).

## Yeni sürüm çıkarmak

1. Oyunda değişikliği yap.
2. Xcode'da **Version** (örn. 1.1) ve **Build** (örn. 2) numaralarını artır.
3. 9. adımı tekrarla.

## Reklamlar (1.1 sürümü için hazır, şu an kapalı)

Oyunda 5 ödüllü reklam noktası hazır; ilk sürümde hiçbiri görünmez.

| Nerede | Ödül | Sınır |
|---|---|---|
| Soygun paneli | İşi bir sonraki olaya ya da sona atlat | İş başına 1 |
| Başarılı soygun sonucu | Ganimeti ikiye katla | Sonuç başına 1 |
| Gazete · takip | Takibi 1 düşür | Gecede 1 |
| Karaborsa · elmas | Bedava 1 elmas | Gecede 1 |
| Görev penceresi | İkinci kez görev değiştir | Gecede 1 |

- Mod `js/ads.js` içindeki `MODE` ile seçilir: `off` (kapalı), `test` (sahte reklam), `on` (gerçek reklam).
- Tarayıcıda denemek için adresin sonuna `?ads=test` ekle; kapatmak için `?ads=off`.
- Gerçek reklam için iOS tarafına Google AdMob eklenip `ads` mesajı dinlenecek; reklam bitince `window.Ads._done(id, true)` çağrılacak.
- Reklamlar açılınca gizlilik politikası, App Store gizlilik beyanı ve izleme izni (ATT) güncellenmeli.

## Elmas satın alma (hazır, şu an kapalı)

Üst çubuktaki elmas kutusunun yanındaki **+** düğmesi elmas mağazasını açar. İlk sürümde gizli.

| Paket | Elmas | Hediye | Ürün kimliği (App Store Connect) | Öneri fiyat |
|---|---|---|---|---|
| Bir avuç elmas | 10 | — | com.dilatilla.kibarhirsiz.gems10 | ₺49,99 |
| Elmas kesesi | 30 | +3 | com.dilatilla.kibarhirsiz.gems30 | ₺129,99 |
| Elmas sandığı | 80 | +15 | com.dilatilla.kibarhirsiz.gems80 | ₺299,99 |
| Saray hazinesi | 200 | +50 | com.dilatilla.kibarhirsiz.gems200 | ₺649,99 |

- Mod `js/shop.js` içindeki `MODE` ile seçilir: `off`, `test` (sahte ödeme), `on` (gerçek ödeme).
- Tarayıcıda denemek için `?shop=test`; kapatmak için `?shop=off`.
- Gerçek satış için: App Store Connect'te **Paid Apps** sözleşmesi, vergi ve banka bilgileri; yukarıdaki 4 ürünü **Consumable (tüketilebilir)** olarak açmak; iOS tarafına StoreKit eklenip `store` mesajını dinlemek ve satın alma bitince `window.Shop._done(id, true)` çağırmak.
- Elmas satın alma oyunda sadece hızı ve kolaylığı artırır; her şey satın almadan da kazanılabilir.
