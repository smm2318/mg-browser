# امضای کد و حذف هشدار SmartScreen

این سند برای وقتی است که درخواست امضا (SignPath / Certum / Azure / استور) ثبت شده و منتظر تأیید یا در حال اتصال به CI هستید.

---

## ۱. کدام سرویس را انتخاب کردید؟

### الف) SignPath Foundation — رایگان برای متن‌باز

مناسب پروژه‌های OSI-approved مثل MG Browser (MIT). گواهی **EV** در HSM آن‌ها نگه‌داری می‌شود؛ کلید خصوصی به شما داده نمی‌شود.

**آن‌چه SignPath معمولاً می‌خواهد:**
- مخزن عمومی GitHub با لایسنس معتبر (LICENSE)
- README و دستور ساخت قابل تکرار
- توضیح پروژه و کاربرد آن
- هویت فرد/سازمان و تأیید مالکیت دامنه/ایمیل
- بیلد از طریق GitHub Actions (نه فایل دستی)

**بعد از تأیید:** یک پروژه و «Signing Policy» می‌سازند و این مقادیر را می‌دهند:
`organization-id`, `project-slug`, `signing-policy-slug`, `artifact-configuration-slug` و یک API Token.

سپس در GitHub Secrets:

| Secret | مقدار |
| --- | --- |
| `SIGNPATH_API_TOKEN` | توکن API |
| `SIGNPATH_ORGANIZATION_ID` | شناسه سازمان |
| `SIGNPATH_PROJECT_SLUG` | نام پروژه |
| `SIGNPATH_POLICY_SLUG` | سیاست امضا |
| `SIGNPATH_ARTIFACT_CONFIG` | تنظیمات آرتیفکت |

جریان کار: بیلد بدون امضا → آپلود آرتیفکت → `signpath/github-action-submit-signing-request` → دریافت فایل امضاشده → انتشار. (نسخه دقیق action را از داشبورد SignPath بگیرید؛ نام پارامترها ممکن است تغییر کند.)

> مزیت: EV + عدم نگهداری کلید خصوصی. معایب: وابستگی به تأیید و زمان بررسی.

### ب) Certum Open Source Code Signing — رایگان برای OSS

- ثبت‌نام در Certum، ارسال مدارک هویتی، لینک مخزن و توضیح پروژه.
- امضا از طریق **SimplySign** (Cloud HSM) انجام می‌شود.
- در CI معمولاً نیاز به نصب SimplySign Desktop/CLI و ورود با توکن نرم‌افزاری است؛ برای GitHub Actions باید از سرویس cloud signing آن‌ها استفاده کنید.
- گواهی معمولاً یک‌ساله و قابل تمدید است.

### ج) Azure Trusted Signing

- حدود ۱۰ دلار در ماه، بدون توکن سخت‌افزاری.
- نیازمند حساب Azure، احراز هویت و بررسی صلاحیت (سازمان/فرد).
- در electron-builder نسخه‌های جدید از `win.azureSignOptions` پشتیبانی می‌شود؛ یا با یک `sign` سفارشی `signtool` را با پروفایل Azure صدا بزنید.
- برای CI از `azure/login` و سرویس‌پرینسیپال استفاده کنید.

### د) گواهی تجاری OV/EV

- از DigiCert / Sectigo / SSL.com با Cloud HSM.
- فایل PFX معمولاً به‌صورت base64 در `WIN_CSC_LINK` قرار می‌گیرد.
- برای امضای محلی: `CSC_LINK` + `CSC_KEY_PASSWORD`.

### ه) Microsoft Store (بدون امضای شخصی)

- حساب Partner Center (۱۹ دلار یک‌بار).
- بسته **MSIX** بسازید؛ استور خودش بسته را امضا می‌کند.
- کاربرانی که از Store نصب می‌کنند هشدار SmartScreen نمی‌بینند.
- آپدیت‌ها از Store می‌آیند؛ auto-update سفارشی را غیرفعال کنید.
- برای انتشار خارج از Store، همچنان به امضا نیاز دارید.

