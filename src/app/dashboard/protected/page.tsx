export default function ProtectedPage() {
  // Simplified protected page to avoid circular dependencies
  // In a real implementation, this would check authentication
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Protected Server Component</h1>
      <p className="mb-4">
        This page is protected with server-side authentication checks.
      </p>
      <div className="p-4 bg-gray-100 rounded-md">
        <h2 className="text-lg font-semibold mb-2">User Information</h2>
        <p><strong>Note:</strong> Authentication is disabled to avoid circular dependencies</p>
        <p><strong>Status:</strong> Template ready for implementation</p>
      </div>
    </div>
  );
} 