/** @type {import('next').NextConfig} */
export default {
  // The worker reads these at runtime, so they must ship with the function bundle.
  outputFileTracingIncludes: {
    "/api/run": ["./src/tools/website/collect/*.browser.js", "./src/render/template.html", "./node_modules/axe-core/axe.min.js", "./node_modules/@sparticuz/chromium/bin/**"],
    "/r/[token]": ["./src/render/template.html"],
  },
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};
