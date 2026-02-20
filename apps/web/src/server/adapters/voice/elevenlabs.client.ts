import { env } from "@/env";

export interface VoiceSynthesisAdapter {
  provider: "ELEVENLABS";
  synthesize(input: {
    text: string;
    voiceId: string;
    locale: "EN" | "RW" | "LG";
  }): Promise<{ audioUrl: string }>;
}

export class ElevenLabsClient implements VoiceSynthesisAdapter {
  provider = "ELEVENLABS" as const;

  async synthesize(input: { text: string; voiceId: string; locale: "EN" | "RW" | "LG" }) {
    if (!env.ELEVENLABS_API_KEY) {
      return {
        audioUrl: `${env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/mock-audio/${input.voiceId}`,
      };
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${input.voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: input.text,
          model_id: "eleven_flash_v2_5",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs request failed: ${response.status}`);
    }

    const bytes = await response.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    return {
      audioUrl: `data:audio/mpeg;base64,${base64}`,
    };
  }
}

export const elevenLabsClient = new ElevenLabsClient();
