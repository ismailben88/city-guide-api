/**
 * Vercel Speed Insights Utility
 * 
 * This module provides Speed Insights tracking capabilities for the Express API.
 * Speed Insights tracks client-side Web Vitals (LCP, FID, CLS, etc.) when serving HTML content.
 * 
 * For more information: https://vercel.com/docs/speed-insights
 */

/**
 * Get the Speed Insights script tag for injection into HTML responses
 * 
 * @returns {string} HTML script tag for Speed Insights
 */
function getSpeedInsightsScript() {
  // Only inject in production when deployed on Vercel
  if (!process.env.VERCEL || process.env.NODE_ENV !== 'production') {
    return '';
  }

  // Using the generic/vanilla approach for Speed Insights
  // This script will automatically track Web Vitals when the page loads
  return `
    <script>
      window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
    </script>
    <script defer src="/_vercel/speed-insights/script.js"></script>
  `;
}

/**
 * Middleware to inject Speed Insights into HTML responses
 * 
 * Usage: app.use(injectSpeedInsights);
 */
function injectSpeedInsights(req, res, next) {
  const originalSend = res.send;

  res.send = function (data) {
    // Only inject if response is HTML
    const contentType = res.get('Content-Type') || '';
    if (contentType.includes('text/html') && typeof data === 'string') {
      const script = getSpeedInsightsScript();
      if (script) {
        // Inject before closing </body> tag, or at the end if no </body>
        if (data.includes('</body>')) {
          data = data.replace('</body>', `${script}</body>`);
        } else if (data.includes('</html>')) {
          data = data.replace('</html>', `${script}</html>`);
        } else {
          data += script;
        }
      }
    }

    return originalSend.call(this, data);
  };

  next();
}

module.exports = {
  getSpeedInsightsScript,
  injectSpeedInsights,
};
