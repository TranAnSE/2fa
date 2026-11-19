# UI/UX Team Audit — Báo cáo tổng hợp (17/11/2026)

> Đánh giá độc lập bởi đội 4 senior frontend reviewers chạy song song, mỗi người một khía cạnh, bắt buộc áp dụng skill làm khung chấm điểm: `ak-ui-ux-pro-max` (priority rubric 1→10), `ak-enhance-ux-ax` (UX rubric), `ak-design-system` (token architecture), `ak-frontend-design` (UX audit workflow + polish standards). Bằng chứng: 13 ảnh walkthrough thật (desktop 1440 + mobile 390, EN/VI, dark/light) tại `.qa/ui-audit/shots/`, axe-core 4.10.2 scan 5 states × 2 color schemes, keyboard walkthrough, responsive sweep 6 widths, extension popup chạy thật, probe contrast oklch→sRGB tự viết.

- Báo cáo gốc (tiếng Việt, đầy đủ file:line + evidence):
  - `.qa/ui-audit/reports/design-craft.md` — Design system & visual craft
  - `.qa/ui-audit/reports/ux-flows.md` — UX flows & usability
  - `.qa/ui-audit/reports/a11y-i18n.md` — Accessibility & i18n
  - `.qa/ui-audit/reports/surfaces-responsive.md` — Responsive, extension popup, PWA
- Quan sát orchestrator: `.qa/ui-audit/OBSERVATIONS.md`

---

## 1. Điểm tổng hợp theo trục

| Trục | Điểm /10 | Người chấm | Nhận định ngắn |
|---|---|---|---|
| Dark mode quality | **8.5** | design-craft | Điểm mạnh nổi bật nhất: privacy blur, screenshot-safe, scrim, reduced-motion, parity thật |
| Keyboard support | **8.5** | a11y-i18n | Native `<dialog>` chuẩn sách giáo khoa: focus trap, ESC, focus return 4/4 dialog |
| i18n EN | **9.5** | a11y-i18n | Catalog 484 keys, 0 thiếu |
| i18n VI | **8.5** | a11y-i18n | Đầy đủ key nhưng render bằng fallback font (xem P1-2) |
| Feedback & states | **7** | ux-flows | Toast + nudge tốt; nhưng Copy ẩn theo hover là thiếu sót lớn |
| WCAG compliance | **7** | a11y-i18n | Dark: 0 violation. Light: hụt AA biên giới do 1 token |
| IA / Information architecture | **6** | ux-flows | 3 trạng thái rỗng dùng chung 1 template gây nhầm lẫn |
| Task efficiency (copy-OTP) | **6** | ux-flows | Hành động số 1 của sản phẩm bị che + cần quá nhiều thao tác ở popup |
| Mobile experience | **6** | surfaces | Không gãy, nhưng action row 9 nút wrap vụng, target 36px |
| **Design system tổng** | **6.4** | design-craft | Kỷ luật token xuất sắc, thiếu icon system + type system VI |
| Tablet/large desktop | **7** | surfaces | Không có tablet layout riêng (768 dùng layout phone) |
| Cross-surface consistency | **6.5** | surfaces | Màu/radius/motion khớp 100%; drift font/type-scale/spacing/button-class |
| PWA experience | **6.5** | surfaces | Cache-first stale risk có thật (tự chứng minh trong đợt audit) |
| Extension popup | **5** | surfaces | Điểm yếu nhất: copy mã phải cuộn ~2.7 viewport |
| Trust & security perception | **6** | ux-flows | Mất data âm thầm ở session mode là vết nút tin cậy lớn nhất |
| Onboarding | **5** | ux-flows | Trạng thái khóa vẫn hiện onboarding "thêm entry đầu tiên" |
| Iconography | **3.5** | design-craft | Không có icon system — unicode glyph (⚙ ◷ ✕ ⠿), nguy cơ emoji-presentation |
| Screen-reader support | **6** | a11y-i18n | `aria-live` bao cả danh sách + tick 1 giây/lần → SR chatter liên tục |

**Điểm mạnh đồng thuận của cả 4 reviewer:** kỷ luật màu (0 hard-coded hex trong 2 stylesheet, 26 semantic tokens oklch), destructive-action safety (remove/undo là mẫu chuẩn: confirm gọi tên entry, undo 10s, Cancel primary, tombstone sống sót qua reload), flow encrypt→lock→unlock nguyên vẹn có backoff, không gãy layout ở bất kỳ width nào.

---

## 2. Backlog ưu tiên (gộp & đối chiếu chéo 4 báo cáo)

