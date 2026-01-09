// app/requests/page.tsx
import RequestsInboxClient from "./RequestsInboxClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RequestsInboxPage() {
  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold">Join Requests</h1>
        <p className="text-sm text-gray-600 mt-1">
          All pending requests for channels where you are an admin.
        </p>

        <div className="mt-4">
          <RequestsInboxClient />
        </div>
      </div>
    </div>
  );
}
