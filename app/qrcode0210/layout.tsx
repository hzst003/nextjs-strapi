import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "二维码生成",
  description: "生成带 Logo 与说明文字的二维码",
};

export default function QrcodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
