// app/sitemap.ts

import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: "https://smartmurti.com",
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 1,
        },
        {
            url: "https://smartmurti.com/products",
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.9,
        },
    ];
}
