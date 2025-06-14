// ping endpoint
import { NextResponse } from "next/server";

export const maxDuration = 300; // This function can run for a maximum of 5 minutes

export async function GET(request: Request) {
  // wait 15 seconds and then return
  console.log("request to ping endpoint GET");
  await new Promise((resolve) => setTimeout(resolve, 15000));

  return NextResponse.json({ message: "pong" });
}
export async function POST(request: Request) {
  // wait 120 seconds and then return
  console.log("request to ping endpoint POST");
  await new Promise((resolve) => setTimeout(resolve, 120000));

  return NextResponse.json({ message: "pong" });
}
