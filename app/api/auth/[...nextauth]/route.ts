import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/app/lib/prisma';

// NOTE: PrismaAdapter removed - it conflicts with CredentialsProvider + JWT strategy
// The adapter is designed for OAuth providers that create database sessions,
// but CredentialsProvider with JWT bypasses session creation entirely.
// User management is handled manually in the authorize() function.

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        action: { label: 'Action', type: 'text' }, // 'login' or 'signup'
        name: { label: 'Name', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const action = credentials.action || 'login';

        if (action === 'signup') {
          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (existingUser) {
            throw new Error('User already exists');
          }

          // Create new user
          const hashedPassword = await bcrypt.hash(credentials.password, 10);
          const newUser = await prisma.user.create({
            data: {
              email: credentials.email,
              password: hashedPassword,
              name: credentials.name || '',
              profileComplete: false,
            },
          });

          return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            profileComplete: newUser.profileComplete,
          };
        } else {
          // Login
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.password) {
            throw new Error('Invalid email or password');
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            throw new Error('Invalid email or password');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            profileComplete: user.profileComplete,
          };
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.profileComplete = user.profileComplete;
      }
      // Handle profile completion update
      if (trigger === 'update' && session?.profileComplete !== undefined) {
        token.profileComplete = session.profileComplete;
        // Update the stored user in database
        if (token.email) {
          await prisma.user.update({
            where: { email: token.email as string },
            data: { profileComplete: session.profileComplete },
          });
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.profileComplete = token.profileComplete;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    newUser: '/auth/signup',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