### P0 — sửa ngay (2 mục, consensus 3/4 team)

| # | Finding | Evidence | Xác nhận bởi |
|---|---|---|---|
| **P0-1** | **Banner "No vault export in over 30 days" (`position:fixed`, top 72px, z-index 55) đè lên và chặn click chip PINNED + Sort/Group ở desktop (≥1024px). Chỉ mobile mới có fix spacing.** | `styles.css:1091`; ảnh `03`, `04`, `13`; probe giao nhau banner×listbar | design-craft (P0), ux-flows (P0), surfaces (P1) |
| **P0-2** | **Session mode xóa sạch entry khi reload mà không một lời cảnh báo** — empty state hiển thị vui vẻ "Vault ready for the first import" sau khi người dùng vừa mất data (tái hiện: thêm 4 entry → reload → 0). Với app 2FA, mất secret = đăng ký lại 2FA từng dịch vụ. | `app.js:189` (`persist: false`); log walkthrough ux-flows; OBS #1 | ux-flows (P0) |

### P1 — quan trọng (7 mục)

| # | Finding | Evidence |
|---|---|---|
| **P1-1** | **Nút Copy — hành động số 1 của sản phẩm — `opacity: 0`, chỉ hiện khi hover; mã OTP là `<p>` không click được; không có hotkey copy.** | `styles.css:923-934` (đo opacity=0), ux-flows |
| **P1-2** | **Font thương hiệu Space Grotesk (latin subset, 230 cmap entries) thiếu 53/59 ký tự tiếng Việt → toàn bộ UI tiếng Việt render bằng Segoe UI fallback.** Sản phẩm dual-language nhưng VI không được thiết kế typography. | `fonts/space-grotesk-latin.woff2` (fontTools verify); ảnh `08` |
| **P1-3** | **Light-mode primary button contrast 4.44:1 < 4.5:1 WCAG AA** (toàn bộ nút `.btn.primary`). Một token sửa hết: `--accent` light `#c75015`. | axe violation mọi state light + probe oklch→sRGB, a11y-i18n |
| **P1-4** | **Stale service-worker cache là rủi ro đã hiện thực:** `sw.js:50` trả cached `styles.css` vô điều hạn, release rule chỉ bắt bump CACHE_NAME khi `app.bundle.js` đổi. (Shot `02` của orchestrator chụp được Add-sheet vỡ từ CSS cũ — chính là kịch bản này.) | `sw.js:50`, AGENTS.md release rule, design-craft P1-4 |
| **P1-5** | **Extension popup IA ngược ưu tiên:** OTP nằm ở y≈1084 trong popup cao 600px, sau Add form (394px mở mặc định) — "copy mã nhanh" phải cuộn ~2.7 viewport. | surfaces, ảnh popup populated |
| **P1-6** | **Vault đang khóa vẫn hiển thị onboarding "Add your first entry" + ACCOUNTS 0** — 3 trạng thái rỗng (empty/no-match/locked) dùng chung `showEmptyState()` (`app.js:1063-1091`); `openAddDialog` (`app.js:1053`) không guard locked. | ux-flows + design-craft độc lập cùng phát hiện |
| **P1-7** | **`<html lang>` không bao giờ cập nhật khi đổi ngôn ngữ** (WCAG 3.1.1 fail, xác minh live) + ~17 chỗ hard-code bypass key i18n có sẵn (`app.js:1548`, `app.js:2878`, `popup.js:910`) + **bug thật:** `popup.js:1404` so sánh `startsWith("Too many failed attempts")` theo chuỗi EN → status throttle không tự xóa ở VI. | a11y-i18n |

### P2 — nên sửa trong chu kỳ tới (chọn lọc)

- **`app.bundle.js` 615KB chưa minify** — `scripts/build.mjs` thiếu `minify: true` (JS thô + jsqr nguyên bản). Một dòng config.
- **`aria-live="polite"` bao cả `#entries`** + timer tick mỗi giây → screen reader đọc lại cả danh sách liên tục. Scope live-region vào toast + mã copy.
- **Mobile action row 9 nút wrap 2 hàng** (Up/Down rơi riêng, Remove cô isolated; target 36px < 44px coarse). Gom vào overflow menu / swipe actions.
- **Popup card identity trôi** — `.entry-top` space-between + drag-handle ẩn khi sort A-Z khiến khối tên lơ lửng giữa card, nhảy layout theo sort mode.
- **`aria-prohibited-attr`** trên `.topbar-timer` (div generic có aria-label) — violation axe thật.
- **3 giá trị "dark" khác nhau:** manifest `#0b1220` vs meta theme-color `#1b1d21` vs nền app ấm — đồng bộ về 1 token.
- **Phím tắt "n" hỏng** khi focus trong input + shortcut không có chỗ nào discoverable.
- **Install App dead-end** — feedback ghi vào sheet đã đóng.
- Extension `#period`, `#counter` không có nhãn; radiogroup `.add-tabs` aria-label cứng EN.
- Vault khóa mở được add-dialog với Secret disabled không giải thích tại sao.

