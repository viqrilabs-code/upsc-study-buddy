import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getOrCreateUserProfile } from "@/lib/app-db";

export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

const providers = isGoogleAuthConfigured()
  ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      }),
    ]
  : [];

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      await getOrCreateUserProfile({
        id: account?.providerAccountId || user.email,
        email: user.email,
        name: user.name,
        image: user.image,
      });

      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.email) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }

      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || session.user.email || "";
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
};
