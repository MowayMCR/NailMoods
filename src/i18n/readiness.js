// All locales remain blocked for EU 1.0. Dictionary parity is not journey/legal approval.
// No store or production activation reads this preparatory manifest.
export const releaseReadiness = Object.freeze(Object.fromEntries(
  ['fr','en','es','de','it','nl'].map(locale => [locale, Object.freeze({
    interfaceReviewed: false,
    legalReviewed: false,
    nativePurchasesVerified: false,
    tabletLayoutVerified: false,
    commercialReady: false,
  })]),
));
