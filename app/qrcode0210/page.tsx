"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ChangeEvent,
} from "react";
import QRCode from "qrcode";

const LOGO_SIZE_RATIO = 0.28;
const LOGO_PADDING = 8;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const GENERATE_DEBOUNCE_MS = 200;

function buildQROptions(size: number, fgColor: string, bgColor: string) {
  return {
    width: size,
    margin: 2,
    errorCorrectionLevel: "H" as const,
    color: { dark: fgColor, light: bgColor },
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("中心图片加载失败"));
    img.onload = () => resolve(img);
    img.src = src;
  });
}

async function drawLogoOnCanvas(
  canvas: HTMLCanvasElement,
  logoDataUrl: string,
  size: number,
  bgColor: string
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法获取 canvas 2d 上下文");

  const img = await loadImage(logoDataUrl);
  const logoSize = size * LOGO_SIZE_RATIO;
  const x = (size - logoSize) / 2;
  const y = (size - logoSize) / 2;
  const cx = size / 2;
  const cy = size / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, logoSize / 2 + LOGO_PADDING, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, x, y, logoSize, logoSize);
  ctx.restore();
}

function revokeBlobUrl(url: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function captionLines(line1: string, line2: string): string[] {
  return [line1.trim(), line2.trim()].filter(Boolean);
}

function composeWithCaption(
  qrCanvas: HTMLCanvasElement,
  qrSize: number,
  lines: string[],
  fgColor: string,
  bgColor: string
): string {
  if (lines.length === 0) return qrCanvas.toDataURL("image/png");

  const fontSize = Math.max(14, Math.round(qrSize * 0.05));
  const lineHeight = fontSize * 1.45;
  const pad = Math.round(qrSize * 0.05);
  const captionHeight = pad + lines.length * lineHeight + pad;

  const out = document.createElement("canvas");
  out.width = qrSize;
  out.height = qrSize + captionHeight;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("无法创建合成画布");

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(qrCanvas, 0, 0);

  ctx.fillStyle = fgColor;
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  let y = qrSize + pad;
  for (const line of lines) {
    ctx.fillText(line, qrSize / 2, y, qrSize - pad * 2);
    y += lineHeight;
  }

  return out.toDataURL("image/png");
}

async function renderQRCode(
  content: string,
  size: number,
  fgColor: string,
  bgColor: string,
  logo: string | null,
  line1: string,
  line2: string
): Promise<{ pngUrl: string; svgBlob: Blob }> {
  const qrOptions = buildQROptions(size, fgColor, bgColor);
  const canvas = document.createElement("canvas");
  const lines = captionLines(line1, line2);

  const pngTask = QRCode.toCanvas(canvas, content, qrOptions).then(async () => {
    if (logo) await drawLogoOnCanvas(canvas, logo, size, bgColor);
    return composeWithCaption(canvas, size, lines, fgColor, bgColor);
  });

  const svgTask = QRCode.toString(content, { ...qrOptions, type: "svg" });

  const [pngUrl, svgString] = await Promise.all([pngTask, svgTask]);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
  return { pngUrl, svgBlob };
}

export default function QRCodePage() {
  const [text, setText] = useState("");
  const [size, setSize] = useState(320);
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [logo, setLogo] = useState<string | null>(null);
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");

  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgBlobRef = useRef<string | null>(null);

  const setSvgBlob = useCallback((url: string | null) => {
    if (svgBlobRef.current) revokeBlobUrl(svgBlobRef.current);
    svgBlobRef.current = url;
    setSvgUrl(url);
  }, []);

  useEffect(() => () => revokeBlobUrl(svgBlobRef.current), []);

  // 内容或样式变化时防抖实时生成
  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setPngUrl(null);
      setSvgBlob(null);
      setError(null);
      setIsGenerating(false);
      return;
    }

    let cancelled = false;
    setIsGenerating(true);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { pngUrl: nextPng, svgBlob } = await renderQRCode(
            trimmed,
            size,
            fgColor,
            bgColor,
            logo,
            line1,
            line2
          );
          if (cancelled) return;
          setError(null);
          setPngUrl(nextPng);
          setSvgBlob(URL.createObjectURL(svgBlob));
        } catch (err) {
          if (cancelled) return;
          setError(
            err instanceof Error ? err.message : "生成二维码失败，请重试"
          );
          setPngUrl(null);
          setSvgBlob(null);
        } finally {
          if (!cancelled) setIsGenerating(false);
        }
      })();
    }, GENERATE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [text, size, fgColor, bgColor, logo, line1, line2, setSvgBlob]);

  const download = useCallback((url: string | null, name: string) => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
  }, []);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("图片不能超过 2MB");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setError(null);
        setLogo(result);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.onerror = () => setError("读取图片失败");
    reader.readAsDataURL(file);
  }, []);

  const clearLogo = useCallback(() => {
    setLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const hasContent = Boolean(text.trim());
  const svgIncompleteNote = Boolean(logo || line1.trim() || line2.trim());

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8">
          二维码生成器
        </h1>

        {error && (
          <div
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="输入网址或文本，自动实时生成"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20"
              aria-label="输入网址或文本"
            />

            <div>
              <label
                htmlFor="qr-size"
                className="text-sm text-gray-500"
              >
                尺寸 {size}px
              </label>
              <input
                id="qr-size"
                type="range"
                min={200}
                max={600}
                step={10}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full accent-black"
                aria-label="二维码尺寸"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label htmlFor="fg-color" className="text-sm text-gray-500">
                  前景色
                </label>
                <input
                  id="fg-color"
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-full h-10 cursor-pointer bg-transparent"
                  aria-label="前景色"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="bg-color" className="text-sm text-gray-500">
                  背景色
                </label>
                <input
                  id="bg-color"
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-full h-10 cursor-pointer bg-transparent"
                  aria-label="背景色"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="caption-line1" className="text-sm text-gray-500">
                二维码下方文字（第一行）
              </label>
              <input
                id="caption-line1"
                type="text"
                placeholder="例如：扫码关注"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
                aria-label="二维码下方第一行文字"
              />
              <input
                id="caption-line2"
                type="text"
                placeholder="例如：获取更多优惠"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 text-sm"
                aria-label="二维码下方第二行文字"
              />
            </div>

            <div>
              <label
                htmlFor="logo-file"
                className="text-sm text-gray-500 block mb-1"
              >
                上传中心图片（自动圆形裁剪）
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="logo-file"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="text-sm flex-1 min-w-0"
                  aria-label="上传中心图片"
                />
                {logo && (
                  <button
                    type="button"
                    onClick={clearLogo}
                    className="text-sm text-gray-600 hover:text-black underline"
                  >
                    移除
                  </button>
                )}
              </div>
              {logo && (
                <img
                  src={logo}
                  alt=""
                  className="mt-2 h-10 w-10 rounded-full object-cover border border-gray-200"
                />
              )}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 min-h-[280px]">
            {pngUrl ? (
              <>
                <div className="relative">
                  <img
                    src={pngUrl}
                    alt="生成的二维码"
                    width={size}
                    className={`rounded-xl border border-gray-300 max-w-full h-auto transition-opacity ${isGenerating ? "opacity-60" : "opacity-100"}`}
                  />
                  {isGenerating && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-600 bg-white/50 rounded-xl">
                      更新中…
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => download(pngUrl, "qrcode.png")}
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                  >
                    下载 PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => download(svgUrl, "qrcode.svg")}
                    disabled={!svgUrl}
                    title={
                      svgIncompleteNote
                        ? "SVG 仅含二维码，Logo 与下方文字请下载 PNG"
                        : undefined
                    }
                    className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition disabled:opacity-40"
                  >
                    下载 SVG
                    {svgIncompleteNote && (
                      <span className="block text-[10px] text-gray-500 font-normal">
                        仅二维码
                      </span>
                    )}
                  </button>
                </div>
              </>
            ) : hasContent && isGenerating ? (
              <div className="flex flex-col items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl w-full aspect-square max-w-[280px]">
                <span className="animate-pulse">生成中…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl w-full aspect-square max-w-[280px]">
                <span className="text-4xl mb-2 opacity-30">▦</span>
                <span>输入内容后自动预览</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