---

## ۲. آماده‌سازی مخزن (قبل از تأیید)

- [ ] مخزن عمومی GitHub با `LICENSE` (MIT)
- [ ] README کامل و دستور بیلد
- [ ] `.github/workflows/build.yml` (ساخت هر سه پلتفرم)
- [ ] `.github/workflows/release.yml` (ساخت و انتشار با تگ)
- [ ] `THIRD_PARTY_NOTICES.md`
- [ ] سیاست حریم خصوصی (لینک عمومی)
- [ ] نسخه‌گذاری با تگ (`v1.0.0`)
- [ ] حذف کدهای تست/دمو از بیلد production

---

## ۳. اتصال به GitHub Actions

### PFX (OV یا Mac)

```yaml
env:
  CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
  CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
```

برای مک:

```yaml
env:
  CSC_LINK: ${{ secrets.MAC_CSC_LINK }}
  CSC_KEY_PASSWORD: ${{ secrets.MAC_CSC_KEY_PASSWORD }}
  APPLE_ID: ${{ secrets.APPLE_ID }}
  APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
  APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

`release.yml` این متغیرها را از قبل می‌خواند؛ کافی است Secrets را پر کنید.

### Azure Trusted Signing

مراحل کلی:

1. ساخت Trusted Signing Account و Certificate Profile در Azure.
2. ثبت اپلیکیشن و دادن نقش `Trusted Signing Certificate Profile Signer` به سرویس‌پرینسیپال.
3. در مرحله بیلد، `signtool` را با endpoint و پروفایل صدا بزنید؛ یا `win.azureSignOptions` را در `app/package.json` تنظیم کنید.
4. بررسی خروجی با `signtool verify /pa /v`.

### SignPath

از action رسمی SignPath پس از بیلد استفاده کنید. خروجی امضاشده را جای فایل خام در Release بگذارید. اگر action را از داشبوردشان کپی کنید، پارامترها دقیقاً مطابق پروژه شما خواهد بود.

---

## ۴. بررسی نهایی امضا

### ویندوز

```powershell
Get-AuthenticodeSignature .\MG-Browser.exe | Format-List Status, StatusMessage, SignerCertificate
signtool verify /pa /v .\MG-Browser.exe
```

باید `Status: Valid` باشد و نام شما/سازمان به‌عنوان Signer دیده شود.

### مک

```bash
codesign --verify --deep --strict --verbose=2 "MG Browser.app"
spctl -a -vvv -t install "MG-Browser.dmg"
xcrun notarytool submit "MG-Browser.dmg" --keychain-profile "mg-notary" --wait
xcrun stapler staple "MG-Browser.dmg"
```

### لینوکس

```bash
sha256sum MG-Browser-*.AppImage MG-Browser-*.deb > SHA256SUMS
gpg --detach-sign --armor SHA256SUMS
```

---

## ۵. SmartScreen بعد از امضا

- **EV / SignPath / Azure Trusted Signing:** معمولاً اعتماد سریع‌تر؛ اما همچنان ممکن است چند روز طول بکشد.
- **OV:** شهرت به‌تدریج ساخته می‌شود؛ ممکن است تا چند هفته برای کاربران جدید هشدار بماند.
- دانلود زیاد و نصب موفق، شهرت را سریع‌تر می‌کند.
- هرگز برای «حذف هشدار» SmartScreen را در سیستم کاربران غیرفعال نکنید.

---

## ۶. اگر فعلاً منتظر تأیید هستید

- برای تست خودتان: `Unblock-MG-Browser.ps1` یا `Get-ChildItem -Recurse | Unblock-File`.
- برای بتای محدود: همان ZIP را با توضیح «برنامه امضانشده است» منتشر کنید.
- برای انتشار عمومی بدون هشدار: تا امضا صبر کنید یا از Microsoft Store استفاده کنید.
- **Self-signed certificate نگیرید**؛ هشدار را حذف نمی‌کند و اعتماد را بدتر می‌کند.
