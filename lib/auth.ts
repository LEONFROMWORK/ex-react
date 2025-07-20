import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub || 'test-user-id';
        (session.user as any).tier = 'TIER1';
      }
      return session;
    },
  },
};