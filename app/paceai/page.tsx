import type { Metadata } from "next";
import ChatClient from "./ChatClient";

export const metadata: Metadata = {
  title: "Myanpace Support",
  description: "Myanpace AI support chat — available in English and Burmese.",
};

export default function SupportPage() {
  return <ChatClient />;
}
