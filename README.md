# 🎲 Family Game Library

A shared board game inventory and library for your extended family. Track what games each household owns to avoid buying duplicates and discover games to borrow for your next game night!

## Features

- **Shared Library**: See all games owned across your family's households
- **Household Management**: Create or join a household with invite codes
- **Game Catalog**: Add games with details like player count, play time, and categories
- **Smart Filtering**: Filter by player count, household, or search by name
- **Responsive Design**: Works great on desktop and mobile

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: Blueprint.js 5
- **Styling**: SCSS with custom design system
- **Backend**: Firebase (Authentication, Firestore)
- **Hosting**: Firebase Hosting

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd family-game-library
npm install
```

### 2. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Enable **Authentication**:
   - Go to Authentication > Sign-in method
   - Enable "Email/Password"
   - Enable "Google" (optional but recommended)
4. Enable **Firestore Database**:
   - Go to Firestore Database > Create database
   - Start in production mode (we have security rules)
   - Choose a location close to your users

### 3. Configure Environment Variables

1. In Firebase Console, go to Project Settings > Your apps
2. Click "Add app" > Web app
3. Copy the config values
4. Create `.env.local` in your project root:

```bash
cp .env.example .env.local
```

5. Fill in your Firebase config values in `.env.local`

### 4. Deploy Firebase Rules

```bash
firebase login
firebase use --add  # Select your project
firebase deploy --only firestore:rules,firestore:indexes
```

### 5. Run Locally

```bash
npm run dev
```

Visit `http://localhost:5173` to see the app.

### 6. Deploy to Firebase Hosting

```bash
npm run deploy
```

Or deploy just the hosting:

```bash
npm run build
firebase deploy --only hosting
```

## Project Structure

```
family-game-library/
├── src/
│   ├── components/      # Reusable UI components
│   ├── context/         # React context providers
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components (routes)
│   ├── services/        # Firebase and API services
│   ├── styles/          # SCSS stylesheets
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── public/              # Static assets
├── firebase.json        # Firebase configuration
├── firestore.rules      # Firestore security rules
└── vite.config.ts       # Vite configuration
```

## How It Works

### Households

- Each user belongs to one household
- Create a new household or join an existing one with an invite code
- Games are associated with households, not individual users

### Adding Games

- Search or manually enter game details
- Optionally link to BoardGameGeek for additional metadata
- Games appear in the shared family library

### Filtering & Search

- Filter by number of players (find games for your group size)
- Filter by household (see what a specific family has)
- Search by game name

## Future Enhancements

Ideas for extending the app:

- [ ] BoardGameGeek API integration for auto-filling game details
- [ ] Game borrowing/loan tracking
- [ ] Wishlists per household
- [ ] Game ratings and reviews
- [ ] Game night scheduling
- [ ] CSV/BGG import for bulk adding games

## Contributing

This is a family project, but feel free to fork and adapt for your own family!

## License

MIT - Use it however you'd like!
