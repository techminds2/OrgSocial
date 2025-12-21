"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { useEffect, useState } from "react";

export default function SwaggerPage() {
  const [spec, setSpec] = useState<any>(null);

  useEffect(() => {
    fetch("/api/swagger", { cache: "no-store" })
      .then((r) => r.json())
      .then(setSpec)
      .catch((e) => console.error("Failed to load swagger spec:", e));
  }, []);

  if (!spec) return null;

  return <SwaggerUI spec={spec} />;
}
