import Replicate from "replicate";
import { NextResponse } from "next/server";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const WEBHOOK_HOST = 'http://localhost:3000';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error(
      'The REPLICATE_API_TOKEN environment variable is not set. See README.md for instructions on how to set it.'
    );
  }
  console.log(request.body);
  const { input } = await request.json();
  console.log(input)
  
  if (!input || !input.zipFileUrl || !input.tokenString || !input.captionPrefix || !input.maxTrainSteps) {
    return NextResponse.json({ detail: 'Missing zip file URL, token string, caption prefix, or max train steps in input' }, { status: 400 });
  }
  
  console.log(input);
  
  const options = {
    destination: "jarvis-labs2024/react-app-models",
    input: {
      input_images: input.zipFileUrl,
      token_string: input.tokenString,
      caption_prefix: input.captionPrefix,
      max_train_steps: input.maxTrainSteps,
      use_face_detection_instead: false
    }
  };

  try {
    const training = await replicate.trainings.create(
      "stability-ai",
      "sdxl",
      "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
      options
    );
    console.log(training);

    if (training?.error) {
      console.log(training.error);
      return NextResponse.json({ detail: training.error }, { status: 500 });
    }

    // Polling until the training status is "succeeded" or "failed"
    let trainingResult;
    while (true) {
      trainingResult = await replicate.trainings.get(training.id);
      console.log(`Training status: ${trainingResult.status}`);
      if (trainingResult.status === 'succeeded' || trainingResult.status === 'failed') {
        break;
      }
      await sleep(2000); // Wait for 2 seconds before polling again
    }

    if (trainingResult.status === 'failed') {
      console.log(trainingResult.error);
      return NextResponse.json({ detail: trainingResult.error }, { status: 500 });
    }

    return NextResponse.json(trainingResult, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ detail: 'Error starting training', error: error.message }, { status: 500 });
  }
}