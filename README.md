# Jones Legacy Creations

A professional, modern website for Jones Legacy Creations - a comprehensive service provider for construction, real estate, and interior design.

## Overview

Jones Legacy Creations is an umbrella company that offers:
- **Construction Services**: Residential and commercial construction, renovations, and project management
- **Real Estate Services**: Property buying, selling, and investment consulting
- **Interior Design & Home Staging**: Professional design services and staging for property sales

## Features

### Industry-Standard Excellence
- ✅ **SEO Optimized**: Comprehensive meta tags, Open Graph integration, and semantic HTML
- ✅ **Fully Responsive**: Mobile-first design that works on all devices
- ✅ **Security Headers**: Industry-standard security headers implemented
- ✅ **Accessibility**: WCAG-compliant with proper focus states and semantic markup
- ✅ **Performance**: Optimized with Next.js 16 and Turbopack

### Design & UX
- **Professional Fonts**: Inter for body text, Playfair Display for headings
- **Black & White Theme**: Clean, modern, professional aesthetic
- **Smooth Animations**: Framer Motion for elegant page transitions and interactions
- **Toast Notifications**: User feedback with react-hot-toast
- **Icon Library**: Lucide React for consistent, beautiful icons

### Pages & Features

#### Home Page (`/`)
- Hero section with animated scroll indicator
- Stats section showcasing achievements
- Services overview with feature cards
- Call-to-action sections

#### About Page (`/about`)
- Company story and mission
- Core values presentation
- Timeline of milestones

#### Real Estate Service (`/services/real-estate`)
- Comprehensive property intake form with 50+ fields
- Location, budget, and property preferences
- Detailed feature selection (bedrooms, bathrooms, garage, etc.)
- Interior and exterior preferences
- Systems and utilities configuration

#### Construction Service (`/services/construction`)
- Detailed construction project form
- Project type, scope, and timeline
- Budget and materials preferences
- Work area specifications
- Permits and compliance tracking

#### Interior Design & Staging (`/services/interior-design`)
- Service showcase
- Design process walkthrough
- Portfolio section

#### Partners Page (`/partners`)
- Trusted partner network showcase
- Partner profiles and specializations

#### Contact Page (`/contact`)
- Contact form with validation
- Contact information display
- Quick service links

## Technical Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Fonts**: Google Fonts (Inter, Playfair Display)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies
```bash
npm install
```

2. Run the development server
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Security Features

The website implements several industry-standard security headers:
- Strict-Transport-Security
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

## Project Structure

```
jones-legacy-creations/
├── app/                          # Next.js app directory
│   ├── about/                    # About page
│   ├── contact/                  # Contact page
│   ├── partners/                 # Partners page
│   ├── services/                 # Service pages
│   │   ├── construction/         # Construction intake form
│   │   ├── interior-design/      # Interior design showcase
│   │   └── real-estate/          # Real estate intake form
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # React components
│   ├── ui/                       # UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   └── Textarea.tsx
│   ├── Footer.tsx
│   ├── Navigation.tsx
│   └── Toaster.tsx
└── public/                       # Static assets
```

## Customization

### Contact Information
Update contact details in:
- `components/Footer.tsx`
- `app/contact/page.tsx`

### Adding a Logo
Place logo in `public/` directory and update `components/Navigation.tsx`

### Form Integration
Currently forms log to console. To integrate with backend:
1. Create API routes in `app/api/`
2. Update form submission handlers
3. Add email service (SendGrid, Resend, etc.)

## Deploy on Vercel

The easiest way to deploy is using [Vercel Platform](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

Built with ❤️ for Jones Legacy Creations
