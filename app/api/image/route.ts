import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { increaseApiLimit, checkApiLimit } from "@/lib/api-limits";
import { checkSubscription } from "@/lib/subscription";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This is also the default, can be omitted
});

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { prompt, amount = 1, resolution = "512x512" } = body;
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (!openai.apiKey) {
      return new NextResponse("OpenAI API key not configured", { status: 500 });
    }
    if (!prompt) {
      return new NextResponse("No promp provided", { status: 400 });
    }
    if (!amount) {
      return new NextResponse("No amount provided", { status: 400 });
    }
    if (!resolution) {
      return new NextResponse("No resolution provided", { status: 400 });
    }
    const freeTrial = await checkApiLimit();
    const isPro = await checkSubscription();
    if (!freeTrial && !isPro) {
      return new NextResponse("Your Free trial has expired", { status: 403 });
    }
    const response = await openai.images.generate({
      // model: "dall-e-3",
      prompt,
      n: parseInt(amount, 10),
      size: resolution,
    });
    if (isPro) await increaseApiLimit();
    return NextResponse.json(response.data);
  } catch (error) {
    console.log("[Image_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
