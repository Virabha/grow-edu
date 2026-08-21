import type { GroupDefinition } from './settings.types';

export const GROUPS: Record<string, GroupDefinition> = {
  general: {
    meta: {
      title: 'General Settings',
      description: 'Site identity, contact information, and locale settings.',
    },
    fields: [
      { key: 'siteName', label: 'Site Name', type: 'text', required: true, placeholder: 'My Learning Platform' },
      { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Learn anything, anytime' },
      { key: 'contactEmail', label: 'Contact Email', type: 'text', placeholder: 'hello@example.com' },
      { key: 'contactPhone', label: 'Contact Phone', type: 'text', placeholder: '+91 98765 43210' },
      { key: 'address', label: 'Address', type: 'textarea', placeholder: '123 Main St, City, Country' },
      {
        key: 'timezone',
        label: 'Timezone',
        type: 'select',
        options: [
          { value: 'Asia/Kolkata', label: 'IST (UTC+5:30)' },
          { value: 'UTC', label: 'UTC' },
          { value: 'America/New_York', label: 'EST (UTC-5)' },
          { value: 'Europe/London', label: 'GMT (UTC+0)' },
          { value: 'Asia/Dubai', label: 'GST (UTC+4)' },
          { value: 'Asia/Singapore', label: 'SGT (UTC+8)' },
        ],
      },
      {
        key: 'currency',
        label: 'Currency',
        type: 'select',
        options: [
          { value: 'INR', label: 'INR — Indian Rupee' },
          { value: 'USD', label: 'USD — US Dollar' },
          { value: 'EUR', label: 'EUR — Euro' },
          { value: 'GBP', label: 'GBP — British Pound' },
          { value: 'AED', label: 'AED — UAE Dirham' },
        ],
      },
    ],
    defaults: {
      siteName: '',
      tagline: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    },
  },

  seo: {
    meta: {
      title: 'SEO Settings',
      description: 'Meta tags, Open Graph, and search engine configuration.',
    },
    fields: [
      { key: 'metaTitle', label: 'Default Meta Title', type: 'text', placeholder: 'My Platform | Learn Online' },
      { key: 'metaDescription', label: 'Default Meta Description', type: 'textarea', placeholder: 'Describe your platform in 150–160 characters' },
      { key: 'ogImage', label: 'Open Graph Image URL', type: 'text', placeholder: 'https://example.com/og.png' },
      { key: 'googleSiteVerification', label: 'Google Site Verification', type: 'text', placeholder: 'Verification token from Search Console' },
      { key: 'robots', label: 'robots.txt Content', type: 'textarea', placeholder: 'User-agent: *\nAllow: /' },
    ],
    defaults: {
      metaTitle: '',
      metaDescription: '',
      ogImage: '',
      googleSiteVerification: '',
      robots: 'User-agent: *\nAllow: /',
    },
  },

  logo: {
    meta: {
      title: 'Logo & Branding',
      description: 'Upload your site logos and favicon.',
    },
    fields: [
      { key: 'lightLogo', label: 'Light Logo URL', type: 'text', placeholder: 'https://cdn.example.com/logo-light.svg' },
      { key: 'darkLogo', label: 'Dark Logo URL', type: 'text', placeholder: 'https://cdn.example.com/logo-dark.svg' },
      { key: 'favicon', label: 'Favicon URL', type: 'text', placeholder: 'https://cdn.example.com/favicon.ico' },
      { key: 'logoAlt', label: 'Logo Alt Text', type: 'text', placeholder: 'Company name' },
      { key: 'logoWidth', label: 'Logo Width (px)', type: 'number', placeholder: '160' },
    ],
    defaults: {
      lightLogo: '',
      darkLogo: '',
      favicon: '',
      logoAlt: '',
      logoWidth: 160,
    },
  },

  maintenance: {
    meta: {
      title: 'Maintenance Mode',
      description: 'Put the site into maintenance mode to show a holding page.',
    },
    fields: [
      { key: 'enabled', label: 'Enable Maintenance Mode', type: 'boolean', help: 'When on, only platform admins can access the site. Currently inert — the app does not yet read this flag.' },
      { key: 'title', label: 'Maintenance Page Title', type: 'text', placeholder: "We'll be back soon" },
      { key: 'message', label: 'Maintenance Message', type: 'textarea', placeholder: 'We are currently performing scheduled maintenance.' },
      { key: 'expectedBack', label: 'Expected Back (date)', type: 'date' },
    ],
    defaults: {
      enabled: false,
      title: "We'll be back soon",
      message: 'We are currently performing scheduled maintenance. Please check back later.',
      expectedBack: '',
    },
  },

  analytics: {
    meta: {
      title: 'Analytics',
      description: 'Connect Google Analytics to track visitor behaviour.',
    },
    fields: [
      { key: 'enabled', label: 'Enable Analytics', type: 'boolean' },
      { key: 'ga4MeasurementId', label: 'GA4 Measurement ID', type: 'text', placeholder: 'G-XXXXXXXXXX' },
      { key: 'uaTrackingId', label: 'UA Tracking ID (legacy)', type: 'text', placeholder: 'UA-XXXXXXXXX-X' },
    ],
    defaults: {
      enabled: false,
      ga4MeasurementId: '',
      uaTrackingId: '',
    },
  },

  gtm: {
    meta: {
      title: 'Google Tag Manager',
      description: 'Deploy GTM to manage all your tracking tags from one place.',
    },
    fields: [
      { key: 'enabled', label: 'Enable GTM', type: 'boolean' },
      { key: 'containerId', label: 'Container ID', type: 'text', placeholder: 'GTM-XXXXXXX' },
    ],
    defaults: {
      enabled: false,
      containerId: '',
    },
  },

  'gtm-data-layer': {
    meta: {
      title: 'GTM Data Layer',
      description: 'Configure custom data layer pushes for Google Tag Manager.',
    },
    fields: [
      { key: 'enabled', label: 'Enable Data Layer Pushes', type: 'boolean' },
      { key: 'pageViewEvent', label: 'Page View Event Name', type: 'text', placeholder: 'page_view' },
      { key: 'purchaseEvent', label: 'Purchase Event Name', type: 'text', placeholder: 'purchase' },
      { key: 'ecommerceEnabled', label: 'Enable Ecommerce Data Layer', type: 'boolean' },
    ],
    defaults: {
      enabled: false,
      pageViewEvent: 'page_view',
      purchaseEvent: 'purchase',
      ecommerceEnabled: false,
    },
  },

  'facebook-pixel': {
    meta: {
      title: 'Facebook Pixel',
      description: 'Track conversions from Facebook advertising.',
    },
    fields: [
      { key: 'enabled', label: 'Enable Facebook Pixel', type: 'boolean' },
      { key: 'pixelId', label: 'Pixel ID', type: 'text', placeholder: '123456789012345' },
    ],
    defaults: {
      enabled: false,
      pixelId: '',
    },
  },

  'google-map': {
    meta: {
      title: 'Google Maps',
      description: 'Embed Google Maps and configure the Places API key.',
    },
    fields: [
      { key: 'enabled', label: 'Enable Google Maps', type: 'boolean' },
      { key: 'apiKey', label: 'API Key', type: 'password', help: 'Stored securely. Leave unchanged to keep current value.' },
      { key: 'embedUrl', label: 'Embed URL', type: 'text', placeholder: 'https://www.google.com/maps/embed?pb=...' },
      { key: 'defaultZoom', label: 'Default Zoom Level', type: 'number', placeholder: '14' },
    ],
    defaults: {
      enabled: false,
      apiKey: '',
      embedUrl: '',
      defaultZoom: 14,
    },
  },

  tawk: {
    meta: {
      title: 'Tawk.to Live Chat',
      description: 'Add live chat support powered by Tawk.to.',
    },
    fields: [
      { key: 'enabled', label: 'Enable Tawk.to', type: 'boolean' },
      { key: 'propertyId', label: 'Property ID', type: 'text', placeholder: '5e8a7b3b4a7c6200121dba7c' },
      { key: 'widgetId', label: 'Widget ID', type: 'text', placeholder: '1e8gkl3a5' },
    ],
    defaults: {
      enabled: false,
      propertyId: '',
      widgetId: '',
    },
  },

  email: {
    meta: {
      title: 'Email Settings',
      description: 'Configure the mail driver used to send transactional emails.',
    },
    fields: [
      {
        key: 'driver',
        label: 'Mail Driver',
        type: 'select',
        options: [
          { value: 'smtp', label: 'SMTP' },
          { value: 'sendgrid', label: 'SendGrid' },
          { value: 'mailgun', label: 'Mailgun' },
        ],
      },
      { key: 'host', label: 'SMTP Host', type: 'text', placeholder: 'smtp.example.com' },
      { key: 'port', label: 'SMTP Port', type: 'number', placeholder: '587' },
      {
        key: 'encryption',
        label: 'Encryption',
        type: 'select',
        options: [
          { value: 'tls', label: 'TLS' },
          { value: 'ssl', label: 'SSL' },
          { value: 'none', label: 'None' },
        ],
      },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'user@example.com' },
      { key: 'password', label: 'Password', type: 'password', help: 'Stored securely. Leave unchanged to keep current value.' },
      { key: 'apiKey', label: 'API Key (SendGrid / Mailgun)', type: 'password', help: 'Stored securely. Leave unchanged to keep current value.' },
      { key: 'fromName', label: 'From Name', type: 'text', placeholder: 'My Platform' },
      { key: 'fromAddress', label: 'From Address', type: 'text', placeholder: 'noreply@example.com' },
    ],
    defaults: {
      driver: 'smtp',
      host: '',
      port: 587,
      encryption: 'tls',
      username: '',
      password: '',
      apiKey: '',
      fromName: '',
      fromAddress: '',
    },
  },

  sms: {
    meta: {
      title: 'SMS Settings',
      description: 'Configure SMS notifications for OTP and alerts.',
    },
    fields: [
      {
        key: 'provider',
        label: 'SMS Provider',
        type: 'select',
        options: [
          { value: 'twilio', label: 'Twilio' },
          { value: 'msg91', label: 'MSG91' },
          { value: 'fast2sms', label: 'Fast2SMS' },
        ],
      },
      { key: 'accountSid', label: 'Account SID (Twilio)', type: 'text', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'apiKey', label: 'API Key / Auth Token', type: 'password', help: 'Stored securely. Leave unchanged to keep current value.' },
      { key: 'senderId', label: 'Sender ID', type: 'text', placeholder: 'MYAPP' },
      { key: 'enabled', label: 'Enable SMS', type: 'boolean' },
    ],
    defaults: {
      provider: 'twilio',
      accountSid: '',
      apiKey: '',
      senderId: '',
      enabled: false,
    },
  },

  'payment-gateway': {
    meta: {
      title: 'Payment Gateway',
      description: 'Connect a payment provider to accept course and batch fees.',
    },
    fields: [
      {
        key: 'provider',
        label: 'Active Provider',
        type: 'select',
        options: [
          { value: 'razorpay', label: 'Razorpay' },
          { value: 'stripe', label: 'Stripe' },
        ],
      },
      { key: 'testMode', label: 'Test Mode', type: 'boolean', help: 'Use sandbox credentials instead of production keys.' },
      { key: 'razorpayKeyId', label: 'Razorpay Key ID', type: 'text', placeholder: 'rzp_live_XXXXXXXXXX' },
      { key: 'razorpayKeySecret', label: 'Razorpay Key Secret', type: 'password', help: 'Stored securely. Leave unchanged to keep current value.' },
      { key: 'razorpayWebhookSecret', label: 'Razorpay Webhook Secret', type: 'password', help: 'Stored securely. Leave unchanged to keep current value.' },
      { key: 'stripePublishableKey', label: 'Stripe Publishable Key', type: 'text', placeholder: 'pk_live_...' },
      { key: 'stripeSecretKey', label: 'Stripe Secret Key', type: 'password', help: 'Stored securely. Leave unchanged to keep current value.' },
      { key: 'stripeWebhookSecret', label: 'Stripe Webhook Secret', type: 'password', help: 'Stored securely. Leave unchanged to keep current value.' },
    ],
    defaults: {
      provider: 'razorpay',
      testMode: true,
      razorpayKeyId: '',
      razorpayKeySecret: '',
      razorpayWebhookSecret: '',
      stripePublishableKey: '',
      stripeSecretKey: '',
      stripeWebhookSecret: '',
    },
  },

  recaptcha: {
    meta: {
      title: 'reCAPTCHA',
      description: 'Protect registration, login, and contact forms with Google reCAPTCHA.',
    },
    fields: [
      { key: 'enabled', label: 'Enable reCAPTCHA', type: 'boolean' },
      {
        key: 'version',
        label: 'reCAPTCHA Version',
        type: 'select',
        options: [
          { value: 'v2', label: 'v2 (checkbox)' },
          { value: 'v3', label: 'v3 (invisible score)' },
        ],
      },
      { key: 'siteKey', label: 'Site Key', type: 'text', placeholder: '6LeXXXXXXXXXXXXXXXXXXXX' },
      { key: 'secretKey', label: 'Secret Key', type: 'password', help: 'Stored securely. Leave unchanged to keep current value.' },
    ],
    defaults: {
      enabled: false,
      version: 'v3',
      siteKey: '',
      secretKey: '',
    },
  },

  'social-login': {
    meta: {
      title: 'Social Login',
      description: 'Let learners sign in with third-party OAuth providers.',
    },
    fields: [
      { key: 'googleEnabled', label: 'Enable Google Sign-In', type: 'boolean' },
      { key: 'googleClientId', label: 'Google Client ID', type: 'text', placeholder: 'XXXXX.apps.googleusercontent.com' },
      { key: 'googleClientSecret', label: 'Google Client Secret', type: 'password', help: 'Stored securely. Leave unchanged to keep current value.' },
      { key: 'facebookEnabled', label: 'Enable Facebook Sign-In', type: 'boolean' },
      { key: 'facebookAppId', label: 'Facebook App ID', type: 'text', placeholder: '123456789012345' },
      { key: 'facebookAppSecret', label: 'Facebook App Secret', type: 'password', help: 'Stored securely. Leave unchanged to keep current value.' },
    ],
    defaults: {
      googleEnabled: false,
      googleClientId: '',
      googleClientSecret: '',
      facebookEnabled: false,
      facebookAppId: '',
      facebookAppSecret: '',
    },
  },

  commission: {
    meta: {
      title: 'Commission Settings',
      description: 'Configure revenue sharing between the platform and instructors.',
    },
    fields: [
      { key: 'platformRate', label: 'Platform Commission (%)', type: 'number', required: true, help: 'Percentage of each sale retained by the platform (0–100).' },
      { key: 'instructorRate', label: 'Instructor Revenue Share (%)', type: 'number', required: true, help: 'Percentage paid to the instructor (0–100).' },
      { key: 'autoPayoutEnabled', label: 'Automatic Payouts', type: 'boolean', help: 'Automatically transfer instructor earnings to their linked payout account.' },
      { key: 'minimumPayout', label: 'Minimum Payout Amount', type: 'number', placeholder: '500' },
    ],
    defaults: {
      platformRate: 20,
      instructorRate: 80,
      autoPayoutEnabled: false,
      minimumPayout: 500,
    },
  },

  cookie: {
    meta: {
      title: 'Cookie Consent',
      description: 'Display a cookie consent banner to comply with GDPR and CCPA.',
    },
    fields: [
      { key: 'enabled', label: 'Show Cookie Banner', type: 'boolean' },
      { key: 'message', label: 'Banner Message', type: 'textarea', placeholder: 'We use cookies to improve your experience.' },
      { key: 'acceptText', label: 'Accept Button Text', type: 'text', placeholder: 'Accept All' },
      { key: 'declineText', label: 'Decline Button Text', type: 'text', placeholder: 'Decline' },
      { key: 'policyUrl', label: 'Cookie Policy URL', type: 'text', placeholder: '/cookie-policy' },
      { key: 'expiryDays', label: 'Consent Expiry (days)', type: 'number', placeholder: '365' },
    ],
    defaults: {
      enabled: false,
      message: 'We use cookies to improve your experience on our platform.',
      acceptText: 'Accept All',
      declineText: 'Decline',
      policyUrl: '/cookie-policy',
      expiryDays: 365,
    },
  },

  footer: {
    meta: {
      title: 'Footer Settings',
      description: 'Customise the global site footer.',
    },
    fields: [
      { key: 'copyrightText', label: 'Copyright Text', type: 'text', placeholder: '© 2024 My Platform. All rights reserved.' },
      { key: 'showNewsletter', label: 'Show Newsletter Subscribe Box', type: 'boolean' },
      { key: 'showSocialLinks', label: 'Show Social Links', type: 'boolean' },
      { key: 'footerNote', label: 'Footer Note', type: 'textarea', placeholder: 'Any additional footer text' },
    ],
    defaults: {
      copyrightText: '',
      showNewsletter: true,
      showSocialLinks: true,
      footerNote: '',
    },
  },

  breadcrumb: {
    meta: {
      title: 'Breadcrumb Settings',
      description: 'Configure the breadcrumb navigation shown on inner pages.',
    },
    fields: [
      { key: 'enabled', label: 'Show Breadcrumb', type: 'boolean' },
      { key: 'homeLabel', label: 'Home Label', type: 'text', placeholder: 'Home' },
      { key: 'separator', label: 'Separator Character', type: 'text', placeholder: '/' },
    ],
    defaults: {
      enabled: true,
      homeLabel: 'Home',
      separator: '/',
    },
  },

  'theme-colour': {
    meta: {
      title: 'Theme Colours',
      description: 'Set the colour palette used across the frontend.',
    },
    fields: [
      { key: 'primary', label: 'Primary Colour', type: 'colour' },
      { key: 'secondary', label: 'Secondary Colour', type: 'colour' },
      { key: 'accent', label: 'Accent Colour', type: 'colour' },
      { key: 'background', label: 'Background Colour', type: 'colour' },
      { key: 'text', label: 'Text Colour', type: 'colour' },
    ],
    defaults: {
      primary: '#6366f1',
      secondary: '#a855f7',
      accent: '#ec4899',
      background: '#ffffff',
      text: '#0f172a',
    },
  },
  doubts: {
    meta: {
      title: 'Doubts',
      description:
        'How long a student should wait for an answer before a doubt is flagged as overdue.',
    },
    fields: [
      {
        key: 'responseTargetHours',
        label: 'Response Target (hours)',
        type: 'number',
        placeholder: '24',
        help: 'A doubt waiting longer than this appears as overdue in the instructor inbox.',
      },
    ],
    defaults: {
      responseTargetHours: 24,
    },
  },

  liveSession: {
    meta: {
      title: 'Live Session',
      description: 'Settings for live class sessions, including the reminder lead time sent to students.',
    },
    fields: [
      {
        key: 'reminderLeadMinutes',
        label: 'Reminder Lead Time (minutes)',
        type: 'number',
        placeholder: '15',
        help: 'How many minutes before a live class starts to send the enrolled-student reminder.',
      },
    ],
    defaults: {
      reminderLeadMinutes: 15,
    },
  },

  completion: {
    meta: {
      title: 'Lesson Completion',
      description:
        'The threshold at which each lesson type counts as complete. Each type completes by its own rule.',
    },
    fields: [
      { key: 'videoWatchedPercent', label: 'Video Watched (%)', type: 'number', help: 'Percentage of a video that must be watched before it counts as complete.' },
      { key: 'audioListenedPercent', label: 'Audio Listened (%)', type: 'number', help: 'Percentage of an audio rendition that must be listened to.' },
      { key: 'documentPagesPercent', label: 'Document Pages Viewed (%)', type: 'number', help: 'Percentage of a document’s pages that must be viewed.' },
      { key: 'richBlocksPercent', label: 'Rich Lesson Blocks Seen (%)', type: 'number' },
      { key: 'liveSessionMinAttendanceSeconds', label: 'Live Session Attendance (seconds)', type: 'number', help: 'Recorded attendance duration required before a live session counts as complete.' },
    ],
    defaults: {
      videoWatchedPercent: 90,
      audioListenedPercent: 90,
      documentPagesPercent: 80,
      richBlocksPercent: 100,
      liveSessionMinAttendanceSeconds: 300,
    },
  },

  studyHabits: {
    meta: {
      title: 'Study Habits',
      description:
        'How study time is measured and what a student must do for a day to count towards their streak.',
    },
    fields: [
      { key: 'inactivityCutoffSeconds', label: 'Inactivity Cutoff (seconds)', type: 'number', help: 'A gap longer than this between activity events does not accrue study time.' },
      { key: 'defaultDailyGoalMinutes', label: 'Default Daily Goal (minutes)', type: 'number', help: 'The daily goal a student starts with. Each student may edit their own.' },
      { key: 'dailyReviewSize', label: 'Daily Review Queue Size', type: 'number' },
      { key: 'badgeStudyMinutesTotal', label: 'Badge — Total Study Minutes', type: 'number' },
      { key: 'badgeStreakDays', label: 'Badge — Streak Days', type: 'number' },
      { key: 'badgeLessonsCompleted', label: 'Badge — Lessons Completed', type: 'number' },
      { key: 'badgeReviewsCompleted', label: 'Badge — Reviews Completed', type: 'number' },
    ],
    defaults: {
      inactivityCutoffSeconds: 300,
      defaultDailyGoalMinutes: 30,
      dailyReviewSize: 20,
      badgeStudyMinutesTotal: 600,
      badgeStreakDays: 7,
      badgeLessonsCompleted: 25,
      badgeReviewsCompleted: 100,
    },
  },

  community: {
    meta: {
      title: 'Community',
      description:
        'Bounds on the batch feed and peer study groups. There is no direct messaging anywhere on the platform.',
    },
    fields: [
      { key: 'studyGroupMemberCap', label: 'Study Group Size Cap', type: 'number', help: 'The largest a peer study group may become.' },
      { key: 'studyGroupsPerBatch', label: 'Study Groups Per Batch', type: 'number' },
      { key: 'feedPostMaxLength', label: 'Feed Post Maximum Length', type: 'number' },
    ],
    defaults: {
      studyGroupMemberCap: 8,
      studyGroupsPerBatch: 20,
      feedPostMaxLength: 2000,
    },
  },

  discovery: {
    meta: {
      title: 'Catalogue & Onboarding',
      description:
        'The goals a student may choose from and how the catalogue and low-bandwidth mode behave.',
    },
    fields: [
      { key: 'goalOptions', label: 'Goal Options', type: 'textarea', help: 'One goal per line, written as key|Label. These are what a student picks from at sign-up.' },
      { key: 'cataloguePageSize', label: 'Catalogue Page Size', type: 'number' },
      { key: 'lowBandwidthImageKilobytes', label: 'Low-Bandwidth Image Threshold (KB)', type: 'number', help: 'Images larger than this are suppressed when a student turns low-bandwidth mode on.' },
      { key: 'diagnosticQuestionCount', label: 'Diagnostic Test Questions', type: 'number' },
    ],
    defaults: {
      goalOptions: 'JEE|JEE\nNEET|NEET\nUPSC|UPSC\nCAT|CAT\nFOUNDATION|School Foundation',
      cataloguePageSize: 20,
      lowBandwidthImageKilobytes: 100,
      diagnosticQuestionCount: 15,
    },
  },

  signIn: {
    meta: {
      title: 'Consumer Sign-In',
      description:
        'One-time codes for phone sign-in. Every unrated code request has a direct monetary cost.',
    },
    fields: [
      { key: 'otpLength', label: 'One-Time Code Length', type: 'number' },
      { key: 'otpTtlSeconds', label: 'One-Time Code Lifetime (seconds)', type: 'number' },
      { key: 'otpMaxAttempts', label: 'Maximum Verification Attempts', type: 'number' },
    ],
    defaults: {
      otpLength: 6,
      otpTtlSeconds: 300,
      otpMaxAttempts: 5,
    },
  },
};

export const DOUBTS_SETTINGS_GROUP = 'doubts';
export const DEFAULT_DOUBT_RESPONSE_TARGET_HOURS = 24;

export const COMPLETION_SETTINGS_GROUP = 'completion';
export const STUDY_HABITS_SETTINGS_GROUP = 'studyHabits';
export const COMMUNITY_SETTINGS_GROUP = 'community';
export const DISCOVERY_SETTINGS_GROUP = 'discovery';
export const SIGN_IN_SETTINGS_GROUP = 'signIn';

export const KNOWN_GROUPS = new Set(Object.keys(GROUPS));
