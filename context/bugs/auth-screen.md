# Feature Request: Premium Glassmorphism Sign-In and Sign-Up Pages

## Overview

The current sign-in and sign-up pages are visually plain. We need to redesign them to look like a premium, modern dark-themed SaaS application using a glassmorphism aesthetic with ambient background gradients.

## Reference Images

_(Attached to this prompt)_

1. **Visual Vibe:** A dark background with glowing, vibrant gradient blobs (purple/blue) and a transparent, frosted-glass floating card.
2. **Layout Structure:** The "Systema" text and feature list on the left, and the Clerk form on the right, both centered inside the card.

## Design Requirements

- **Background:** A deep dark background with subtle, ambient, vibrant gradients (e.g., glowing purple and blue blobs) using CSS. No pure black.
- **The Card:** A centered, glassmorphism card (transparent background, `backdrop-blur`, subtle white border) that holds the entire layout.
- **Layout:** Inside the card, use a two-column layout on desktop (hidden on mobile).
  - **Left Column:** The "Systema" logo, the tagline "Design systems together, in real time.", and a short bulleted feature list.
  - **Right Column:** The Clerk `<SignIn />` or `<SignUp />` form.

## Implementation Details

### 1. Remove Clerk's Default Card Styling

In `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx`, pass the `appearance` prop to `<SignIn>` and `<SignUp>` to strip away their default background, border, and shadow so they blend seamlessly into our custom card.

Use the following appearance configuration:

START OF appearance.ts snippet

    appearance={{
      elements: {
        rootBox: "w-full",
        card: "bg-transparent shadow-none border-none w-full",
        headerTitle: "text-text-primary",
        headerSubtitle: "text-text-muted",
      }
    }}

END OF appearance.ts snippet

### 2. Create the Layout Wrapper

- The main page should be `min-h-screen flex items-center justify-center bg-bg-base relative overflow-hidden`.
- Add the ambient gradient blobs using absolute-positioned `div`s with `blur-3xl` and low opacity (e.g., `bg-indigo-500/20`, `bg-purple-500/20`).
- Create the glassmorphism card: `relative z-10 w-full max-w-5xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8 lg:p-12 flex flex-col lg:flex-row gap-12 items-center`.

### 3. Left Column (Text)

- `hidden lg:flex flex-col flex-1 text-left`.
- Include the Systema branding and feature list with Lucide icons.

### 4. Right Column (Form)

- `flex-1 w-full max-w-md mx-auto`.
- Render the `<SignIn />` or `<SignUp />` component here.

## Checks

- Ensure all text remains readable against the dark background and vibrant blobs.
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run `npx next build --webpack`.
