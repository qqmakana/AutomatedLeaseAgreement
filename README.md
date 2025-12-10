# Professional Lease Drafting Application

A modern, professional web application for creating residential lease agreements with automatic data extraction from uploaded documents.

## Features

- **Document Upload System** - Upload ID and FICA documents (PDF, JPG, PNG)
- **Automatic Data Extraction** - Simulates OCR/AI extraction of tenant information
- **Four-Step Workflow**:
  1. Upload documents
  2. Review and edit extracted tenant data
  3. Enter lease details (property, landlord info, financial terms)
  4. Review and download the generated lease
- **Comprehensive Lease Template** - Includes all standard legal sections
- **Professional Design** - Clean, modern interface with progress tracking
- **Download Functionality** - Export completed lease as a text file

## Getting Started

### Option 1: Traditional Setup (Without Docker)

#### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

#### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

#### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder. Deploy the `build` folder to any static hosting service (Netlify, Vercel, AWS S3, etc.).

### Option 2: Docker Setup (Recommended for Production)

#### Prerequisites
- Docker installed ([Download Docker](https://www.docker.com/get-started))

#### Quick Start

1. Build and run with Docker Compose:
```bash
docker-compose up --build
```

2. Access the application at [http://localhost:3000](http://localhost:3000)

3. Run in background:
```bash
docker-compose up -d
```

For detailed Docker instructions, see [DOCKER.md](./DOCKER.md)

#### Why Docker?
- ✅ Consistent environments across dev/staging/production
- ✅ Production-ready with nginx web server
- ✅ Easy deployment to cloud platforms
- ✅ Scalable and container-ready
- ✅ Includes health checks and security headers

## Project Structure

```
lease-drafting-app/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Step1Upload.js          # Document upload component
│   │   ├── Step1Upload.css
│   │   ├── Step2TenantData.js      # Tenant data review/edit
│   │   ├── Step2TenantData.css
│   │   ├── Step3LeaseDetails.js    # Lease details form
│   │   ├── Step3LeaseDetails.css
│   │   ├── Step4Review.js          # Review and download
│   │   └── Step4Review.css
│   ├── utils/
│   │   └── leaseGenerator.js       # Lease document generator
│   ├── App.js                       # Main application component
│   ├── App.css
│   ├── index.js                     # Entry point
│   └── index.css
├── package.json
└── README.md
```

## Production Features ✅

The application now includes a complete backend infrastructure:

### ✅ Implemented Features

1. **Backend API Server** (`/server`)
   - Express.js RESTful API
   - JWT Authentication
   - PostgreSQL database with Prisma ORM
   - File upload handling

2. **OCR Integration** ✅
   - Google Cloud Vision API support
   - AWS Textract integration
   - Azure Computer Vision support
   - Tesseract.js fallback

3. **PDF Generation** ✅
   - jsPDF integration
   - Professional PDF templates
   - Proper formatting and styling

4. **Database Storage** ✅
   - PostgreSQL database
   - User management
   - Lease records storage
   - Document storage

5. **Authentication & Multi-Tenant** ✅
   - JWT authentication
   - User registration/login
   - Multi-tenant data isolation
   - Secure file uploads

6. **Template Customization** ✅
   - Custom template creation
   - Template storage
   - Jurisdiction-specific templates

### 📋 Setup Instructions

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for complete setup guide.

**Quick Start:**
```bash
# Backend
cd server
npm install
cp env.example .env
# Configure .env with your credentials
npx prisma migrate dev
npm run dev

# Frontend (separate terminal)
npm start
```

### 🔄 Future Enhancements

- Email notifications
- Digital signatures
- Document versioning
- Multi-language support
- Legal compliance checks

## Technologies Used

- React 18
- CSS3 (with modern features)
- HTML5 File API
- Blob API for downloads

## License

This project is open source and available for use.

## Documentation

- **[Implementation Plan](./IMPLEMENTATION_PLAN.md)** - Complete feature implementation roadmap
- **[Backend API Documentation](./server/README.md)** - Backend setup and API endpoints
- **[Docker Deployment Guide](./DOCKER.md)** - Complete Docker setup and deployment instructions
- **[Quick Start Guide](./QUICKSTART.md)** - Get started quickly with Docker
- **[Lease Agreement Structure](./LEASE_STRUCTURE.md)** - Detailed breakdown of all 16 sections in the lease document

## Support

For questions or issues, please open an issue in the repository.

