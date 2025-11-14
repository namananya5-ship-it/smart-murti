import { createServer } from "node:http";
import { WebSocketServer } from "npm:ws";
import type {
    WebSocket as WSWebSocket,
    WebSocketServer as _WebSocketServer,
} from "npm:@types/ws";
import { authenticateUser, elevenLabsApiKey } from "./utils.ts";
import {
    createFirstMessage,
    createSystemPrompt,
    getChatHistory,
    getSupabaseClient,
} from "./supabase.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { isDev } from "./utils.ts";
import { connectToOpenAI } from "./models/openai.ts";
import { connectToGemini } from "./models/gemini.ts";
import { connectToElevenLabs } from "./models/elevenlabs.ts";

const server = createServer();

const wss: _WebSocketServer = new WebSocketServer({ noServer: true });

wss.on("connection", async (ws: WSWebSocket, payload: IPayload) => {
    const { user, supabase } = payload;

    let connectionPcmFile: Deno.FsFile | null = null;
    if (isDev) {
        const filename = `debug_audio_${Date.now()}.pcm`;
        connectionPcmFile = await Deno.open(filename, {
            create: true,
            write: true,
            append: true,
        });
    }

    const chatHistory = await getChatHistory(
        supabase,
        user.user_id,
        user.personality?.key ?? null,
        false,
    );
    const firstMessage = createFirstMessage(payload);
    const systemPrompt = createSystemPrompt(chatHistory, payload);

    const provider = user.personality?.provider;

    // send user details to client
    // when DEV_MODE is true, we send the default values 100, false, false
    ws.send(
        JSON.stringify({
            type: "auth",
            volume_control: user.device?.volume ?? 20,
            is_ota: user.device?.is_ota ?? false,
            is_reset: user.device?.is_reset ?? false,
            pitch_factor: user.personality?.pitch_factor ?? 1,
        }),
    );

    switch (provider) {
        case "openai":
            await connectToOpenAI(
                ws,
                payload,
                connectionPcmFile,
                firstMessage,
                systemPrompt,
            );
            break;
        case "gemini":
            await connectToGemini(
                ws,
                payload,
                connectionPcmFile,
                firstMessage,
                systemPrompt,
            );
            break;
        case "elevenlabs":
            const agentId = user.personality?.oai_voice ?? "";
            
            if (!elevenLabsApiKey) {
                throw new Error("ELEVENLABS_API_KEY environment variable is required");
            }
            
            await connectToElevenLabs(
                ws,
                payload,
                connectionPcmFile,
                agentId,
                elevenLabsApiKey,
            );
            break;
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
});

server.on("request", async (req, res) => {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*"); // Adjust this for production
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const { pathname } = url;
    const authToken = req.headers.authorization?.replace("Bearer ", "") ?? "";
    const supabase = getSupabaseClient(authToken);

    if (pathname === "/api/bhajans" && req.method === "GET") {
        try {
            const { data: bhajans, error } = await supabase.from("bhajans").select("*");
            if (error) throw error;
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(bhajans));
        } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: error.message }));
        }
    } else if (pathname.startsWith("/api/devices/") && pathname.endsWith("/bhajan")) {
        const deviceId = pathname.split("/")[3];
        if (req.method === "GET") {
            try {
                const { data: device, error: deviceError } = await supabase
                    .from("devices")
                    .select("selected_bhajan_id")
                    .eq("device_id", deviceId)
                    .single();

                if (deviceError) throw deviceError;
                if (!device.selected_bhajan_id) {
                    res.writeHead(404, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "No bhajan selected for this device" }));
                    return;
                }

                const { data: bhajan, error: bhajanError } = await supabase
                    .from("bhajans")
                    .select("url")
                    .eq("id", device.selected_bhajan_id)
                    .single();

                if (bhajanError) throw bhajanError;

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ url: bhajan.url }));
            } catch (error) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: error.message }));
            }
        } else if (req.method === "POST") {
            let body = "";
            req.on("data", chunk => {
                body += chunk.toString();
            });
            req.on("end", async () => {
                try {
                    const { bhajan_id } = JSON.parse(body);
                    const { error } = await supabase
                        .from("devices")
                        .update({ selected_bhajan_id: bhajan_id })
                        .eq("device_id", deviceId);

                    if (error) throw error;

                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
        }
    }
    else if (pathname.startsWith("/api/devices/by-mac/") && pathname.endsWith("/bhajan") && req.method === "GET") {
        try {
            const mac = pathname.split("/")[4];
            const { data: device, error: deviceError } = await supabase
                .from("devices")
                .select("selected_bhajan_id")
                .eq("mac_address", mac)
                .single();

            if (deviceError) throw deviceError;
            if (!device || !device.selected_bhajan_id) {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "No bhajan selected for this device" }));
                return;
            }

            const { data: bhajan, error: bhajanError } = await supabase
                .from("bhajans")
                .select("url")
                .eq("id", device.selected_bhajan_id)
                .single();

            if (bhajanError) throw bhajanError;

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ url: bhajan.url }));
        } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: error.message }));
        }
    }
});

server.on("upgrade", async (req, socket, head) => {
    console.log("upgrade");
    let user: IUser;
    let supabase: SupabaseClient;
    let authToken: string;
    try {
        const { authorization: authHeader, "x-wifi-rssi": rssi } = req.headers;
        authToken = authHeader?.replace("Bearer ", "") ?? "";
        const wifiStrength = parseInt(rssi as string); // Convert to number

        // You can now use wifiStrength in your code
        console.log("WiFi RSSI:", wifiStrength); // Will log something like -50

        // Remove debug logging
        if (!authToken) {
            socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
            socket.destroy();
            return;
        }

        supabase = getSupabaseClient(authToken as string);
        user = await authenticateUser(supabase, authToken as string);
    } catch (_e: any) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, {
            user,
            supabase,
            timestamp: new Date().toISOString(),
        });
    });
});

if (isDev) { // deno run -A --env-file=.env main.ts
    const HOST = Deno.env.get("HOST") || "0.0.0.0";
    const PORT = Deno.env.get("PORT") || "8000";
    server.listen(Number(PORT), HOST, () => {
        console.log(`Audio capture server running on ws://${HOST}:${PORT}`);
    });
} else {
    server.listen(8080);
}
