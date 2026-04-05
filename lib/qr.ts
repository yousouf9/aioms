import QRCode from "qrcode";

export async function generateBookingQR(bookingCode: string): Promise<string> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/verify/${bookingCode}`;
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: "#0A0F1E", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
}
