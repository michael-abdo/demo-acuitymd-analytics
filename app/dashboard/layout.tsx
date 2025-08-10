export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-layout">
      <div className="p-4">
        {children}
      </div>
    </div>
  );
} 