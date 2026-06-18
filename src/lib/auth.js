// @ts-check
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from './db/index.js';
import { users, accounts, sessions, verificationTokens } from './db/schema.js';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify',
  },
  // JWT sessions (not database sessions): `auth()` then validates the signed
  // session cookie in-memory with NO database round-trip. Database sessions
  // make every `auth()` call hit Postgres, and on a stale serverless pooler
  // connection that query hangs — exhausting the function's 25s response
  // budget (the same failure the edge middleware documents avoiding). The
  // DrizzleAdapter still persists users/accounts on OAuth sign-in.
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      // `user` is only present on initial sign-in; persist its id on the token.
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
