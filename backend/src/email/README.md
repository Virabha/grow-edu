# Email Service

## Email Providers

The email service supports two providers:
- **AWS SES** (default) - Uses SMTP
- **Twilio SendGrid** - Uses API

Switch between providers using the `EMAIL_PROVIDER` environment variable.

## Environment Variables

### Common (Required for both providers)
- `EMAIL_FROM_NAME` - Display name for sender (default: "Loshi Edu")
- `EMAIL_FROM_ADDRESS` - Email address for sender (required for all providers)

### AWS SES (Required when EMAIL_PROVIDER=ses)
- `EMAIL_PROVIDER=ses` - Email provider selection (default)
- `SES_SMTP_USERNAME` - AWS SES SMTP username
- `SES_SMTP_PASSWORD` - AWS SES SMTP password

### SendGrid (Required when EMAIL_PROVIDER=sendgrid)
- `EMAIL_PROVIDER=sendgrid` - Email provider selection
- `SENDGRID_API_KEY` - SendGrid API key

## Template Structure

All templates use Handlebars partials:
- `partials/header.hbs` - Common header with branding
- `partials/footer.hbs` - Common footer with copyright

Each template only contains its unique content between the header and footer.

