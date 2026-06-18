import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
