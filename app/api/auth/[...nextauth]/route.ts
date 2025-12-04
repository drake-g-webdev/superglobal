import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

// Simple in-memory user store (in production, use a database)
// Users are stored in localStorage on the client, but we need server-side storage too
const users: Map<string, { id: string; email: string; password: string; name: string; profileComplete: boolean }> = new Map();

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
          if (users.has(credentials.email)) {
            throw new Error('User already exists');
          }

          // Create new user
          const hashedPassword = await bcrypt.hash(credentials.password, 10);
          const newUser = {
            id: crypto.randomUUID(),
            email: credentials.email,
            password: hashedPassword,
            name: credentials.name || '',
            profileComplete: false,
          };
          users.set(credentials.email, newUser);

          return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            profileComplete: newUser.profileComplete,
          };
        } else {
          // Login
          const user = users.get(credentials.email);
          if (!user) {
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
        token.profileComplete = (user as any).profileComplete;
      }
      // Handle profile completion update
      if (trigger === 'update' && session?.profileComplete !== undefined) {
        token.profileComplete = session.profileComplete;
        // Update the stored user
        const storedUser = users.get(token.email as string);
        if (storedUser) {
          storedUser.profileComplete = session.profileComplete;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).profileComplete = token.profileComplete;
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
