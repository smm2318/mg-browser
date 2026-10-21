# راهنمای انتشار عمومی MG Browser

این سند مسیر عملی انتشار عمومی، هزینه‌ها، امضای کد، استورها و ریسک‌های مخصوص یک مرورگر را جمع می‌کند.

---

## ۱. اول تصمیم بگیرید از کجا توزیع می‌کنید

| کانال | مناسب برای | هزینه | زمان |
| --- | --- | --- | --- |
| **وب‌سایت + GitHub Releases** | شروع سریع، بتا، همه پلتفرم‌ها | تقریباً رایگان | ۱–۲ روز |
| **Microsoft Store (MSIX)** | کاربران ویندوز، اعتماد بیشتر | ۱۹ دلار یک‌بار | ۳–۷ روز |
| **DMG امضاشده (خارج از App Store)** | مک، روش استاندارد مرورگرها | ۹۹ دلار/سال | ۱–۳ روز |
| **Mac App Store** | مک، سخت‌گیرانه | ۹۹ دلار/سال | ۱–۲ هفته |
| **Google Play / App Store** | موبایل | ۲۵ دلار یک‌بار / ۹۹ دلار سالانه | ۱–۲ هفته |

**توصیه:** نسخه ویندوز را با نصب‌کننده امضاشده روی سایت خودتان + GitHub Releases منتشر کنید. استورها را برای فاز بعد بگذارید.

---

## ۲. امضای کد — مهم‌ترین قدم

بدون امضا، هر کاربر ویندوز هشدار SmartScreen و هر کاربر مک هشدار Gatekeeper می‌بیند. این تنها راه حذف واقعی هشدارهاست (نه ترفند رجیستری).

### ویندوز

از ژوئن ۲۰۲۳، کلید خصوصی گواهی‌های OV/EV باید در HSM یا سرویس ابری باشد؛ فایل PFX ساده دیگر صادر نمی‌شود. گزینه‌ها:

1. **Azure Trusted Signing** (ارزان‌ترین و ساده‌ترین برای CI)
   - حدود ۱۰ دلار در ماه، بدون توکن سخت‌افزاری.
   - نیاز به احراز هویت سازمان/فرد و بررسی صلاحیت دارد.
   - با `signtool` یا `electron-builder` قابل استفاده است.
2. **گواهی OV از resellerها** (Sectigo / SSL.com / DigiCert)
   - حدود ۲۰۰–۴۰۰ دلار در سال + سرویس Cloud HSM.
   - شهرت SmartScreen به‌تدریج ساخته می‌شود.
3. **گواهی EV**
   - حدود ۳۰۰–۷۰۰ دلار در سال + توکن/HSM.
   - معمولاً اعتماد سریع‌تر، اما تضمینی نیست.

تنظیمات `electron-builder` (ساده‌ترین حالت با PFX ابری):

```powershell
$env:CSC_LINK="C:\path\to\certificate.pfx"
$env:CSC_KEY_PASSWORD="••••••"
npm run dist:win
```

برای Azure Trusted Signing، در `app/package.json` از گزینه‌های `win.azureSignOptions` (نسخه‌های جدید electron-builder) یا یک `sign` سفارشی که `signtool` را با پروفایل Azure صدا می‌زند استفاده کنید. بعد از ساخت، بررسی کنید:

```powershell
Get-AuthenticodeSignature .\MG-Browser.exe
signtool verify /pa /v .\MG-Browser.exe
```

> اگر با گواهی OV امضا کنید، SmartScreen ممکن است تا چند هفته «Unknown publisher» بماند تا شهرت فایل ساخته شود. Azure Trusted Signing و EV معمولاً وضعیت بهتری دارند.

### مک

1. عضویت **Apple Developer Program** (۹۹ دلار/سال).
2. ساخت گواهی **Developer ID Application**.
3. فعال کردن Hardened Runtime و entitlements لازم برای Electron:
   - `com.apple.security.cs.allow-jit`
   - `com.apple.security.cs.allow-unsigned-executable-memory`
4. Notarization با `notarytool` و staple کردن DMG.
5. متغیرهای محیطی برای electron-builder:

```bash
export CSC_LINK="/path/to/DeveloperID.p12"
export CSC_KEY_PASSWORD="••••••"
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
npm run dist:mac
```

بررسی:

```bash
codesign --verify --deep --strict --verbose=2 "MG Browser.app"
spctl -a -vvv -t install "MG-Browser.dmg"
xcrun stapler staple "MG-Browser.dmg"
```

### لینوکس

دروازه‌بان مرکزی وجود ندارد؛ اما برای اعتماد:

- انتشار AppImage/deb روی HTTPS
- ارائه `SHA256SUMS`
- امضای GPG فایل‌ها و انتشار کلید عمومی
- (اختیاری) انتشار در Flathub با manifest

---

## ۳. نصب‌کننده و به‌روزرسانی خودکار

- ویندوز: **NSIS** (بهتر از ZIP برای کاربر عادی) + ZIP پرتابل
- مک: **DMG** امضاشده و notarized
- لینوکس: **AppImage** + **deb**

برای آپدیت خودکار:

```bash
cd app
npm install electron-updater
```

```js
// src/main/main.js
const { autoUpdater } = require('electron-updater');
app.whenReady().then(() => {
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});
```

و در `app/package.json`:

```json
"publish": [
  { "provider": "github", "owner": "YOUR_GITHUB_USER", "repo": "mg-browser" }
]
```

نکات:
- الکترون‌بویلدر `latest.yml` و `.blockmap` می‌سازد؛ همان‌ها را در Release آپلود کنید.
- آپدیت‌ها باید امضا شوند؛ در غیر این صورت مهاجم می‌تواند بسته جعلی بفرستد.
- برای انتشار تدریجی (rollout) از کانال‌های `beta`/`stable` استفاده کنید.
- مک برای آپدیت خودکار باید امضاشده و notarized باشد.

---

## ۴. وب‌سایت، حریم خصوصی، مجوزها

حداقل‌ها:

1. **دامنه اختصاصی** + صفحه دانلود + تغییرات نسخه + لینک GitHub.
2. **سیاست حریم خصوصی** (برای استورها اجباری است):
   - چه چیزی روی دستگاه ذخیره می‌شود (تاریخچه، رمزهای رمزنگاری‌شده، تنظیمات).
   - هیچ تلمتری وجود ندارد (یا اگر دارید، دقیقاً بگویید چه چیزی و چگونه opt-in است).
   - کوکی‌های گوگل/سایت‌ها توسط خود سایت‌ها مدیریت می‌شوند.
   - جستجوها به موتور انتخابی کاربر ارسال می‌شوند.
   - راه تماس امنیتی.
3. **EULA / شرایط استفاده**.
4. **THIRD_PARTY_NOTICES**: مجوز Chromium/Electron/FFmpeg/Node و بسته‌های npm. فایل `LICENSES.chromium.html` از قبل در بیلد هست؛ یک فایل متنی جامع هم اضافه کنید.
5. **Trademark**: نام «MG Browser» و لوگو را از نظر تعارض علامت تجاری بررسی کنید. از نام/لوگوی Firefox، Google، Perplexity و... به‌صورت گمراه‌کننده استفاده نکنید.
6. **شرایط APIها**: endpointهای پیشنهاد جستجوی گوگل/Bing سرویس رسمی نیستند؛ برای انتشار عمومی یا از API رسمی استفاده کنید، یا پیشنهادها را غیرفعال/جایگزین کنید (ویکی‌پدیا و DuckDuckGo شرایط بهتری دارند).
7. **مجوز FFmpeg/کدک‌ها**: اگر کدک‌های اختصاصی (H.264/AAC) توزیع می‌کنید، وضعیت لایسنس MPEG-LA را بررسی کنید.

---

## ۵. ریسک‌های مخصوص مرورگر

