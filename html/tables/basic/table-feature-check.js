// Check feature support for advanced table styling (CSS.supports and border-collapse)
(function checkTableFeatureSupport() {
  const fallback = document.querySelector('#table-fallback');
  const supportsTableFeatures =
    typeof window.CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('border-collapse', 'collapse');

  if (!supportsTableFeatures && fallback) {
    fallback.hidden = false;
  }
})();
