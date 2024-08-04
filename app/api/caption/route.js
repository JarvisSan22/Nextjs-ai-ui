import Replicate from "replicate";
import { NextResponse } from "next/server";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
//const WEBHOOK_HOST = process.env.VERCEL_URL
// ? `https://${process.env.VERCEL_URL}`
// : process.env.NGROK_HOST;

//const WEBHOOK_HOST = 'http://localhost:3000';
const WEBHOOK_HOST = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_BASE_URL;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN, 
});
//console.log(replicate)

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
  console.log(input)
  const options = {
    version: "80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb", //yorickvp/llava-13b:
    input: {
      image: input.image,
      prompt: input.prompt,
      top_p: 1,
      max_tokens: 200,
      temperature: 0.2
    }
  };

 // if (WEBHOOK_HOST) {
 //   options.webhook = `${WEBHOOK_HOST}/api/webhooks`;
 //   options.webhook_events_filter = ["start", "completed"];
  //}

  try {
    const prediction = await replicate.predictions.create(options);
    console.log(prediction);

    if (prediction?.error) {
      console.log(prediction.error);
      return NextResponse.json({ detail: prediction.error }, { status: 500 });
    }

    // Polling until the prediction status is "succeeded" or "failed"
    let predictionResult;
    while (true) {
      predictionResult = await replicate.predictions.get(prediction.id);
      console.log(`Prediction status: ${predictionResult.status}`);
      if (predictionResult.status === 'succeeded' || predictionResult.status === 'failed') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds before polling again
    }

    if (predictionResult.status === 'failed') {
      console.log(predictionResult.error);
      return NextResponse.json({ detail: predictionResult.error }, { status: 500 });
    }

    return NextResponse.json(predictionResult, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ detail: 'Error generating caption', error: error.message }, { status: 500 });
  }
}