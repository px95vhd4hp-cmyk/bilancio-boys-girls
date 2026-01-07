# Bilancio Boys & Girls

Web app mobile-first per gestire spese di gruppo con accesso via link + PIN.

## Requisiti

- Node.js 18+
- Account Supabase
- Deploy su Vercel (consigliato)

## Setup Supabase

1. Crea un progetto Supabase.
2. Apri SQL Editor e incolla il contenuto di `supabase/schema.sql`.
3. Verifica che le tabelle siano create correttamente.
4. Usa la Service Role Key solo lato server (API Next.js).

## Variabili ambiente

Crea un file `.env.local` nella root:

```
SUPABASE_URL=https://TUO-PROGETTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TUO_SERVICE_ROLE_KEY
PROGRAM_ADMIN_CODE=1234
ADMIN_RESET_CODE=1234
```

## Avvio in locale

```
npm install
npm run dev
```

Apri `http://localhost:3000`.

## Note

- Nessun riferimento a servizi esterni: il brand e l'interfaccia sono personalizzati.
- Il reset admin azzera spese e pagamenti del gruppo (non elimina i membri).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
