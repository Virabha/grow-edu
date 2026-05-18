# Database Seed Script

This seed script populates the database with realistic demo data for showcasing the PrimeFX Education Platform to clients.

## Features

- **Real Course Data**: 12 comprehensive courses with real titles, descriptions, and content
- **High-Quality Images**: Course thumbnails from Unsplash
- **Video Content**: YouTube embed URLs for lessons
- **Complete User Ecosystem**: 
  - Platform Admin
  - Multiple Instructors
  - Corporate Admins with Companies
  - Multiple Learners
- **Realistic Relationships**: Enrollments, progress tracking, and payment records
- **Demo-Ready**: All data is structured for an impressive client presentation

## Courses Included

1. **Complete Python Programming Masterclass** - Programming
2. **Full Stack Web Development with React & Node.js** - Web Development
3. **Data Science and Machine Learning Bootcamp** - Data Science
4. **UI/UX Design Masterclass** - Design
5. **Digital Marketing and SEO Strategy** - Business
6. **Cloud Computing with AWS** - Cloud Computing
7. **Mobile App Development with Flutter** - Mobile Development
8. **DevOps and CI/CD Pipeline** - DevOps
9. **Blockchain Development and Smart Contracts** - Blockchain
10. **Cybersecurity and Ethical Hacking** - Cybersecurity

Each course includes:
- Multiple sections
- Multiple lessons per section
- Real video URLs (YouTube embeds)
- Course descriptions
- Thumbnail images
- Pricing information

## Usage

### Prerequisites

1. Ensure your database is set up and migrations are applied:
   ```bash
   pnpm db:push
   ```

2. Make sure your `.env` file has the `DATABASE_URL` configured:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/primefx
   ```

### Running the Seed Script

```bash
pnpm db:seed
```

The script will:
1. Clear all existing data from the database
2. Create users (admin, instructors, corporate admins, learners)
3. Create companies
4. Create categories
5. Create courses with sections and lessons
6. Create enrollments
7. Create progress tracking data
8. Create payment records

### Expected Output

```
🌱 Starting database seed...
📦 Clearing existing data...
👥 Creating users...
🏢 Creating companies...
📚 Creating categories...
🎓 Creating courses...
  ✓ Created course: Complete Python Programming Masterclass
  ✓ Created course: Full Stack Web Development with React & Node.js
  ...
📝 Creating enrollments...
📊 Creating progress data...
💳 Creating payment records...
✅ Seed completed successfully!

📊 Summary:
  - Users: 12
  - Companies: 3
  - Categories: 10
  - Courses: 12
  - Enrollments: 25+
  - Payments: 25+

🔑 Test Credentials:
  Admin: admin@primefx.com / password123
  Instructor: john.doe@instructor.com / password123
  Corporate Admin: corp1@techcorp.com / password123
  Learner: learner1@example.com / password123
```

## Test Credentials

After seeding, you can use these credentials to test different user roles:

### Platform Admin
- **Email**: `admin@primefx.com`
- **Password**: `password123`
- **Access**: Full platform access

### Instructor
- **Email**: `john.doe@instructor.com`
- **Password**: `password123`
- **Access**: Can create and manage courses

### Corporate Admin
- **Email**: `corp1@techcorp.com`
- **Password**: `password123`
- **Access**: Can manage company users and enrollments

### Learner
- **Email**: `learner1@example.com`
- **Password**: `password123`
- **Access**: Can enroll in courses and track progress

## Data Structure

### Users Created
- 1 Platform Admin
- 4 Instructors
- 2 Corporate Admins (linked to companies)
- 5 Learners (some linked to companies)

### Companies Created
- TechCorp Solutions
- Global Innovations Ltd
- Digital Dynamics Inc

### Categories Created
- Programming
- Web Development
- Data Science
- Design
- Business
- Cloud Computing
- Mobile Development
- DevOps
- Blockchain
- Cybersecurity

### Enrollments
- Each learner is enrolled in 3-8 courses
- Mix of ACTIVE, COMPLETED statuses
- Some corporate enrollments

### Progress Data
- 70% of enrollments have progress tracking
- Realistic completion percentages (30-80%)
- Time spent tracking
- Lesson-level progress

### Payments
- Payment records for all enrollments
- Mix of payment gateways (Razorpay, Stripe US, Stripe UAE)
- Various payment statuses (COMPLETED, PENDING, FAILED)

## Customization

To customize the seed data:

1. Edit `backend/src/database/seed.ts`
2. Modify the `COURSE_DATA` array to add/remove courses
3. Adjust user creation in the seed function
4. Modify enrollment and progress logic as needed

## Banner and CMS seeds (Bunny Storage)

Separate scripts seed banners and CMS content (FAQs, testimonials, services, etc.):

- `pnpm seed:images` — seeds banner images (uses Unsplash URLs by default)
- `pnpm seed:cms` — seeds FAQs, Why Choose Us, testimonials, services, site settings

**Bunny Storage (optional):** If you use [Bunny](https://bunny.net) for storage, set these in `.env` to upload seed images to your Bunny Storage zone instead of using external URLs:

- `BUNNY_STORAGE_ZONE_NAME` — your storage zone name
- `BUNNY_STORAGE_API_KEY` — storage API key
- `BUNNY_CDN_HOSTNAME` — CDN hostname (e.g. `yourzone.b-cdn.net`)
- `BUNNY_STORAGE_REGION` — optional (e.g. `ny`, `la`, `sg`; omit for Falkenstein)

When configured, banner and CMS images are downloaded and uploaded to Bunny; otherwise Unsplash/original URLs are stored.

## Notes

- All passwords are hashed using bcrypt
- Course images are from Unsplash (high-quality, free images)
- Video URLs are YouTube embed links (real educational content)
- All timestamps are realistic (past dates for enrollments, etc.)
- The script is idempotent - running it multiple times will reset the database

## Troubleshooting

### Error: DATABASE_URL is not set
- Ensure your `.env` file has `DATABASE_URL` configured
- Check that the database connection string is correct

### Error: Cannot connect to database
- Verify PostgreSQL is running
- Check database credentials
- Ensure the database exists

### Error: Foreign key constraint violations
- Run `pnpm db:push` first to ensure schema is up to date
- The seed script clears all data first, so this shouldn't happen

## Production Warning

⚠️ **Do NOT run this seed script in production!** It will delete all existing data.

This script is designed for development and demo purposes only.

