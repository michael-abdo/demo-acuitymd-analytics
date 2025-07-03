import { requireAuth } from "@/lib/auth-utils";

export default async function ProtectedPage() {
  // This is a server component that uses server-side authentication
  // It will automatically redirect to sign-in if not authenticated
  const session = await requireAuth();
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Protected Server Component</h1>
      <p className="mb-4">
        This page is protected with server-side authentication checks.
      </p>
      <div className="p-4 bg-gray-100 rounded-md">
        <h2 className="text-lg font-semibold mb-2">User Information</h2>
        <p><strong>Name:</strong> {session.user?.name || "Unknown"}</p>
        <p><strong>Email:</strong> {session.user?.email || "Unknown"}</p>
        <p><strong>User ID:</strong> {session.user?.id || "Unknown"}</p>
      </div>
    </div>
  );
} 