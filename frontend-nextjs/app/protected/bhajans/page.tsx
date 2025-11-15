
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BhajanList } from "@/components/BhajanList";
import { BhajanPlayer } from "@/components/BhajanPlayer";
import { getDeviceByUserId } from "@/db/devices";

export default async function BhajansPage() {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return redirect("/login");
  }

  const device = await getDeviceByUserId(supabase, session.user.id);

  if (!device) {
    return (
      <div className="flex-1 w-full flex flex-col gap-12 items-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Device Found</h2>
          <p>You need to have a device registered to use this feature.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <h1 className="text-3xl font-bold">Bhajan Player</h1>
      </div>
      <div className="w-full">
        <BhajanPlayer deviceId={device.device_id} authToken={session.access_token} />
      </div>
      <div className="w-full">
        <BhajanList deviceId={device.device_id} authToken={session.access_token} />
      </div>
    </div>
  );
}
