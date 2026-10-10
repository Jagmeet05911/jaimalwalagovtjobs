GOVT JOBS — STAGE 1 (Android-only setup)
=========================================

ਇਹ ਪਹਿਲਾ ਪੜਾਅ ਇੱਕ mobile-friendly PWA prototype ਹੈ। ਇਸ ਵਿੱਚ:
- ਪੰਜਾਬੀ + English toggle (ਕੁਝ ਲੇਬਲ)
- Jobs, Saved ਅਤੇ app ਦੇ ਅੰਦਰ Admin Panel
- ਨੌਕਰੀ Pending ਵਿੱਚ ਜੋੜਨਾ
- Approve / Reject / Unpublish / Delete
- Approved entries ਦੀ list
- ਮੌਜੂਦਾ browser ਦੇ localStorage ਵਿੱਚ data
- PWA manifest ਅਤੇ service worker

ਬਹੁਤ ਜ਼ਰੂਰੀ ਸੀਮਾਵਾਂ:
1. ਇਸ ZIP ਵਿੱਚ ਕੋਈ ਅਸਲੀ ਨੌਕਰੀ ਦਾ ਡਾਟਾ ਨਹੀਂ ਹੈ।
2. ਇਹ ਆਪਣੇ ਆਪ ਸਰਕਾਰੀ ਵੈੱਬਸਾਈਟਾਂ ਤੋਂ jobs ਨਹੀਂ ਲੱਭਦਾ।
3. Data ਸਿਰਫ਼ ਉਸੇ browser/device ਵਿੱਚ ਰਹਿੰਦਾ ਹੈ; ਹੋਰ ਮੋਬਾਈਲਾਂ ਨਾਲ sync ਨਹੀਂ ਹੁੰਦਾ।
4. ਇਹ secure admin login ਨਹੀਂ ਹੈ। PIN ਜਾਂ hidden tab security ਨਹੀਂ ਬਣਾਉਂਦੇ।
5. ਇਹ APK ਨਹੀਂ ਹੈ; ਇਹ installable web app/PWA prototype ਹੈ।
6. Public users ਲਈ live launch ਤੋਂ ਪਹਿਲਾਂ Firebase/cloud database, real admin authentication, audit trail ਅਤੇ tested official-source ingestion ਜੋੜੋ।
7. ਕਿਸੇ ਨੌਕਰੀ ਨੂੰ publish ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ official notice, age, eligibility, fee, deadline ਅਤੇ apply link verify ਕਰੋ।

Android ਮੋਬਾਈਲ ਤੋਂ GitHub Pages 'ਤੇ ਲਗਾਉਣ ਦੇ ਕਦਮ:
A. Chrome ਵਿੱਚ https://github.com ਖੋਲ੍ਹੋ ਅਤੇ sign in/create account ਕਰੋ।
B. + ਜਾਂ New repository ਦਬਾਓ। Repository name: govt-jobs-stage1 ਰੱਖੋ।
C. Repository ਨੂੰ Public ਚੁਣੋ (GitHub Pages ਲਈ ਸੌਖਾ ਰਾਹ), README add ਕਰ ਸਕਦੇ ਹੋ, ਫਿਰ Create repository।
D. Repository ਵਿੱਚ Add file > Upload files ਚੁਣੋ।
E. ZIP ਨੂੰ ਪਹਿਲਾਂ ਆਪਣੇ ਮੋਬਾਈਲ ਵਿੱਚ extract ਕਰੋ। ਅੰਦਰਲੇ FILES (index.html, style.css, app.js, manifest.json, sw.js, README_PA.txt) upload ਕਰੋ — ZIP ਫਾਈਲ ਇਕੱਲੀ upload ਨਾ ਕਰੋ।
F. Commit changes ਕਰੋ।
G. Repository Settings > Pages ਖੋਲ੍ਹੋ।
H. Build and deployment ਵਿੱਚ Deploy from a branch ਚੁਣੋ; Branch: main ਅਤੇ folder: /(root) ਚੁਣੋ; Save ਕਰੋ।
I. ਕੁਝ ਮਿੰਟ ਬਾਅਦ Pages ਵਾਲਾ URL ਖੋਲ੍ਹੋ। URL https:// ਨਾਲ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।
J. Android Chrome ਵਿੱਚ ⋮ > Add to Home screen ਜਾਂ Install app ਚੁਣੋ। ਜੇ Install app ਨਾ ਆਵੇ ਤਾਂ Add to Home screen ਵਰਤੋ।
K. Admin Panel ਖੋਲ੍ਹ ਕੇ ਪਹਿਲਾਂ ਸਿਰਫ਼ TEST ENTRY checkbox ਨਾਲ ਟੈਸਟ ਕਰੋ। Publish ਕਰਕੇ ਵੇਖੋ; ਫਿਰ Unpublish/Delete ਕਰੋ।

ZIP upload ਲਈ:
- ZIP ਨੂੰ Files app ਵਿੱਚ extract ਕਰੋ।
- Extract ਹੋਈ folder ਵਿੱਚੋਂ ਸਾਰੀਆਂ ਪੰਜ app files ਚੁਣ ਕੇ GitHub Upload files ਵਿੱਚ upload ਕਰੋ।
- ਜੇ GitHub mobile interface ਵਿੱਚ upload ਔਖਾ ਹੋਵੇ ਤਾਂ Chrome menu > Desktop site ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰੋ।

ਅਗਲਾ production ਪੜਾਅ (ਹਾਲੇ ਇਸ prototype ਵਿੱਚ ਸ਼ਾਮਲ ਨਹੀਂ):
- Firebase Authentication ਨਾਲ ਸਿਰਫ਼ owner admin login
- Firestore cloud database ਅਤੇ rules
- Admin approval status server-side ਲਾਗੂ ਕਰਨਾ
- Scheduled official-source checker (GitHub Actions)
- Push notifications (Firebase Cloud Messaging)
- Duplicate detection, expiry handling, source links ਅਤੇ audit logs

Zero-budget ਨੋਟ:
GitHub Pages ਅਤੇ Firebase ਦੇ free tiers ਨਾਲ prototype ਸ਼ੁਰੂ ਹੋ ਸਕਦਾ ਹੈ, ਪਰ quotas/terms ਬਦਲ ਸਕਦੇ ਹਨ। Free tier ਦੀ ਹੱਦ ਤੋਂ ਵੱਧ ਵਰਤੋਂ 'ਤੇ ਖਰਚਾ ਹੋ ਸਕਦਾ ਹੈ। Cloud Functions ਵਰਗੀਆਂ ਸੇਵਾਵਾਂ ਲਈ billing ਦੀ ਲੋੜ ਪੈ ਸਕਦੀ ਹੈ; production setup ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ pricing/settings ਚੈੱਕ ਕਰੋ। Play Store 'ਤੇ publish ਕਰਨਾ ਵੱਖਰੀ ਪ੍ਰਕਿਰਿਆ ਹੈ ਅਤੇ developer registration fee ਲੱਗ ਸਕਦੀ ਹੈ।
