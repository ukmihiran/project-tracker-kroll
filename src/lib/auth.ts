import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export type ServerUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

/**
 * Fetches the current authenticated user from the server session.
 * Returns null when unauthenticated or when the session is missing an id.
 */
export async function getServerUser(): Promise<ServerUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as ServerUser | undefined;
  if (!user?.id) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
