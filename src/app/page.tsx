"use client";

import { useState } from "react";
import * as React from "react";
import { apiClient } from "@/lib/api-client";
// Page composes feature sections; business logic lives inside sections
import { HeroSection } from "@/components/home/HeroSection";
import { UploadSection } from "@/components/home/UploadSection";
import { UploadedItemsSection } from "@/components/home/UploadedItemsSection";

export default function HomePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [uploadedItems, setUploadedItems] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Prefetch API key on mount
  React.useEffect(() => {
    const fetchApiKey = async () => {
      try {
        await apiClient.prefetchApiKey();
        // Get the key for polling usage
        const response = await fetch("/api/public-key", {
          headers: { "x-api-version": "v1" },
        });
        const data = await response.json();
        if (data.data?.apiKey) {
          setApiKey(data.data.apiKey);
        }
      } catch (error) {
        console.error("Failed to fetch API key:", error);
      }
    };

    fetchApiKey();
  }, []);

  // Auto-refresh IPFS status every 5 seconds for unpinned items (senior pattern)
  React.useEffect(() => {
    // Early return if no items to track or no API key
    if (uploadedItems.length === 0 || !apiKey) return;

    // Identify unpinned metadata items that need polling
    const unpinnedIds = uploadedItems
      .filter((item) => item.id && item.name && !item.ipfsUrl)
      .map((item) => item.id);

    // Early return if no unpinned items
    if (unpinnedIds.length === 0) return;

    // Setup polling interval
    const refreshInterval = setInterval(async () => {
      try {
        // Fetch fresh data for unpinned items only
        const fetchPromises = unpinnedIds.map(async (id) => {
          try {
            const response = await fetch(`/api/metadata/${id}`, {
              headers: {
                "x-api-key": apiKey,
                "x-api-version": "v1",
              },
              cache: "no-store", // Force bypass Next.js cache
            });

            if (!response.ok) return null;

            const data = await response.json();
            return data.data;
          } catch (error) {
            console.error(`Auto-refresh failed for item ${id}:`, error);
            return null;
          }
        });

        const fetchedItems = await Promise.all(fetchPromises);
        const updatedMap = new Map(
          fetchedItems
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .map((item) => [item.id, item])
        );

        // Update state only if we got fresh data
        if (updatedMap.size > 0) {
          setUploadedItems((prevItems) =>
            prevItems.map((item) => updatedMap.get(item.id) || item)
          );
        }
      } catch (error) {
        console.error("Auto-refresh batch failed:", error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(refreshInterval);
  }, [uploadedItems, apiKey]); // Stable dependency - full array + apiKey


  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <HeroSection />
      <UploadSection
        onItemsAdded={(items) =>
          setUploadedItems((prev) => [...items, ...prev])
        }
      />
      <UploadedItemsSection
        items={uploadedItems}
        onClear={() => setUploadedItems([])}
      />
    </div>
  );
}
