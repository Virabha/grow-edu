/**
 * Every settings screen reads and writes one group of this bag.
 *
 * The SkillGro documentation lists ~20 settings pages that are all the same
 * shape — a form that loads a group of keys and saves them back — so they share
 * one store and one pair of endpoints (`GET/PUT /settings/:group`) rather than
 * twenty bespoke ones.
 */

export type SettingsGroup =
  | "general"
  | "logo"
  | "seo"
  | "email"
  | "sms"
  | "cookie"
  | "breadcrumb"
  | "maintenance"
  | "commission"
  | "recaptcha"
  | "analytics"
  | "gtm"
  | "gtm-data-layer"
  | "facebook-pixel"
  | "social-login"
  | "tawk"
  | "theme-colour"
  | "footer"
  | "google-map"
  | "payment-gateway"
  | "zoom"
  | "jitsi";

export type SettingsValue = string | number | boolean;

export const DEFAULT_SETTINGS: Record<SettingsGroup, Record<string, SettingsValue>> = {
  general: {
    siteName: "grotutor",
    tagline: "Online Learning Platform",
    supportEmail: "contact@grotutor.com",
    supportPhone: "+91-6309046611",
    address: "House No# 2-13-58, Uppal, Hyderabad, Telangana, 500039",
    copyright: "© 2026 grotutor. All rights reserved.",
    timezone: "Asia/Kolkata",
    dateFormat: "d MMM yyyy",
    defaultCurrency: "INR",
    registrationOpen: true,
    instructorApplicationsOpen: true,
    emailVerificationRequired: true,
  },
  logo: {
    logoUrl: "/logo.png",
    logoWithNameUrl: "/logo-with-name.png",
    faviconUrl: "/favicon.ico",
    appleTouchIconUrl: "/apple-touch-icon.png",
    ogImageUrl: "/og-image.png",
  },
  seo: {
    metaTitle: "grotutor — Online Learning Platform",
    metaDescription:
      "Expert-led courses across competitive exams, professional skills and academics. 50,000+ active learners.",
    metaKeywords: "online courses, upsc, jee, data analytics, spoken english",
    canonicalUrl: "https://grotutor.com",
    robots: "index, follow",
    sitemapEnabled: true,
    structuredDataEnabled: true,
  },
  email: {
    provider: "sendgrid",
    fromName: "grotutor",
    fromAddress: "noreply@grotutor.com",
    apiKey: "",
    smtpHost: "",
    smtpPort: 587,
    smtpEncryption: "tls",
    enabled: true,
  },
  sms: {
    provider: "msg91",
    senderId: "GROTUT",
    apiKey: "",
    otpTemplateId: "",
    enabled: false,
  },
  cookie: {
    enabled: true,
    message:
      "We use cookies to keep you signed in and to understand which lessons work. You can change this any time.",
    acceptLabel: "Accept",
    declineLabel: "Decline",
    policyUrl: "/privacy-policy",
    position: "bottom",
  },
  breadcrumb: {
    enabled: true,
    backgroundImageUrl: "",
    overlayOpacity: 45,
    showOnHome: false,
  },
  maintenance: {
    enabled: false,
    headline: "We are making things better",
    message:
      "grotutor is briefly offline for scheduled maintenance. Everything, including your progress, is safe.",
    expectedBackAt: "",
    allowAdminAccess: true,
  },
  commission: {
    defaultInstructorShare: 70,
    platformShare: 30,
    minimumPayout: 1000,
    payoutCycle: "monthly",
    holdDays: 14,
  },
  recaptcha: {
    enabled: false,
    version: "v3",
    siteKey: "",
    secretKey: "",
    onLogin: true,
    onRegister: true,
    onContact: true,
  },
  analytics: { enabled: false, measurementId: "", anonymiseIp: true },
  gtm: { enabled: false, containerId: "" },
  "gtm-data-layer": {
    enabled: false,
    trackPurchase: true,
    trackAddToCart: true,
    trackCourseView: true,
  },
  "facebook-pixel": { enabled: false, pixelId: "", trackPurchase: true },
  "social-login": {
    googleEnabled: false,
    googleClientId: "",
    googleClientSecret: "",
    facebookEnabled: false,
    facebookAppId: "",
    facebookAppSecret: "",
  },
  tawk: { enabled: false, propertyId: "", widgetId: "" },
  "theme-colour": {
    primary: "#a56d2d",
    secondary: "#3f6f9c",
    accent: "#cf9350",
    background: "#faf7ee",
    foreground: "#2b2724",
    radius: 8,
  },
  footer: {
    about:
      "grotutor is an Indian online education platform bridging the gap between aspiration and achievement.",
    copyright: "© 2026 grotutor. All rights reserved.",
    showNewsletter: true,
    showSocialLinks: true,
    showAppBadges: false,
    columnOneTitle: "Company",
    columnTwoTitle: "Legal",
    columnThreeTitle: "Support",
  },
  "google-map": {
    enabled: true,
    embedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.9!2d78.55!3d17.40",
    latitude: "17.4065",
    longitude: "78.5591",
    zoom: 14,
  },
  zoom: {
    enabled: false,
    accountId: "",
    clientId: "",
    clientSecret: "",
    defaultDuration: 60,
    autoRecord: false,
    waitingRoom: true,
  },
  jitsi: {
    enabled: true,
    domain: "meet.jit.si",
    appId: "",
    apiKey: "",
    requireLobby: true,
    startMuted: true,
  },
  "payment-gateway": {
    razorpayEnabled: true,
    razorpayKeyId: "",
    razorpayKeySecret: "",
    razorpayMode: "test",
    phonepeEnabled: false,
    phonepeMerchantId: "",
    phonepeSaltKey: "",
    phonepeSaltIndex: "1",
    manualQrEnabled: true,
    manualQrUpiId: "grotutor@okicici",
    manualQrBankName: "ICICI Bank",
    manualQrAccountNumber: "004215002199",
    manualQrIfsc: "ICIC0000042",
    manualQrInstructions:
      "Pay to the UPI id above, then upload the payment screenshot on the checkout page.",
    freeEnrolmentEnabled: true,
  },
};

