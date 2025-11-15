// Integration Guide for SettingsDashboard.tsx
// Add the BhajanSettings component to your existing SettingsDashboard

// 1. Import the BhajanSettings component
import { BhajanSettings } from "./BhajanSettings";
import AppSettings from "../../app/components/Settings/AppSettings";

// 2. Add deviceId and authToken to the component props
interface SettingsDashboardProps {
    selectedUser: IUser;
    allLanguages: ILanguage[];
    deviceId?: string;  // Add this
    authToken: string;  // Add this
}

// 3. Update the SettingsDashboard component to include bhajan settings
const SettingsDashboard: React.FC<SettingsDashboardProps> = ({
    selectedUser,
    allLanguages,
    deviceId,
    authToken,
}) => {
    // ... existing code ...

    return (
        <div className="overflow-hidden pb-2 w-full flex-auto flex flex-col px-1">
            {/* Existing AppSettings */}
            <AppSettings
                heading={<Heading />}
                selectedUser={selectedUser}
            />

            {/* Add Bhajan Settings section */}
            {deviceId && (
                <div className="mt-6">
                    <BhajanSettings
                        userId={selectedUser.user_id}
                        deviceId={deviceId}
                        authToken={authToken}
                    />
                </div>
            )}
        </div>
    );
};

// 4. Update the page.tsx that uses SettingsDashboard
// In your settings/page.tsx file:

export default async function Home() {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const dbUser = user ? await getUserById(supabase, user.id) : null;
    const allLanguages = await getAllLanguages(supabase);
    
    // Get user's device
    const device = dbUser ? await getUserDevice(supabase, dbUser.user_id) : null;
    const authToken = user?.access_token || "";

    return (
        <div className="pb-4 flex flex-col gap-2">
            {dbUser && (
                <SettingsDashboard
                    selectedUser={dbUser}
                    allLanguages={allLanguages}
                    deviceId={device?.device_id}
                    authToken={authToken}
                />
            )}
        </div>
    );
}

// 5. Add the getUserDevice function to your devices.ts
export const getUserDevice = async (
    supabase: SupabaseClient,
    userId: string,
) => {
    const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
};