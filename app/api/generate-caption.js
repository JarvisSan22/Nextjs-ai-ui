import Replicate from "replicate";
import { NextResponse } from "next/server";

const WEBHOOK_HOST = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NGROK_HOST;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});


export async function POST(request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error(
      'The REPLICATE_API_TOKEN environment variable is not set. See README.md for instructions on how to set it.'
    );
  }

  const { input } = await request.json();

  if (!input || !input.image || !input.prompt) {
    return NextResponse.json({ detail: 'Missing image or prompt in input' }, { status: 400 });
  }

  const options = {
    version: "yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb",
    input: {
      image: input.image,
      prompt: input.prompt,
      top_p: 1,
      max_tokens: 200,
      temperature: 0.2
    }
  };

  if (WEBHOOK_HOST) {
    options.webhook = `${WEBHOOK_HOST}/api/webhooks`;
    options.webhook_events_filter = ["start", "completed"];
  }

  try {
    // A prediction is the result you get when you run a model, including the input, output, and other details
    const prediction = await replicate.predictions.create(options);

    if (prediction?.error) {
      return NextResponse.json({ detail: prediction.error }, { status: 500 });
    }

    return NextResponse.json(prediction, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ detail: 'Error generating caption', error: error.message }, { status: 500 });
  }
}