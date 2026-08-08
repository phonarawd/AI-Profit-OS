# Website Footer — DET License (Pre-Owned Watches L.L.C)

> **SSOT:** Launch plan **§50.9** (`schemas/operator-entity.v1.json` + `T.operator.footer.line` for AI Profit OS ko)  
> This file is the **English WordPress variant** for [preownedwatches.ae](https://preownedwatches.ae) only. License number and legal name must match §50.9.

Copy-paste into WordPress footer widget, theme footer, or site builder.

---

## English (recommended)

```
Licensed by the Dubai Department of Economy and Tourism (DET) | Trade License No. 1135431 | PRE-OWNED WATCHES L.L.C
```

---

## HTML (with optional DET link)

```html
<p class="site-footer-license">
  Licensed by the
  <a href="https://www.investindubai.gov.ae/en/" target="_blank" rel="noopener noreferrer">
    Dubai Department of Economy and Tourism (DET)
  </a>
  &nbsp;|&nbsp; Trade License No. <strong>1135431</strong>
  &nbsp;|&nbsp; <strong>PRE-OWNED WATCHES L.L.C</strong>
</p>
```

---

## Compact (mobile-friendly)

```html
<p class="site-footer-license">
  DET Licensed · No. 1135431 · PRE-OWNED WATCHES L.L.C
</p>
```

---

## With copyright line (matches preownedwatches.ae style)

```html
<p class="site-footer-license">
  Licensed by DET | Trade License No. 1135431 | PRE-OWNED WATCHES L.L.C
</p>
<p class="site-footer-copy">
  © Copyright Pre-Owned Watches 2026. All rights reserved.
</p>
```

---

## Arabic + English (optional, Dubai sites)

```html
<p class="site-footer-license" dir="ltr">
  Licensed by DET | Trade License No. 1135431 | PRE-OWNED WATCHES L.L.C<br />
  <span dir="rtl" lang="ar">مرخصة من دائرة الاقتصاد والسياحة في دبي | رقم الرخصة 1135431</span>
</p>
```

---

## Minimal CSS (optional)

```css
.site-footer-license {
  font-size: 0.75rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.65);
  text-align: center;
  margin: 0.75rem 0 0;
}

.site-footer-license a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.site-footer-license a:hover {
  color: rgba(255, 255, 255, 0.9);
}
```

---

## WordPress

1. **Appearance → Widgets → Footer** (or Theme Footer / Elementor Footer)
2. Add **Custom HTML** block
3. Paste the **HTML (with optional DET link)** block above
4. Save

---

## Disclaimer (do not show in footer — internal only)

Footer text must match the **official Trade License PDF**. If the legal name or number on the certificate differs, update before publishing.
