/** @type {import('next').NextConfig} */
const nextConfig = {
  // Não anunciar o framework.
  poweredByHeader: false,

  experimental: {
    // `pdf-parse` é carregado com require() numa rota Node; sem isto o webpack
    // tenta empacotar os ficheiros de teste do pacote e o build falha com
    // ENOENT .../test/data/05-versions-space.pdf.
    serverComponentsExternalPackages: ["pdf-parse"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Impede que a aplicação seja embutida em iframes de terceiros.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), payment=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // CSP pragmática: permite o que a aplicação já usa hoje (Supabase,
            // Cerebras, cdnjs para o pdf.js, Google Fonts). Sem `unsafe-eval`.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://js.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cerebras.ai https://api.stripe.com https://open.er-api.com https://cdnjs.cloudflare.com",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
