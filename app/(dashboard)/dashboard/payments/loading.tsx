export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 bg-gray-200 rounded-[6px]" />
          <div className="h-4 w-32 bg-gray-100 rounded-[6px] mt-2" />
        </div>
        <div className="h-11 w-32 bg-gray-200 rounded-[8px]" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-[12px] border border-gray-200 p-5">
            <div className="h-4 w-20 bg-gray-100 rounded-[6px]" />
            <div className="h-8 w-16 bg-gray-200 rounded-[6px] mt-3" />
          </div>
        ))}
      </div>

      {/* Table/content skeleton */}
      <div className="bg-white rounded-[12px] border border-gray-200 p-5 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 flex-1 bg-gray-100 rounded-[6px]" />
            <div className="h-4 w-24 bg-gray-100 rounded-[6px]" />
            <div className="h-4 w-20 bg-gray-100 rounded-[6px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