### P3 — polish

- Không có icon system — thay unicode glyph (⚙ ◷ ✕ ⠿ x) bằng SVG set thống nhất, chốt `currentColor` + stroke width.
- Table/large-desktop: thêm tablet breakpoint riêng (hiện 768 dùng nguyên layout phone).
- `.primary-btn` vs `.btn.primary` — hai hệ class nút song song giữa popup và root.

---

## 3. Mâu thuẫn giữa các report — đã đối chiếu xong

1. **"Tab Manual dọc ở 1440px" (OBS #3):** orchestrator chụp được (shot `02`) nhưng design-craft + surfaces đều thấy tab ngang chuẩn trong code/ảnh fresh-context. **Kết luận:** shot `02` là bằng chứng sống của P1-4 — browser của orchestrator nhận CSS stale từ service worker cache trong khi code hiện tại đã đúng. Không cần fix layout; cần fix cache strategy (P1-4).
2. **"Language áp dụng ngay khi đổi" (OBS #5):** hai team độc lập xác minh code chỉ áp locale trong `handleSaveSettings` — orchestrator thực ra đã click Save trong cùng thao tác. Trạng thái lẫn ngôn ngữ (htmlLang=en + UI VI) giải thích bởi P1-7: `html lang` không bao giờ được cập nhật.
3. **Banner đè toolbar:** 3/4 team phát hiện độc lập với cùng vị trí file:line — xếp P0-1 không có tranh cãi.

---

## 4. Quick wins (≤ 30 phút mỗi mục, chọn 5 tác động cao nhất)

1. **Fix banner đè toolbar (P0-1):** đổi `.data-banner` từ `fixed` sang trong-flow / kéo xuống dưới listbar ở desktop (mirror fix mobile `styles.css:1616`).
2. **Một token hết violation AA (P1-3):** darkened `--accent` light lên ≥4.5:1 (axe hiện cảnh báo duy nhất của light palette).
3. **3 dòng `document.documentElement.lang` trong `applyLocale()` (P1-7)** — khép WCAG 3.1.1.
4. **`minify: true` trong `scripts/build.mjs`** — 615KB → dự kiến ~200-300KB, cải thiện first-load PWA.
5. **Session-mode cảnh báo mất data (P0-2, nửa đầu):** 1 dòng banner/inline notice "Mã chỉ tồn tại trong phiên này — bật Remember trên thiết bị để giữ" đặt cạnh empty state + badge Session (bản dịch đã có sẵn trong catalog, thêm key nếu thiếu).

## 5. Hướng chiến lược 6 tháng (đồng thuận của đội)

1. **Shared tokens package thật sự:** 1 file token chung (root + popup import), diệt `--s8` 32px vs 48px trùng tên, thống nhất 1 hệ class nút. Màu/radius/motion hiện đã khớp 100% — phần còn lại là cơ chế, không phải redesign.
2. **Vietnamese-first type system + visual QA vào CI:** font latin-ext/VI subset cho Space Grotesk; chụp sweep responsive + axe vào CI (mô hình đã chạy trong đợt audit này có thể tái dùng thành script `npm run qa:ui`).
3. **Copy-OTP làm trung tâm tương tác:** mã OTP click-to-copy toàn card, hotkey (1-9 per row), popup đảo thứ tự (mã lên trên, Add gập), Copy không còn phụ thuộc hover.

---

## 6. Kho evidence

- Ảnh walkthrough: `.qa/ui-audit/shots/` (13 ảnh, EN/VI, dark/light, desktop/mobile)
- Screenshot + script của từng team: `.qa/ui-audit/work/{design-craft,ux-flows,a11y-i18n,surfaces-responsive}/` (ux-flows có 24 ảnh + `walkthrough-log.json`; surfaces có 33 ảnh + metrics; a11y có `axe-results.json`, `keyboard-findings.json`, `i18n-audit.json`)
- App đang chạy: [http://127.0.0.1:4173](http://127.0.0.1:4173) (`npm run serve:test`, background)
