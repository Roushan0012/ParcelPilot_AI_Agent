import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | Blob | null;

    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided." },
        { status: 400 }
      );
    }

    const groq = new Groq({ apiKey });

    // Ensure it is treated as a File with filename for Groq's multipart endpoint
    let audioFile: File;
    if (file instanceof File) {
      audioFile = file;
    } else {
      audioFile = new File([file], "audio.webm", { type: file.type || "audio/webm" });
    }

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3-turbo",
      response_format: "json",
      language: "en",
      temperature: 0.0,
    });

    return NextResponse.json({
      text: transcription.text || "",
    });
  } catch (error: any) {
    console.error("Transcription API error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to transcribe audio.",
      },
      { status: 500 }
    );
  }
}