### Google Account
گوگل ورود OAuth در WebViewهای تعبیه‌شده را با خطای `disallowed_useragent` مسدود می‌کند. تغییر User-Agent راه‌حل پایدار و رسمی نیست و ممکن است با شرایط گوگل سازگار نباشد. برای انتشار عمومی:
- ورود گوگل را «بهترین تلاش» معرفی کنید، نه قابلیت تضمینی؛
- یا OAuth استاندارد (loopback) پیاده کنید؛
- همیشه امکان تنظیم عکس پروفایل به‌صورت دستی را نگه دارید (در MG هست).

### Safe Browsing
Electron به‌صورت پیش‌فرض محافظت فیشینگ/بدافزار گوگل را ندارد. برای یک مرورگر عمومی این یک ریسک جدی است. گزینه‌ها:
- استفاده از APIهای reputation (تجاری)؛
- یا شفاف اعلام کنید که محافظت از فیشینگ وجود ندارد و کاربر باید احتیاط کند.

### حریم خصوصی و کوکی‌ها
مرورگر به کوکی‌های همه سایت‌ها دسترسی دارد؛ سیاست نگهداری و پاک‌سازی داده را مشخص کنید. در MG مسیر داده و رمزنگاری رمزها مستند شده است.

### به‌روزرسانی امنیتی
Chromium هر ۴ هفته وصله امنیتی می‌گیرد. یک مرورگر عمومی باید سریع آپدیت شود؛ نسخه Electron را ماهانه به‌روز و آپدیت خودکار را فعال کنید.

### محدودیت‌های فنی
افزونه‌های Chrome پشتیبانی نمی‌شوند؛ `chrome://` بومی نیست؛ این موارد را در صفحه دانلود شفاف بنویسید.

---

## ۶. استورها

### Microsoft Store
- حساب توسعه‌دهنده (۱۹ دلار یک‌بار).
- بسته **MSIX** بسازید (electron-builder از appx پشتیبانی می‌کند).
- استور خودش امضا می‌کند و آپدیت‌ها از استور می‌آیند (auto-update سفارشی را غیرفعال کنید).
- برای مرورگر، سیاست‌های امنیتی و به‌روزرسانی موتور را رعایت کنید.

### Mac App Store
- سخت‌گیرانه‌تر از DMG؛ سندباکس و entitlements خاص لازم است و برخی قابلیت‌های Chromium محدود می‌شوند.
- بسیاری از مرورگرها فقط DMG امضاشده منتشر می‌کنند. برای شروع، همین کافی است.

### Google Play
- ۲۵ دلار یک‌بار.
- مسیر ارزان: **TWA** از همان PWA؛ نیازمند Digital Asset Links و کیفیت سایت.
- سیاست «Minimum Functionality»: اپ‌هایی که فقط یک سایت را در WebView نشان می‌دهند رد می‌شوند. MG Mobile قابلیت‌های محلی (گاوصندوق، تب‌ها، تنظیمات) دارد اما برای Play بهتر است به‌عنوان «utility / privacy vault» معرفی شود، نه مرورگر کامل.

### App Store
- ۹۹ دلار/سال.
- قوانین 4.2 (حداقل عملکرد) و 4.7 (محتوای وب) سخت‌گیرانه‌اند؛ پوسته‌ی مرورگری که صفحات را به Safari می‌سپارد احتمال رد دارد.
- برای انتشار جدی در iOS، یک مرورگر WKWebView با قابلیت‌های بومی واقعی (بلاکر محتوا، حریم خصوصی، تب‌ها) لازم است.

---

## ۷. خط لوله انتشار (GitHub Actions)

نمونه‌ای که با تگ `v*` نسخه امضاشده می‌سازد و در GitHub Release منتشر می‌کند:

