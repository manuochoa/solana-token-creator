// ping endpoint
import { NextResponse } from "next/server";

const knownHashes = {};

export async function GET(request: Request) {
  console.log("request to ping endpoint GET");
  //   console.log("request to ping endpoint GET", request);
  return NextResponse.json({ message: "pong" });
}

export async function POST(request: Request) {
  const body = await request.json();
  console.log("request to ping endpoint POST", body.event.activity[0]);
  const hash = body?.event?.activity[0]?.hash;
  if (!knownHashes[hash]) {
    knownHashes[hash] = 0;
  }

  knownHashes[hash] += 1;
  console.log("known hashes", knownHashes);
  //   console.log("request to ping endpoint POST");
  // wait 10 seconds and then return
  console.log("waiting 10 seconds");
  await new Promise((resolve) => setTimeout(resolve, 10000));
  console.log("done waiting");
  //   console.log("request to ping endpoint POST", request);
  return NextResponse.json({ message: "pong" });
}