/** Field metadata so each settings screen renders itself from one definition. */
export interface SettingsField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "colour" | "password";
  help?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export const SETTINGS_FIELDS: Record<SettingsGroup, SettingsField[]> = {
  general: [
    { key: "siteName", label: "Site name", type: "text" },
    { key: "tagline", label: "Tagline", type: "text" },
    { key: "supportEmail", label: "Support email", type: "text" },
    { key: "supportPhone", label: "Support phone", type: "text" },
    { key: "address", label: "Registered address", type: "textarea" },
    { key: "copyright", label: "Copyright line", type: "text" },
    { key: "timezone", label: "Timezone", type: "select", options: [
      { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
      { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
      { value: "UTC", label: "UTC" },
    ] },
    { key: "dateFormat", label: "Date format", type: "select", options: [
      { value: "d MMM yyyy", label: "14 Aug 2026" },
      { value: "dd/MM/yyyy", label: "14/08/2026" },
      { value: "MM/dd/yyyy", label: "08/14/2026" },
    ] },
    { key: "defaultCurrency", label: "Default currency", type: "select", options: [
      { value: "INR", label: "Indian Rupee (INR)" },
      { value: "USD", label: "US Dollar (USD)" },
      { value: "AED", label: "UAE Dirham (AED)" },
    ] },
    { key: "registrationOpen", label: "Allow new learner registrations", type: "boolean" },
    { key: "instructorApplicationsOpen", label: "Accept instructor applications", type: "boolean" },
    { key: "emailVerificationRequired", label: "Require email verification", type: "boolean" },
  ],
  logo: [
    { key: "logoUrl", label: "Logo", type: "text", help: "Square mark used in the sidebar and app header." },
    { key: "logoWithNameUrl", label: "Logo with wordmark", type: "text" },
    { key: "faviconUrl", label: "Favicon", type: "text" },
    { key: "appleTouchIconUrl", label: "Apple touch icon", type: "text" },
    { key: "ogImageUrl", label: "Social share image", type: "text", help: "1200×630 works everywhere." },
  ],
  seo: [
    { key: "metaTitle", label: "Meta title", type: "text" },
    { key: "metaDescription", label: "Meta description", type: "textarea", help: "Around 155 characters." },
    { key: "metaKeywords", label: "Meta keywords", type: "text" },
    { key: "canonicalUrl", label: "Canonical URL", type: "text" },
    { key: "robots", label: "Robots directive", type: "select", options: [
      { value: "index, follow", label: "index, follow" },
      { value: "noindex, follow", label: "noindex, follow" },
      { value: "noindex, nofollow", label: "noindex, nofollow" },
    ] },
    { key: "sitemapEnabled", label: "Generate sitemap.xml", type: "boolean" },
    { key: "structuredDataEnabled", label: "Emit structured data", type: "boolean" },
  ],
  email: [
    { key: "enabled", label: "Send transactional email", type: "boolean" },
    { key: "provider", label: "Provider", type: "select", options: [
      { value: "sendgrid", label: "SendGrid" },
      { value: "ses", label: "Amazon SES" },
      { value: "smtp", label: "Custom SMTP" },
    ] },
    { key: "fromName", label: "From name", type: "text" },
    { key: "fromAddress", label: "From address", type: "text" },
    { key: "apiKey", label: "API key", type: "password" },
    { key: "smtpHost", label: "SMTP host", type: "text", help: "Only used with Custom SMTP." },
    { key: "smtpPort", label: "SMTP port", type: "number" },
    { key: "smtpEncryption", label: "Encryption", type: "select", options: [
      { value: "tls", label: "TLS" },
      { value: "ssl", label: "SSL" },
      { value: "none", label: "None" },
    ] },
  ],
  sms: [
    { key: "enabled", label: "Send SMS", type: "boolean" },
    { key: "provider", label: "Provider", type: "select", options: [
      { value: "msg91", label: "MSG91" },
      { value: "twilio", label: "Twilio" },
      { value: "textlocal", label: "Textlocal" },
    ] },
    { key: "senderId", label: "Sender id", type: "text", help: "Six characters, approved by your provider." },
    { key: "apiKey", label: "API key", type: "password" },
    { key: "otpTemplateId", label: "OTP template id", type: "text" },
  ],
  cookie: [
    { key: "enabled", label: "Show the cookie banner", type: "boolean" },
    { key: "message", label: "Message", type: "textarea" },
    { key: "acceptLabel", label: "Accept button", type: "text" },
    { key: "declineLabel", label: "Decline button", type: "text" },
    { key: "policyUrl", label: "Policy link", type: "text" },
    { key: "position", label: "Position", type: "select", options: [
      { value: "bottom", label: "Bottom bar" },
      { value: "bottom-left", label: "Bottom left card" },
      { value: "centre", label: "Centre modal" },
    ] },
  ],
  breadcrumb: [
    { key: "enabled", label: "Show breadcrumbs", type: "boolean" },
    { key: "backgroundImageUrl", label: "Background image", type: "text" },
    { key: "overlayOpacity", label: "Overlay opacity (%)", type: "number" },
    { key: "showOnHome", label: "Show on the home page", type: "boolean" },
  ],
  maintenance: [
    { key: "enabled", label: "Put the site in maintenance mode", type: "boolean", help: "Learners see the message below. Admins can still sign in." },
    { key: "headline", label: "Headline", type: "text" },
    { key: "message", label: "Message", type: "textarea" },
    { key: "expectedBackAt", label: "Expected back at", type: "text", placeholder: "16 Aug 2026, 06:00 IST" },
    { key: "allowAdminAccess", label: "Allow admins through", type: "boolean" },
  ],
  commission: [
    { key: "defaultInstructorShare", label: "Instructor share (%)", type: "number" },
    { key: "platformShare", label: "Platform share (%)", type: "number" },
    { key: "minimumPayout", label: "Minimum payout (₹)", type: "number" },
    { key: "payoutCycle", label: "Payout cycle", type: "select", options: [
      { value: "weekly", label: "Weekly" },
      { value: "monthly", label: "Monthly" },
      { value: "quarterly", label: "Quarterly" },
    ] },
    { key: "holdDays", label: "Hold period (days)", type: "number", help: "Earnings become withdrawable after the refund window closes." },
  ],
  recaptcha: [
    { key: "enabled", label: "Enable reCAPTCHA", type: "boolean" },
    { key: "version", label: "Version", type: "select", options: [
      { value: "v2", label: "v2 checkbox" },
      { value: "v3", label: "v3 invisible" },
    ] },
    { key: "siteKey", label: "Site key", type: "text" },
    { key: "secretKey", label: "Secret key", type: "password" },
    { key: "onLogin", label: "Protect sign in", type: "boolean" },
    { key: "onRegister", label: "Protect registration", type: "boolean" },
    { key: "onContact", label: "Protect the contact form", type: "boolean" },
  ],
  analytics: [
    { key: "enabled", label: "Enable Google Analytics", type: "boolean" },
    { key: "measurementId", label: "Measurement id", type: "text", placeholder: "G-XXXXXXXXXX" },
    { key: "anonymiseIp", label: "Anonymise IP addresses", type: "boolean" },
  ],
  gtm: [
    { key: "enabled", label: "Enable Tag Manager", type: "boolean" },
    { key: "containerId", label: "Container id", type: "text", placeholder: "GTM-XXXXXXX" },
  ],
  "gtm-data-layer": [
    { key: "enabled", label: "Push events to the data layer", type: "boolean" },
    { key: "trackPurchase", label: "purchase", type: "boolean" },
    { key: "trackAddToCart", label: "add_to_cart", type: "boolean" },
    { key: "trackCourseView", label: "view_item", type: "boolean" },
  ],
  "facebook-pixel": [
    { key: "enabled", label: "Enable Facebook Pixel", type: "boolean" },
    { key: "pixelId", label: "Pixel id", type: "text" },
    { key: "trackPurchase", label: "Track purchases", type: "boolean" },
  ],
  "social-login": [
    { key: "googleEnabled", label: "Sign in with Google", type: "boolean" },
    { key: "googleClientId", label: "Google client id", type: "text" },
    { key: "googleClientSecret", label: "Google client secret", type: "password" },
    { key: "facebookEnabled", label: "Sign in with Facebook", type: "boolean" },
    { key: "facebookAppId", label: "Facebook app id", type: "text" },
    { key: "facebookAppSecret", label: "Facebook app secret", type: "password" },
  ],
  tawk: [
    { key: "enabled", label: "Enable Tawk live chat", type: "boolean" },
    { key: "propertyId", label: "Property id", type: "text" },
    { key: "widgetId", label: "Widget id", type: "text" },
  ],
  "theme-colour": [
    { key: "primary", label: "Primary", type: "colour" },
    { key: "secondary", label: "Secondary", type: "colour" },
    { key: "accent", label: "Accent", type: "colour" },
    { key: "background", label: "Page background", type: "colour" },
    { key: "foreground", label: "Body text", type: "colour" },
    { key: "radius", label: "Corner radius (px)", type: "number" },
  ],
  footer: [
    { key: "about", label: "About text", type: "textarea" },
    { key: "copyright", label: "Copyright line", type: "text" },
    { key: "columnOneTitle", label: "Column 1 heading", type: "text" },
    { key: "columnTwoTitle", label: "Column 2 heading", type: "text" },
    { key: "columnThreeTitle", label: "Column 3 heading", type: "text" },
    { key: "showNewsletter", label: "Show the newsletter form", type: "boolean" },
    { key: "showSocialLinks", label: "Show social links", type: "boolean" },
    { key: "showAppBadges", label: "Show app store badges", type: "boolean" },
  ],
  "google-map": [
    { key: "enabled", label: "Show the map on the contact page", type: "boolean" },
    { key: "embedUrl", label: "Embed URL", type: "textarea", help: "Google Maps → Share → Embed a map → copy the src value." },
    { key: "latitude", label: "Latitude", type: "text" },
    { key: "longitude", label: "Longitude", type: "text" },
    { key: "zoom", label: "Zoom level", type: "number" },
  ],
  zoom: [
    { key: "enabled", label: "Host live classes on Zoom", type: "boolean" },
    { key: "accountId", label: "Account id", type: "text", help: "Zoom Marketplace → your Server-to-Server OAuth app." },
    { key: "clientId", label: "Client id", type: "text" },
    { key: "clientSecret", label: "Client secret", type: "password" },
    { key: "defaultDuration", label: "Default duration (minutes)", type: "number" },
    { key: "autoRecord", label: "Record automatically to the cloud", type: "boolean" },
    { key: "waitingRoom", label: "Put arrivals in a waiting room", type: "boolean" },
  ],
  jitsi: [
    { key: "enabled", label: "Host live classes on Jitsi", type: "boolean" },
    { key: "domain", label: "Jitsi domain", type: "text", help: "meet.jit.si, or your own deployment." },
    { key: "appId", label: "App id", type: "text", help: "Only needed for JaaS (Jitsi as a Service)." },
    { key: "apiKey", label: "API key", type: "password" },
    { key: "requireLobby", label: "Hold learners in the lobby until admitted", type: "boolean" },
    { key: "startMuted", label: "Start everyone muted", type: "boolean" },
  ],
  "payment-gateway": [
    { key: "razorpayEnabled", label: "Razorpay", type: "boolean" },
    { key: "razorpayKeyId", label: "Razorpay key id", type: "text" },
    { key: "razorpayKeySecret", label: "Razorpay key secret", type: "password" },
    { key: "razorpayMode", label: "Razorpay mode", type: "select", options: [
      { value: "test", label: "Test" },
      { value: "live", label: "Live" },
    ] },
    { key: "phonepeEnabled", label: "PhonePe", type: "boolean" },
    { key: "phonepeMerchantId", label: "PhonePe merchant id", type: "text" },
    { key: "phonepeSaltKey", label: "PhonePe salt key", type: "password" },
    { key: "phonepeSaltIndex", label: "PhonePe salt index", type: "text" },
    { key: "manualQrEnabled", label: "UPI / bank transfer", type: "boolean" },
    { key: "manualQrUpiId", label: "UPI id", type: "text" },
    { key: "manualQrBankName", label: "Bank name", type: "text" },
    { key: "manualQrAccountNumber", label: "Account number", type: "text" },
    { key: "manualQrIfsc", label: "IFSC", type: "text" },
    { key: "manualQrInstructions", label: "Instructions shown at checkout", type: "textarea" },
    { key: "freeEnrolmentEnabled", label: "Allow free enrolment on ₹0 courses", type: "boolean" },
  ],
};

export const SETTINGS_META: Record<
  SettingsGroup,
  { title: string; description: string }
> = {
  general: { title: "General settings", description: "Site identity, contact details and platform-wide switches." },
  logo: { title: "Logo and favicon", description: "The marks used across the app, the browser tab and social shares." },
  seo: { title: "SEO setup", description: "Meta tags, sitemap and structured data for search engines." },
  email: { title: "Email settings", description: "Which provider sends transactional mail, and who it comes from." },
  sms: { title: "SMS settings", description: "Provider and sender id for OTP and alert messages." },
  cookie: { title: "Cookie consent", description: "The banner shown to first-time visitors." },
  breadcrumb: { title: "Breadcrumb", description: "The navigation strip below the header on inner pages." },
  maintenance: { title: "Maintenance mode", description: "Take the site offline for learners while you work on it." },
  commission: { title: "Commission setup", description: "How revenue splits between instructors and the platform." },
  recaptcha: { title: "Google reCAPTCHA", description: "Bot protection on sign in, registration and contact." },
  analytics: { title: "Google Analytics", description: "Send page and event data to a GA4 property." },
  gtm: { title: "Google Tag Manager", description: "Load a GTM container on every page." },
  "gtm-data-layer": { title: "Tag Manager data layer", description: "Which commerce events get pushed to the data layer." },
  "facebook-pixel": { title: "Facebook Pixel", description: "Conversion tracking for Meta ad campaigns." },
  "social-login": { title: "Social login", description: "Let people sign in with an existing account." },
  tawk: { title: "Tawk live chat", description: "Embed the Tawk widget for live support." },
  "theme-colour": { title: "Theme colour", description: "The palette applied across the learner-facing site." },
  footer: { title: "Manage footer", description: "Footer copy, headings and which blocks appear." },
  "google-map": { title: "Google map", description: "The embedded map on the contact page." },
  zoom: { title: "Zoom settings", description: "Credentials used to create Zoom meetings for live lessons." },
  jitsi: { title: "Jitsi settings", description: "Credentials and defaults for Jitsi live meetings." },
  "payment-gateway": { title: "Payment gateways", description: "Which methods learners can pay with, and their credentials." },
};
