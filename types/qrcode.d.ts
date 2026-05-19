declare module "qrcode" {
  export interface QRCodeRenderOptions {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    color?: { dark?: string; light?: string };
    type?: "image/png" | "image/jpeg" | "image/webp" | "svg";
  }

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeRenderOptions
  ): Promise<void>;

  export function toString(
    text: string,
    options?: QRCodeRenderOptions
  ): Promise<string>;

  const QRCode: {
    toCanvas: typeof toCanvas;
    toString: typeof toString;
  };

  export default QRCode;
}
