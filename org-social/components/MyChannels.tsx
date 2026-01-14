"use client";

import { useEffect, useState } from "react";
import { Loader, Text, Card, SimpleGrid } from "@mantine/core";

type Channel = {
  id: number;
  name: string;
  visibility?: string;
};

export default function MyChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchChannels() {
      setLoading(true);
      try {
        const res = await fetch("/api/users/me/created-channels", {
          credentials: "include",
        });
        const data = await res.json();
        if (mounted) setChannels(data.channels || []);
      } catch (err) {
        console.error(err);
        if (mounted) setChannels([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchChannels();
    return () => { mounted = false; };
  }, []);

  if (loading) return <Loader size="sm" />;
  if (channels.length === 0)
    return <Text className="text-gray-500 text-center">No channels created yet.</Text>;

  return (
    <SimpleGrid cols={1} spacing="sm">
      {channels.map((c) => (
        <Card key={c.id} shadow="xs" padding="sm" withBorder>
          <Text>{c.name}</Text>
          {c.visibility && <Text size="xs" color="gray">{c.visibility}</Text>}
        </Card>
      ))}
    </SimpleGrid>
  );
}
