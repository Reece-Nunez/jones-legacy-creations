# Jones Legacy Creations - Wireframes

## Overview

This folder contains wireframe mockups for the Jones Legacy Creations website. Wireframes are simplified, black-and-white layouts that show the structure and organization of each page WITHOUT the final design polish.

## Purpose

These wireframes are designed to help your client:
- **Visualize** the overall layout and page structure
- **Understand** the content organization and flow
- **Review** what information appears on each page
- **Approve** the general structure before final design work

## Accessing the Wireframes

### Start the Development Server

```bash
npm run dev
```

Then navigate to: **http://localhost:3000/wireframe**

### Wireframe Navigation

The wireframe index page (`/wireframe`) provides an overview of all pages with clickable cards to navigate between them:

1. **Home Page** - Main landing page
2. **About Page** - Company story and values
3. **Real Estate Service** - Property intake form
4. **Construction Service** - Construction project form
5. **Interior Design Service** - Design showcase
6. **Partners Page** - Partner network
7. **Contact Page** - Contact form and info

## What Wireframes Show

✓ **Page Layout** - How content is arranged
✓ **Navigation Structure** - Menu items and links
✓ **Content Sections** - What information appears where
✓ **Form Fields** - All input fields and options
✓ **Buttons & CTAs** - Action buttons and calls-to-action
✓ **General Flow** - How users move through the site

## What Wireframes DON'T Show

✗ Final colors (it's in black & white/grayscale)
✗ Professional images and graphics
✗ Polished typography and fonts
✗ Smooth animations and transitions
✗ Final design aesthetics

## Presenting to Your Client

### Key Points to Communicate:

1. **This is NOT the final design** - It's a structural blueprint
2. **Focus on layout and content** - Not visual aesthetics
3. **All boxes/placeholders will be replaced** - With professional imagery and design
4. **Annotations in [brackets]** - These are just labels, won't appear in final
5. **Dashed borders and gray boxes** - Represent content areas in the wireframe only

### Questions to Ask Your Client:

- Is the content on each page what you expected?
- Is anything missing from any page?
- Do the forms capture all the information you need?
- Does the navigation make sense?
- Is the overall structure and flow logical?
- Would you like to add or remove any sections?

## Wireframe Features

### Visual Indicators

- **[LABELS IN BRACKETS]** - Annotate what each section represents
- **Dashed Borders** - Show content boundaries
- **Gray Boxes** - Represent text content or images
- **Thick Borders** - Define major page sections
- **Numbers (01, 02, 03)** - Show process steps or ordering

### Pages Included

#### 1. Home Page (`/wireframe/home`)
- Hero section with tagline
- Statistics bar (500+ projects, 15+ years, etc.)
- Three service cards (Real Estate, Construction, Interior Design)
- Call-to-action section
- Footer

#### 2. About Page (`/wireframe/about`)
- Hero/intro section
- Company story (2-column layout)
- Core values grid (4 values)
- Timeline of milestones (5 key dates)
- CTA section

#### 3. Real Estate Service (`/wireframe/real-estate`)
- Service hero with feature highlights
- **Comprehensive intake form including:**
  - Personal information (3 fields)
  - Service type & property type
  - Location preferences (4 fields)
  - Budget range
  - Property features (bedrooms, bathrooms, size, etc.)
  - Garage & parking requirements
  - Architectural style
  - Interior features (kitchen, flooring, basement, fireplace)
  - Exterior features (materials, roof, pool, deck)
  - Systems & utilities (HVAC, smart home, solar)
  - Must-have features
  - Timeline selection
  - Additional notes

#### 4. Construction Service (`/wireframe/construction`)
- Service hero with 5 feature highlights
- **Detailed project intake form including:**
  - Contact information (4 fields)
  - Project type & category
  - Property information (5 fields)
  - Project scope & description
  - Budget & timeline
  - Permits & compliance
  - Specific work areas (8 different trades)
  - Materials & quality preferences
  - Demolition requirements
  - Special features (accessibility, energy efficiency)
  - Site conditions
  - Additional services needed
  - Insurance & financing
- **Featured Projects Portfolio:**
  - Project category filters (All, Residential, Commercial, Renovation, New Build)
  - 6 clickable project cards with status badges (Completed/Ongoing)
  - Each card shows: image, title, category, location
  - Links to individual project detail pages
- **Project Detail Pages** (`/wireframe/construction/projects/[id]`)
  - Back navigation to construction page
  - Project hero with status badge and key info cards
  - Full image gallery (main image + 8 thumbnails)
  - Project overview with sections (Challenge, Approach, Result)
  - Detailed specifications sidebar
  - Project team information
  - Key features list (9 features)
  - Related projects section
  - CTA to start new project or contact

#### 5. Interior Design Service (`/wireframe/interior-design`)
- Service hero
- Benefits section (4 benefits)
- Two service types (Interior Design & Home Staging)
- 5-step process visualization
- Portfolio gallery (6 projects)
- CTA section

#### 6. Partners Page (`/wireframe/partners`)
- Partners hero
- 4 partnership benefits
- 12 partner categories
- 12 partner profiles with specializations
- Partnership inquiry CTA

#### 7. Contact Page (`/wireframe/contact`)
- Contact hero
- 4 contact info cards (phone, email, location, hours)
- Contact form (5 fields)
- Quick links to service forms

## Making Changes

If the client requests changes:

1. **Content Changes** - Easy to update text and labels
2. **Adding Sections** - Can add new content blocks
3. **Removing Sections** - Can simplify if needed
4. **Reordering** - Can rearrange section order
5. **Form Fields** - Can add/remove/modify form inputs

## Next Steps After Approval

Once the client approves the wireframes:

1. **Finalize Content** - Collect actual text, images, and data
2. **Apply Design** - Add the black & white color scheme, professional fonts, and imagery
3. **Add Animations** - Implement smooth transitions with Framer Motion
4. **Polish Details** - Refine spacing, typography, and interactions
5. **Test** - Ensure everything works on all devices

## Technical Details

- **Built with:** Next.js 16 (React)
- **Styling:** Tailwind CSS with custom wireframe classes
- **Icons:** Lucide React
- **Navigation:** Shared WireframeNav component
- **Responsive:** Mobile-friendly layout

## Notes

- All forms currently log to console (no backend yet)
- Navigation is fully functional between wireframe pages
- Mobile responsive design is built in
- Wireframes use simplified styling (no animations)

---

**Remember:** The goal is to get approval on structure and content, NOT visual design. The final website will look much more polished and professional!