```yaml
name: Release
on:
  push:
    tags: ["v*"]

permissions:
  contents: write

jobs:
  release:
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: windows-latest
            script: dist:win
          - os: macos-latest
            script: dist:mac
          - os: ubuntu-latest
            script: dist:linux
    runs-on: ${{ matrix.os }}
    defaults:
      run:
        working-directory: app
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: app/package-lock.json
      - run: npm ci
      - run: npx electron-builder --${{ matrix.os == 'windows-latest' && 'win' || matrix.os == 'macos-latest' && 'mac' || 'linux' }} --publish always
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

> برای macOS باید `CSC_LINK` مخصوص مک و برای ویندوز گواهی ویندوز جداگانه در Secrets باشد. اگر از Azure Trusted Signing استفاده می‌کنید، مرحله امضا را با `azure/login` و `signtool` یا اسکریپت سفارشی پیاده کنید.

---

## ۸. هزینه و زمان (تخمین)

| مورد | هزینه | توضیح |
| --- | --- | --- |
| Azure Trusted Signing | ~۱۰ دلار/ماه | نیازمند بررسی صلاحیت |
| گواهی OV/EV | ۲۰۰–۷۰۰ دلار/سال | به‌همراه HSM ابری |
| Apple Developer | ۹۹ دلار/سال | برای مک |
| Google Play | ۲۵ دلار یک‌بار | برای اندروید |
| دامنه | ۱۰–۳۰ دلار/سال | مثلاً `mgbrowser.app` |
| هاست/CDN | ۰–۲۰ دلار/ماه | GitHub Pages/Cloudflare |
| **حداقل شروع (ویندوز + سایت)** | **~۱۵۰–۳۰۰ دلار سال اول** | با Azure + دامنه |
| **با مک** | **~۲۵۰–۴۰۰ دلار** | + Apple |

زمان‌بندی واقع‌بینانه: ۱–۲ هفته برای امضا/سایت/نصب‌کننده، ۱–۲ هفته برای بررسی استورها، و چند هفته برای ساخت شهرت SmartScreen.

---

## ۹. چک‌لیست انتشار

### فاز ۰ — آماده‌سازی (همین حالا)
- [ ] انتخاب نام/دامنه و بررسی علامت تجاری
- [ ] سیاست حریم خصوصی + EULA + صفحه تماس امنیتی
- [ ] `THIRD_PARTY_NOTICES` و بازبینی لایسنس کدک‌ها
- [ ] تست نسخه نهایی روی ویندوز ۱۰ و ۱۱
- [ ] حذف/غیرفعال‌کردن کدهای دمو و مسیرهای تست در بیلد نهایی
- [ ] تعیین نسخه ۱.۰.۰ و changelog

### فاز ۱ — ویندوز (بتای عمومی)
- [ ] گواهی/سرویس امضا
- [ ] ساخت NSIS امضاشده + ZIP
- [ ] GitHub Release + سایت دانلود
- [ ] auto-update با GitHub
- [ ] تست SmartScreen و نصب/حذف
- [ ] فرم بازخورد/باگ

### فاز ۲ — مک و لینوکس
- [ ] Apple Developer + notarization + staple
- [ ] DMG امضاشده
- [ ] AppImage/deb + SHA256 + GPG
- [ ] تست روی Intel و Apple Silicon

### فاز ۳ — موبایل و استورها
- [ ] PWA/TWA روی Play
- [ ] ارزیابی App Store یا ساخت مرورگر بومی WKWebView
- [ ] Microsoft Store MSIX

---

## ۱۰. مسیر پیشنهادی برای MG Browser

1. **ویندوز، بتای عمومی:** NSIS امضاشده + سایت + GitHub Release + آپدیت خودکار. این ۹۰٪ کاربران اولیه را پوشش می‌دهد.
2. **مک:** DMG notarized (بدون App Store).
3. **لینوکس:** AppImage/deb.
4. **موبایل:** PWA + TWA در Play؛ برای iOS ابتدا PWA، بعد در صورت نیاز مرورگر بومی.
5. **استورها:** Microsoft Store در اولویت، Mac App Store و App Store با احتیاط.

### کارهایی که می‌توان همین حالا در مخزن انجام داد
- افزودن `electron-updater` و صفحه «به‌روزرسانی»
- آماده‌سازی workflow امضا/انتشار با Secrets
- افزودن `THIRD_PARTY_NOTICES.md` و صفحه حریم خصوصی
- حذف کدهای تست/دمو از بیلد production
- افزودن crash reporting اختیاری (Sentry) و رضایت کاربر
- ثبت مرورگر به‌عنوان default browser در نصب‌کننده (اختیاری)
