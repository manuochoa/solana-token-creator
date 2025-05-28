// ping endpoint
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // wait 15 seconds and then return
  console.log("request to ping endpoint GET");
  await new Promise((resolve) => setTimeout(resolve, 15000));

  return NextResponse.json({ message: "pong" });
}
export async function POST(request: Request) {
  // wait 15 seconds and then return
  console.log("request to ping endpoint GET");
  await new Promise((resolve) => setTimeout(resolve, 70000));

  return NextResponse.json({ message: "pong" });
}
