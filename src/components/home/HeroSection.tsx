export function HeroSection() {
  return (
    <section className="relative py-5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
          Zuno Marketplace
          <span className="block text-blue-600">Metadata & Media</span>
        </h1>

        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Centralized API for managing NFT metadata and media files. Store,
          version, and serve metadata with automatic IPFS pinning. Simple, fast,
          and developer-friendly.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
            IPFS Storage
          </span>
          <span className="inline-flex items-center rounded-full bg-green-100 px-4 py-1 text-sm font-medium text-green-800">
            Batch Upload
          </span>
          <span className="inline-flex items-center rounded-full bg-purple-100 px-4 py-1 text-sm font-medium text-purple-800">
            Version Control
          </span>
          <span className="inline-flex items-center rounded-full bg-orange-100 px-4 py-1 text-sm font-medium text-orange-800">
            API Access
          </span>
          <span className="inline-flex items-center rounded-full bg-red-100 px-4 py-1 text-sm font-medium text-red-800">
            Admin Dashboard
          </span>
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-4 py-1 text-sm font-medium text-yellow-800">
            Cron-job.org
          </span>
        </div>
      </div>
    </section>
  );
}
