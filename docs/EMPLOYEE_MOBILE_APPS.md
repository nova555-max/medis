# Employee mobile app (Expo) — Android APK + iPhone

تەنها بۆ بەشی **کارمەند** (`apps/mobile`). ئەدمین هەر لە وێبەوە کار دەکات.

## ١) ئێستا (بەبێ APK) — وێبی مۆبایل

لە مۆبایلەوە ئەم لینکە بکەرەوە:

`https://mediaoff.netlify.app/employee/login`

ئەمە تەنها بۆ کارمەندە و لە کۆمپیوتەر دادەخرێت.

---

## ٢) Android APK دروستکردن

لە فۆڵدەری `apps/mobile`:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

دوای تەواوبوون، Expo لینکی داگرتنی `.apk` دەداتێت.

### دانانی لینک لە سایت

لە Netlify → Environment variables:

```
NEXT_PUBLIC_EMPLOYEE_ANDROID_APK_URL=https://....apk
```

یان فایلی APK بخە سەر Netlify/Storage و لینکەکەی لێرە دابنێ.

پاشان Redeploy بکە. دوگمەی **Android — داگرتنی APK** لە `/employee/login` دەردەکەوێت.

---

## ٣) iPhone

بۆ App Store پێویستە:

1. هەژماری Apple Developer (~٩٩$/ساڵ)
2. بونیادنان:

```bash
eas build -p ios --profile production
eas submit -p ios
```

یان بۆ تاقیکردنەوە: **TestFlight** لینک.

لە Netlify:

```
NEXT_PUBLIC_EMPLOYEE_IOS_URL=https://apps.apple.com/... یان TestFlight link
```

بەبێ App Store، کارمەندی ئایفۆن دەتوانێت **وێبی مۆبایل** بەکاربهێنێت (`/employee/login`).

---

## ٤) تاقیکردنەوەی خێرا بە Expo Go (گەشەپێدان)

```bash
cd apps/mobile
npx expo start
```

QR سکان بکە لە ئەپی Expo Go. لینکی پرۆژە (ئارەزوومەندانە):

```
NEXT_PUBLIC_EMPLOYEE_EXPO_URL=https://expo.dev/...
```

---

## تێبینی

| بەش | چۆن |
|-----|-----|
| ئەدمین | وێب `/login` لە کۆمپیوتەر |
| کارمەند | وێبی مۆبایل یان APK/iOS ئەپ |
